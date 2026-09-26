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
  console.log('=== Running Extended Preview Route Probe Tests ===\n');

  const baseContextWithQuery = {
    href: 'https://preview.example.com/project/session/?user=admin#section1',
    origin: 'https://preview.example.com',
    pathname: '/project/session/',
    baseURI: 'https://preview.example.com/project/session/?user=admin#section1'
  };

  // Test Case 1-6 & 9-11: Validate GET & POST, query/hash stripping, method display, classification, redirection
  {
    const mockResponses: Record<string, Record<string, { status: number; contentType: string; body: string; redirected?: boolean }>> = {
      'https://preview.example.com/api/health': {
        'GET': {
          status: 200,
          contentType: 'application/json; charset=utf-8',
          body: '{"status":"ok"}'
        }
      },
      'https://preview.example.com/project/session/api/health': {
        'GET': {
          status: 200,
          contentType: 'application/json',
          body: '{"status":"ok","relative":true}'
        }
      },
      'https://preview.example.com/api/e4-1a-4-route-does-not-exist': {
        'POST': {
          status: 404,
          contentType: 'application/json',
          body: '{"error":"Unknown API route"}'
        }
      },
      'https://preview.example.com/api/ai/analyze-cp': {
        'POST': {
          status: 400,
          contentType: 'application/json',
          body: '{"error":"Data CP tidak boleh kosong"}'
        }
      },
      'https://preview.example.com/api/ai/generate-tp': {
        'POST': {
          status: 400,
          contentType: 'application/json',
          body: '{"error":"Capaian Pembelajaran (CP) harus diisi terlebih dahulu"}'
        }
      }
    };

    let postBodiesCaptured: Record<string, string> = {};

    const mockFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const urlStr = url.toString();
      const method = init?.method || 'GET';
      if (method === 'POST' && init?.body) {
        postBodiesCaptured[urlStr] = init.body.toString();
      }

      const cleanUrlStr = urlStr.split('?')[0].split('#')[0];
      const resData = mockResponses[cleanUrlStr]?.[method] || {
        status: 404,
        contentType: 'text/plain',
        body: 'Not found'
      };

      return {
        status: resData.status,
        url: urlStr,
        redirected: resData.redirected || false,
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? resData.contentType : null
        },
        text: async () => resData.body
      } as any;
    };

    const result = await runPreviewRouteProbe({
      context: baseContextWithQuery,
      fetchFn: mockFetch
    });

    // Check we ran exactly 6 candidate probes
    assert(result.results.length === 6, 'Probed exactly 6 candidates (3 GETs and 3 POSTs)');

    // Context query and hash stripping check
    assert(result.context.href === 'https://preview.example.com/project/session/', 'Stripped query and fragment from location.href');
    assert(result.context.baseURI === 'https://preview.example.com/project/session/', 'Stripped query and fragment from document.baseURI');

    // Probe 1: GET /api/health
    const r1 = result.results[0];
    assert(r1.method === 'GET', 'Probe 1 is GET');
    assert(r1.resolvedUrl === 'https://preview.example.com/api/health', 'Probe 1 resolved correct root URL');
    assert(r1.classification === 'JSON', 'GET /api/health classified as JSON');

    // Probe 4: POST /api/e4-1a-4-route-does-not-exist
    const r4 = result.results[3];
    assert(r4.method === 'POST', 'Probe 4 is POST');
    assert(r4.resolvedUrl === 'https://preview.example.com/api/e4-1a-4-route-does-not-exist', 'Probe 4 resolved correctly');
    assert(r4.classification === 'JSON' && r4.status === 404, 'Generic POST 404 classified as JSON');
    assert(postBodiesCaptured['https://preview.example.com/api/e4-1a-4-route-does-not-exist'] === '{}', 'Generic POST sent correct `{}` body');

    // Probe 5: POST /api/ai/analyze-cp
    const r5 = result.results[4];
    assert(r5.method === 'POST', 'Probe 5 is POST');
    assert(r5.classification === 'JSON' && r5.status === 400, 'analyze-cp POST 400 classified as JSON');
    assert(postBodiesCaptured['https://preview.example.com/api/ai/analyze-cp'] === '{}', 'analyze-cp POST sent `{}` body');

    // Probe 6: POST /api/ai/generate-tp
    const r6 = result.results[5];
    assert(r6.method === 'POST', 'Probe 6 is POST');
    assert(r6.classification === 'JSON' && r6.status === 400, 'generate-tp POST 400 classified as JSON');
    const expectedTpBody = JSON.stringify({ cpGeneral: '', cpElements: [], cpAnalysisItems: [] });
    assert(postBodiesCaptured['https://preview.example.com/api/ai/generate-tp'] === expectedTpBody, 'generate-tp POST sent CP-empty payload');

    // Formatter checks
    const report = formatPreviewRouteProbeReport(result);
    assert(report.includes('method: GET'), 'Report formats method: GET');
    assert(report.includes('method: POST'), 'Report formats method: POST');
    assert(!report.includes('?user=admin'), 'Report completely strips search queries');
    assert(!report.includes('#section1'), 'Report completely strips fragments');
  }

  // Test Case 7: HTML 200 POST is classified HTML and captured in snippets safely
  {
    const mockFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const largeHtml = '<!doctype html><html><body>ErrorFallback' + 'A'.repeat(500) + '</body></html>';
      return {
        status: 200,
        url: url.toString(),
        redirected: true,
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null
        },
        text: async () => largeHtml
      } as any;
    };

    const result = await runPreviewRouteProbe({
      context: baseContextWithQuery,
      fetchFn: mockFetch
    });

    result.results.forEach(r => {
      assert(r.classification === 'HTML', `Probe classification is HTML for method ${r.method}`);
      assert(r.responseSnippet !== undefined && r.responseSnippet.length <= 200, 'Snippet size bounded <= 200 chars');
      assert(r.redirected === true, 'Redirected status is recorded correctly');
    });
  }

  // Test Case 8: Network failure in one POST does not abort remaining probes
  {
    const mockFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/ai/analyze-cp')) {
        throw new Error('Connection timeout');
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
      context: baseContextWithQuery,
      fetchFn: mockFetch
    });

    assert(result.results.length === 6, 'All 6 probes were executed despite network failure in one probe');
    const failedProbe = result.results.find(r => r.requestPath === '/api/ai/analyze-cp');
    assert(failedProbe?.classification === 'NETWORK_ERROR', 'analyze-cp classified as NETWORK_ERROR');
    assert(failedProbe?.error === 'Connection timeout', 'Captured correct network error description');
    
    const otherProbe = result.results.find(r => r.requestPath === '/api/ai/generate-tp');
    assert(otherProbe?.classification === 'JSON', 'Other post probe successfully parsed as JSON');
  }

  console.log(`\n=== Extended Probe Tests Summary: ${passed} passed, ${failed} failed ===`);
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
