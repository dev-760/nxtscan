/**
 * All API requests go through the Next.js rewrite proxy at /api/*.
 * This avoids CORS entirely — the browser sees same-origin requests.
 *
 * The rewrite in next.config.ts maps:
 *   /api/scans/free → https://backend-url/scans/free
 */
const API_BASE_URL = '/api';

type HttpMethod = 'GET' | 'POST';

export async function request<T>(
  path: string,
  options: RequestInit & { method?: HttpMethod; authToken?: string } = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const { authToken, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  };
  
  if (fetchOptions.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(url, {
    method: fetchOptions.method ?? 'GET',
    headers,
    ...fetchOptions,
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

export function triggerProScan(domain: string, domainId: string, accessToken: string) {
  return request<unknown>(
    `/scans/pro?domain=${encodeURIComponent(domain)}&domain_id=${encodeURIComponent(domainId)}`,
    { method: 'POST', authToken: accessToken },
  );
}
