import { runPreviewRouteProbe, formatPreviewRouteProbeReport } from '../src/services/previewRouteProbe';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== Running Preview Route Probe Tests ===\n');

  const baseContext = {
    href: 'https://preview.example.com/project/session/',
    origin: 'https://preview.example.com',
    pathname: '/project/session/',
    baseURI: 'https://preview.example.com/project/session/'
  };

  // Test Case A, B, C, D: Absolute path, relative path, ./ path, and JSON response classification
  {
    const mockResponses: Record<string, { status: number; contentType: string; body: string }> = {
      'https://preview.example.com/api/health': {
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: '{"status":"ok","timestamp":"2026-09-26T00:00:00.000Z"}'
      },
      'https://preview.example.com/project/session/api/health': {
        status: 200,
        contentType: 'application/json',
        body: '{"status":"ok","relative":true}'
      }
    };

    const mockFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const urlStr = url.toString();
      const resData = mockResponses[urlStr] || { status: 404, contentType: 'text/plain', body: 'Not found' };
      return {
        status: resData.status,
        url: urlStr,
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? resData.contentType : null
        },
        text: async () => resData.body
      } as any;
    };

    const result = await runPreviewRouteProbe({
      context: baseContext,
      fetchFn: mockFetch
    });

    assert(result.results.length === 3, 'Probed exactly 3 candidate paths');

    // Candidate 1: /api/health (Absolute path)
    const p1 = result.results[0];
    assert(p1.requestPath === '/api/health', 'Candidate 1 request path is /api/health');
    assert(p1.resolvedUrl === 'https://preview.example.com/api/health', 'Resolved absolute path to domain root: ' + p1.resolvedUrl);
    assert(p1.classification === 'JSON', 'Classified application/json response as JSON');
    assert(p1.status === 200, 'Candidate 1 status is 200');

    // Candidate 2: api/health (Relative path)
    const p2 = result.results[1];
    assert(p2.requestPath === 'api/health', 'Candidate 2 request path is api/health');
    assert(p2.resolvedUrl === 'https://preview.example.com/project/session/api/health', 'Resolved relative path to nested path: ' + p2.resolvedUrl);
    assert(p2.classification === 'JSON', 'Classified nested JSON response as JSON');

    // Candidate 3: ./api/health (./ relative path)
    const p3 = result.results[2];
    assert(p3.requestPath === './api/health', 'Candidate 3 request path is ./api/health');
    assert(p3.resolvedUrl === 'https://preview.example.com/project/session/api/health', 'Resolved ./ path correctly: ' + p3.resolvedUrl);
  }

  // Test Case E: HTTP 200 text/html with <!doctype html> classified HTML and bounded responseSnippet
  {
    const mockFetch = async (url: string | URL | Request): Promise<Response> => {
      const largeHtml = '<!DOCTYPE html><html><head><title>Test</title></head><body>' + 'A'.repeat(1000) + '</body></html>';
      return {
        status: 200,
        url: url.toString(),
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null
        },
        text: async () => largeHtml
      } as any;
    };

    const result = await runPreviewRouteProbe({
      context: baseContext,
      fetchFn: mockFetch
    });

    result.results.forEach(p => {
      assert(p.classification === 'HTML', 'Classified text/html response as HTML');
      assert(p.responseSnippet !== undefined && p.responseSnippet.length <= 200, 'Snippet size is bounded below 200 chars');
      assert(p.responseSnippet.toLowerCase().startsWith('<!doctype'), 'Snippet captured correct start content');
    });
  }

  // Test Case F: Network failure classified NETWORK_ERROR and does not abort remaining probes
  {
    const mockFetch = async (url: string | URL | Request): Promise<Response> => {
      const urlStr = url.toString();
      if (urlStr === 'https://preview.example.com/api/health') {
        throw new Error('Connection refused');
      }
      return {
        status: 200,
        url: urlStr,
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null
        },
        text: async () => '{"status":"ok"}'
      } as any;
    };

    const result = await runPreviewRouteProbe({
      context: baseContext,
      fetchFn: mockFetch
    });

    assert(result.results.length === 3, 'All 3 probes were run despite a network error in one');
    assert(result.results[0].classification === 'NETWORK_ERROR', 'Probe 1 classified as NETWORK_ERROR');
    assert(result.results[0].error === 'Connection refused', 'Captured connection refused error message');
    assert(result.results[1].classification === 'JSON', 'Remaining Probe 2 successfully finished as JSON');
    assert(result.results[2].classification === 'JSON', 'Remaining Probe 3 successfully finished as JSON');
  }

  // Test Case G: Formatter verified
  {
    const resultsData = {
      context: baseContext,
      results: [
        {
          requestPath: '/api/health',
          resolvedUrl: 'https://preview.example.com/api/health',
          finalResponseUrl: 'https://preview.example.com/api/health',
          status: 200,
          contentType: 'application/json',
          classification: 'JSON' as const,
          responseSnippet: '{"status":"ok"}'
        }
      ]
    };

    const report = formatPreviewRouteProbeReport(resultsData);
    assert(report.includes('=== GAS Preview Route Probe ==='), 'Formatter includes banner');
    assert(report.includes('location.href: https://preview.example.com/project/session/'), 'Formatter includes href context');
    assert(report.includes('location.origin: https://preview.example.com'), 'Formatter includes origin context');
    assert(report.includes('location.pathname: /project/session/'), 'Formatter includes pathname context');
    assert(report.includes('document.baseURI: https://preview.example.com/project/session/'), 'Formatter includes baseURI context');
    assert(report.includes('requestPath: /api/health'), 'Formatter includes request path');
    assert(report.includes('resolvedUrl: https://preview.example.com/api/health'), 'Formatter includes resolved URL');
    assert(report.includes('status: 200'), 'Formatter includes status');
    assert(report.includes('contentType: application/json'), 'Formatter includes content type');
    assert(report.includes('classification: JSON'), 'Formatter includes classification');
  }

  console.log(`\n=== Probe Tests Summary: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
