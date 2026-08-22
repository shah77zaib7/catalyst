import type { CatalystEvent } from "../../types/catalyst";
import { ORACLE_CACHE_TTL_MS, readOracleEnv } from "./config";
import { oracleFingerprint } from "./fingerprint";
import { normalizeOracleResponse, unavailableResponse } from "./normalize";
import { projectOracleInput } from "./project";
import type { OracleProvider } from "./provider";
import { createOpenAiCompatibleOracle } from "./providers/openai-compatible";
import { redactSecrets } from "./sanitize";
import type { OracleInput, OracleResponse } from "./types";
import { validateOracleInput } from "./validate";

type CacheEntry = { response: OracleResponse; storedAt: number };

export type OracleServiceOptions = {
  provider?: OracleProvider;
  now?: () => number;
  cache?: Map<string, CacheEntry>;
};

function logSafe(meta: Record<string, unknown>) {
  console.info("[oracle]", meta);
}

export function createOracleService(options: OracleServiceOptions = {}) {
  const provider = options.provider ?? createOpenAiCompatibleOracle();
  const now = options.now ?? Date.now;
  const cache = options.cache ?? new Map<string, CacheEntry>();
  const env = readOracleEnv();

  function fromCache(fingerprint: string): OracleResponse | null {
    const hit = cache.get(fingerprint);
    if (!hit) return null;
    if (now() - hit.storedAt > ORACLE_CACHE_TTL_MS) {
      cache.delete(fingerprint);
      return null;
    }
    return hit.response;
  }

  async function analyzeInput(input: OracleInput): Promise<OracleResponse> {
    const started = now();
    const fingerprint = oracleFingerprint(input, provider.model);
    const cached = fromCache(fingerprint);
    if (cached) {
      logSafe({
        eventId: input.event.id,
        schemaVersion: input.schemaVersion,
        provider: provider.id,
        model: provider.model,
        latencyMs: 0,
        status: cached.status,
        errorCategory: cached.errorCategory,
        cache: true,
      });
      return cached;
    }

    const result = await provider.analyze(input);
    const latencyMs = now() - started;
    if (!result.ok) {
      const limitation =
        result.kind === "missing_key"
          ? "Oracle unavailable. No AI provider is configured."
          : `Oracle provider failed (${result.kind}).`;
      const response = unavailableResponse(
        fingerprint,
        result.kind,
        redactSecrets(limitation),
        provider.id,
        provider.model,
      );
      if (result.kind === "network" || result.kind === "malformed" || result.kind === "provider_error") {
        response.status = "ERROR";
      }
      logSafe({
        eventId: input.event.id,
        schemaVersion: input.schemaVersion,
        provider: provider.id,
        model: provider.model,
        latencyMs,
        status: response.status,
        errorCategory: result.kind,
      });
      return response;
    }

    const response = normalizeOracleResponse({
      payload: result.payload,
      fingerprint,
      provider: provider.id,
      model: provider.model,
    });
    cache.set(fingerprint, { response, storedAt: now() });
    logSafe({
      eventId: input.event.id,
      schemaVersion: input.schemaVersion,
      provider: provider.id,
      model: provider.model,
      latencyMs,
      status: response.status,
      errorCategory: response.errorCategory,
    });
    return response;
  }

  return {
    project: projectOracleInput,
    async analyzeEvent(event: CatalystEvent): Promise<OracleResponse> {
      const projected = projectOracleInput(event);
      const validated = validateOracleInput(projected);
      if (!validated.ok) {
        return unavailableResponse(
          "",
          "invalid_input",
          validated.issues.map((row) => row.message).join("; "),
        );
      }
      return analyzeInput(validated.input);
    },
    async analyzeRaw(value: unknown): Promise<OracleResponse> {
      const validated = validateOracleInput(value);
      if (!validated.ok) {
        return unavailableResponse(
          "",
          "invalid_input",
          validated.issues.map((row) => row.message).join("; "),
        );
      }
      return analyzeInput(validated.input);
    },
    envConfigured: Boolean(env.apiKey),
  };
}

const defaultService = createOracleService();

export function analyzeCatalystEvent(event: CatalystEvent): Promise<OracleResponse> {
  return defaultService.analyzeEvent(event);
}

export function analyzeOracleInput(value: unknown): Promise<OracleResponse> {
  return defaultService.analyzeRaw(value);
}
