export interface ProbeResult {
  requestPath: string;
  resolvedUrl: string;
  finalResponseUrl?: string;
  status?: number;
  contentType?: string;
  classification: 'JSON' | 'HTML' | 'OTHER' | 'NETWORK_ERROR';
  responseSnippet?: string;
  error?: string;
}

export interface ProbeContext {
  href: string;
  origin: string;
  pathname: string;
  baseURI: string;
}

export async function runPreviewRouteProbe(options?: {
  context?: Partial<ProbeContext>;
  fetchFn?: typeof fetch;
}): Promise<{ context: ProbeContext; results: ProbeResult[] }> {
  // Capture browser context safely
  const href = options?.context?.href ?? (typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000/');
  const origin = options?.context?.origin ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const pathname = options?.context?.pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const baseURI = options?.context?.baseURI ?? (typeof document !== 'undefined' ? document.baseURI : href);

  const context: ProbeContext = { href, origin, pathname, baseURI };
  const fetchToUse = options?.fetchFn ?? (typeof fetch !== 'undefined' ? fetch : undefined);

  const candidates = [
    '/api/health',
    'api/health',
    './api/health'
  ];

  const probeCandidate = async (candidate: string): Promise<ProbeResult> => {
    let resolvedUrl = '';
    try {
      resolvedUrl = new URL(candidate, baseURI).toString();
    } catch (e: any) {
      return {
        requestPath: candidate,
        resolvedUrl: resolvedUrl || candidate,
        classification: 'NETWORK_ERROR',
        error: `URL resolution failed: ${e.message}`
      };
    }

    if (!fetchToUse) {
      return {
        requestPath: candidate,
        resolvedUrl,
        classification: 'NETWORK_ERROR',
        error: 'Fetch implementation is not available'
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout limit

    try {
      const response = await fetchToUse(resolvedUrl, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });

      const contentType = response.headers.get('content-type') || '';
      const responseText = await response.text();
      const textSnippet = responseText.substring(0, 200).trim();

      let classification: 'JSON' | 'HTML' | 'OTHER' = 'OTHER';
      if (contentType.toLowerCase().includes('application/json')) {
        classification = 'JSON';
      } else if (
        contentType.toLowerCase().includes('text/html') ||
        textSnippet.toLowerCase().includes('<!doctype') ||
        textSnippet.toLowerCase().includes('<html')
      ) {
        classification = 'HTML';
      }

      return {
        requestPath: candidate,
        resolvedUrl,
        finalResponseUrl: response.url || resolvedUrl,
        status: response.status,
        contentType,
        classification,
        responseSnippet: textSnippet
      };
    } catch (err: any) {
      return {
        requestPath: candidate,
        resolvedUrl,
        classification: 'NETWORK_ERROR',
        error: err.name === 'AbortError' ? 'Request timed out' : err.message || String(err)
      };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const results = await Promise.all(candidates.map(probeCandidate));
  return { context, results };
}

export function formatPreviewRouteProbeReport(data: { context: ProbeContext; results: ProbeResult[] }): string {
  const { context, results } = data;
  let report = '\n=== GAS Preview Route Probe ===\n';
  report += `location.href: ${context.href}\n`;
  report += `location.origin: ${context.origin}\n`;
  report += `location.pathname: ${context.pathname}\n`;
  report += `document.baseURI: ${context.baseURI}\n\n`;

  results.forEach((r, idx) => {
    report += `Probe ${idx + 1}:\n`;
    report += `  requestPath: ${r.requestPath}\n`;
    report += `  resolvedUrl: ${r.resolvedUrl}\n`;
    report += `  finalResponseUrl: ${r.finalResponseUrl ?? 'N/A'}\n`;
    report += `  status: ${r.status !== undefined ? r.status : 'N/A'}\n`;
    report += `  contentType: ${r.contentType ?? 'N/A'}\n`;
    report += `  classification: ${r.classification}\n`;
    if (r.responseSnippet) {
      report += `  responseSnippet: ${r.responseSnippet}\n`;
    }
    if (r.error) {
      report += `  error: ${r.error}\n`;
    }
    report += '\n';
  });

  return report;
}
