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
  console.log('=== Running Extended Valid TP Probe Tests ===\n');

  const baseContext = {
    href: 'https://preview.example.com/project/session/?user=admin#section1',
    origin: 'https://preview.example.com',
    pathname: '/project/session/',
    baseURI: 'https://preview.example.com/project/session/?user=admin#section1'
  };

  // Test Case 1: JSON 503 Outcome for Probe 7 (Valid branch, unconfigured Gemini)
  {
    const mockResponses: Record<string, Record<string, { status: number; contentType: string; body: string }>> = {
      'https://preview.example.com/api/health': {
        'GET': { status: 200, contentType: 'application/json', body: '{"status":"ok"}' }
      },
      'https://preview.example.com/project/session/api/health': {
        'GET': { status: 200, contentType: 'application/json', body: '{"status":"ok"}' }
      },
      'https://preview.example.com/api/e4-1a-4-route-does-not-exist': {
        'POST': { status: 404, contentType: 'application/json', body: '{"error":"Not Found"}' }
      },
      'https://preview.example.com/api/ai/analyze-cp': {
        'POST': { status: 400, contentType: 'application/json', body: '{"error":"CP Empty"}' }
      },
      'https://preview.example.com/api/ai/generate-tp': {
        'POST': { status: 503, contentType: 'application/json', body: '{"error":"Layanan AI belum dikonfigurasi (GEMINI_API_KEY tidak terpasang)."}' }
      }
    };

    let postBodies: Record<string, string[]> = {};

    const mockFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const urlStr = url.toString();
      const method = init?.method || 'GET';
      const cleanUrlStr = urlStr.split('?')[0].split('#')[0];

      if (method === 'POST' && init?.body) {
        if (!postBodies[cleanUrlStr]) postBodies[cleanUrlStr] = [];
        postBodies[cleanUrlStr].push(init.body.toString());
      }

      // If Probe 6 is evaluated, return 400 instead of 503
      let status = 503;
      let body = '{"error":"Layanan AI belum dikonfigurasi (GEMINI_API_KEY tidak terpasang)."}';
      if (cleanUrlStr.includes('/api/ai/generate-tp')) {
        const payload = JSON.parse(init?.body as string);
        if (payload.cpGeneral === '') {
          status = 400;
          body = '{"error":"Capaian Pembelajaran (CP) harus diisi terlebih dahulu"}';
        }
      } else {
        const resData = mockResponses[cleanUrlStr]?.[method] || { status: 404, contentType: 'text/plain', body: 'Not found' };
        status = resData.status;
        body = resData.body;
      }

      return {
        status,
        url: urlStr,
        redirected: false,
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null
        },
        text: async () => body
      } as any;
    };

    const result = await runPreviewRouteProbe({
      context: baseContext,
      fetchFn: mockFetch
    });

    assert(result.results.length === 7, 'Probed exactly 7 candidates (3 GETs, 4 POSTs)');

    // Validate Probe 6 vs Probe 7 separation of bodies
    const tpPOSTs = postBodies['https://preview.example.com/api/ai/generate-tp'] || [];
    assert(tpPOSTs.length === 2, 'Fired exactly 2 POST requests to /api/ai/generate-tp');

    const emptyBody = JSON.parse(tpPOSTs[0]);
    assert(emptyBody.cpGeneral === '', 'Probe 6 POST has empty cpGeneral');

    const validBody = JSON.parse(tpPOSTs[1]);
    assert(validBody.cpGeneral === 'Diagnostic probe CP', 'Probe 7 POST has structurally valid diagnostic CP: ' + validBody.cpGeneral);
    assert(validBody.subject === 'Diagnostic', 'Probe 7 payload specifies dummy Diagnostic subject');
    assert(validBody.grade === 'Kelas 1', 'Probe 7 payload specifies Kelas 1');
    assert(validBody.phase === 'Fase A', 'Probe 7 payload specifies Fase A');
    assert(validBody.curriculum === 'KURIKULUM_MERDEKA', 'Probe 7 payload specifies KURIKULUM_MERDEKA');
    assert(validBody.count === 1, 'Probe 7 payload requests count: 1');

    // Validate classification of Probe 7
    const p7 = result.results[6];
    assert(p7.method === 'POST', 'Probe 7 used POST method');
    assert(p7.classification === 'JSON', 'Classified json response for Probe 7 as JSON');
    assert(p7.status === 503, 'Mocked status for Probe 7 was 503 (unconfigured Gemini)');
    assert(p7.responseSnippet !== undefined && p7.responseSnippet.length <= 200, 'Probe 7 response snippet <= 200 chars');
  }

  // Test Case 2: HTML 200 Outcome for Probe 7 (Mocking GAS proxy intercept scenario)
  {
    const mockFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const htmlBody = '<!doctype html><html><body>InterceptionFallback</body></html>';
      return {
        status: 200,
        url: url.toString(),
        redirected: true,
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null
        },
        text: async () => htmlBody
      } as any;
    };

    const result = await runPreviewRouteProbe({
      context: baseContext,
      fetchFn: mockFetch
    });

    const p7 = result.results[6];
    assert(p7.classification === 'HTML', 'Classified text/html response for Probe 7 as HTML under interception scenario');
    assert(p7.status === 200, 'Probe 7 status is 200');
    assert(p7.redirected === true, 'Probe 7 redirected value is true');
  }

  console.log(`\n=== Extended Valid TP Tests Summary: ${passed} passed, ${failed} failed ===`);
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
