const REQUEST_TIMEOUT_MS = 5_000;

export function redactSecrets(value: string, secrets: string[]): string {
  return secrets.reduce((text, secret) => {
    if (!secret) return text;
    return text.split(secret).join("[redacted]");
  }, value);
}

export async function fetchJson(input: URL, init: RequestInit, fetchImpl: typeof fetch): Promise<{
  status: number;
  payload: unknown;
}> {
  const response = await fetchImpl(input, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  try {
    return { status: response.status, payload: await response.json() };
  } catch {
    return { status: response.status, payload: null };
  }
}

export function classifyHttp(status: number): "invalid_key" | "rate_limit" | "provider_error" {
  if (status === 401 || status === 403) return "invalid_key";
  if (status === 429) return "rate_limit";
  return "provider_error";
}
