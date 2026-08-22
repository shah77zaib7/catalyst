const SECRET_KEY =
  /api[_-]?key|authorization|secret|token|password|credential|bearer|cookie|private[_-]?key|access[_-]?key/i;
const SECRET_VALUE =
  /\b(sk-|xai-|td_|cg-|sosovalue-|Bearer\s+)[A-Za-z0-9_\-]{8,}\b/gi;

export function redactSecrets(text: string): string {
  return text.replace(SECRET_VALUE, "[redacted]");
}

export function looksLikeSecretKey(key: string): boolean {
  return SECRET_KEY.test(key);
}

export function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") return redactSecrets(value);
  if (typeof value === "number" || typeof value === "boolean" || value == null) return value;
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (looksLikeSecretKey(key)) continue;
      out[key] = sanitizeValue(nested);
    }
    return out;
  }
  return null;
}
