/**
 * All API requests go through the Next.js rewrite proxy at /api/*.
 * This avoids CORS entirely — the browser sees same-origin requests.
 *
 * The rewrite in next.config.ts maps:
 *   /api/scans/free → https://backend-url/scans/free
 */
const API_BASE_URL = '/api';

type HttpMethod = 'GET' | 'POST';

async function request<T>(
  path: string,
  options: RequestInit & { method?: HttpMethod } = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body && typeof body.detail === 'string') {
        message = body.detail;
      } else if (body && typeof body.message === 'string') {
        message = body.message;
      }
    } catch {
      // ignore JSON parse errors and fall back to generic message
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export interface FreeScanStartResponse {
  task_id: string;
}

export interface ScanCheck {
  check_name: string;
  status: 'pass' | 'warning' | 'fail' | string;
  detail: string;
}

export interface ScanPollResult {
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: {
    domain: string;
    ai_remediation: string;
    scan_data?: ScanCheck[];
  };
  error?: string;
}

export interface StripeCheckoutSessionResponse {
  url?: string;
}

export function startFreeScan(domain: string) {
  return request<FreeScanStartResponse>(`/scans/free?domain=${encodeURIComponent(domain)}`, {
    method: 'POST',
  });
}

export function pollScan(taskId: string) {
  return request<ScanPollResult>(`/scans/task/${taskId}`);
}

export function getScanPdfUrl(taskId: string) {
  return `${API_BASE_URL}/scans/pdf/${taskId}`;
}

export function createStripeCheckoutSession(payload: {
  user_id: string;
  email: string;
}) {
  return request<StripeCheckoutSessionResponse>(
    '/stripe/create-checkout-session',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function triggerProScan(domain: string, domainId: string) {
  return request<unknown>(
    `/scans/pro?domain=${encodeURIComponent(domain)}&domain_id=${encodeURIComponent(domainId)}`,
    { method: 'POST' },
  );
}
