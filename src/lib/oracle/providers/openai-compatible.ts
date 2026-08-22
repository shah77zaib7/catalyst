import { ORACLE_TIMEOUT_MS, readOracleEnv } from "../config";
import { ORACLE_SYSTEM_PROMPT } from "../prompt";
import type { OracleProvider, OracleProviderFailureKind, OracleProviderResult } from "../provider";
import { redactSecrets } from "../sanitize";
import type { OracleInput } from "../types";

export type OpenAiCompatibleEnv = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
};

function classifyHttp(status: number): OracleProviderFailureKind {
  if (status === 401 || status === 403) return "invalid_key";
  if (status === 429) return "rate_limit";
  return "provider_error";
}

export function createOpenAiCompatibleOracle(env: OpenAiCompatibleEnv = {}): OracleProvider {
  const configured = readOracleEnv();
  const apiKey = env.apiKey ?? configured.apiKey;
  const baseUrl = env.baseUrl ?? configured.baseUrl;
  const model = env.model ?? configured.model;
  const fetchImpl = env.fetchImpl ?? fetch;

  return {
    id: "openai-compatible",
    model,
    async analyze(input: OracleInput): Promise<OracleProviderResult> {
      if (!apiKey) {
        return { ok: false, kind: "missing_key", message: "ORACLE_API_KEY is not set" };
      }

      try {
        const response = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: ORACLE_SYSTEM_PROMPT },
              { role: "user", content: JSON.stringify(input) },
            ],
          }),
          signal: AbortSignal.timeout(ORACLE_TIMEOUT_MS),
        });

        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          return {
            ok: false,
            kind: response.ok ? "malformed" : classifyHttp(response.status),
            message: response.ok ? "Provider returned a non-JSON body" : `HTTP ${response.status}`,
          };
        }

        if (!response.ok) {
          const message =
            payload && typeof payload === "object" && "error" in payload
              ? redactSecrets(JSON.stringify((payload as { error?: unknown }).error ?? ""))
              : `HTTP ${response.status}`;
          return { ok: false, kind: classifyHttp(response.status), message };
        }

        const content =
          payload &&
          typeof payload === "object" &&
          "choices" in payload &&
          Array.isArray((payload as { choices?: unknown }).choices)
            ? (payload as { choices: Array<{ message?: { content?: unknown } }> }).choices[0]?.message
                ?.content
            : null;

        if (typeof content !== "string" || content.trim() === "") {
          return { ok: false, kind: "malformed", message: "Provider returned an empty completion" };
        }

        return { ok: true, payload: content };
      } catch {
        return { ok: false, kind: "network", message: "Network failure talking to Oracle provider" };
      }
    },
  };
}
