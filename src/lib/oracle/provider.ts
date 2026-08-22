import type { OracleInput } from "./types";

export type OracleProviderFailureKind =
  | "missing_key"
  | "invalid_key"
  | "rate_limit"
  | "provider_error"
  | "network"
  | "malformed";

export type OracleProviderResult =
  | { ok: true; payload: unknown }
  | { ok: false; kind: OracleProviderFailureKind; message: string };

export type OracleProvider = {
  id: string;
  model: string;
  analyze(input: OracleInput): Promise<OracleProviderResult>;
};
