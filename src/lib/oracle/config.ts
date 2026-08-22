export const ORACLE_SCHEMA_VERSION = "1.0" as const;
export const ORACLE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const ORACLE_TIMEOUT_MS = 20_000;
export const DEFAULT_ORACLE_BASE_URL = "https://api.x.ai/v1";
export const DEFAULT_ORACLE_MODEL = "grok-3";

export function readOracleEnv(env: NodeJS.ProcessEnv = process.env) {
  return {
    apiKey: env.ORACLE_API_KEY?.trim() || env.XAI_API_KEY?.trim() || "",
    baseUrl: (env.ORACLE_BASE_URL?.trim() || DEFAULT_ORACLE_BASE_URL).replace(/\/$/, ""),
    model: env.ORACLE_MODEL?.trim() || DEFAULT_ORACLE_MODEL,
  };
}
