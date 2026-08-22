import { ORACLE_SCHEMA_VERSION } from "./config";
import { redactSecrets } from "./sanitize";
import type { OracleResponse, OracleStatus } from "./types";

const DISALLOWED =
  /\b(will (rise|fall|dump|rally|moon)|buy (gold|btc|eth|sol)|sell (gold|btc|eth|sol)|guarantees?\b|this caused\b|caused gold\b|price target)\b/i;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is string => typeof row === "string" && row.trim() !== "")
    .map((row) => redactSecrets(row.trim()));
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = redactSecrets(value.trim());
  return trimmed === "" ? null : trimmed;
}

function stripDisallowed(lines: string[]): { kept: string[]; withheld: boolean } {
  const kept: string[] = [];
  let withheld = false;
  for (const line of lines) {
    if (DISALLOWED.test(line)) withheld = true;
    else kept.push(line);
  }
  return { kept, withheld };
}

export function extractJsonPayload(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    const parsed: unknown = JSON.parse(candidate);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      const parsed: unknown = JSON.parse(candidate.slice(start, end + 1));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
}

export function normalizeOracleResponse(options: {
  payload: unknown;
  fingerprint: string;
  provider: string;
  model: string;
  fallbackStatus?: OracleStatus;
}): OracleResponse {
  const parsed = extractJsonPayload(options.payload);
  if (!parsed) {
    return {
      schemaVersion: ORACLE_SCHEMA_VERSION,
      status: "ERROR",
      summary: null,
      facts: [],
      marketObservation: null,
      context: [],
      interpretation: [],
      uncertainties: [],
      limitations: ["Model response was malformed and was not used."],
      fingerprint: options.fingerprint,
      provider: options.provider,
      model: options.model,
      errorCategory: "malformed",
    };
  }

  const facts = stripDisallowed(asStringArray(parsed.facts));
  const interpretation = stripDisallowed(asStringArray(parsed.interpretation));
  const context = stripDisallowed(asStringArray(parsed.context));
  const uncertainties = stripDisallowed(asStringArray(parsed.uncertainties));
  const limitations = stripDisallowed(asStringArray(parsed.limitations));
  let summary = asNullableString(parsed.summary);
  let marketObservation = asNullableString(parsed.marketObservation);
  if (summary && DISALLOWED.test(summary)) {
    summary = null;
    limitations.withheld = true;
  }
  if (marketObservation && DISALLOWED.test(marketObservation)) {
    marketObservation = null;
    limitations.withheld = true;
  }

  const withheld =
    facts.withheld ||
    interpretation.withheld ||
    context.withheld ||
    uncertainties.withheld ||
    limitations.withheld;
  const limitationLines = limitations.kept;
  if (withheld) {
    limitationLines.push("Disallowed prediction or causality language was withheld.");
  }

  const hasContent =
    summary != null ||
    facts.kept.length > 0 ||
    marketObservation != null ||
    interpretation.kept.length > 0;
  const requested = parsed.status === "PARTIAL" ? "PARTIAL" : "SUCCESS";
  const status: OracleStatus = hasContent ? requested : "ERROR";

  return {
    schemaVersion: ORACLE_SCHEMA_VERSION,
    status: hasContent ? status : "ERROR",
    summary,
    facts: facts.kept,
    marketObservation,
    context: context.kept,
    interpretation: interpretation.kept,
    uncertainties: uncertainties.kept,
    limitations: limitationLines,
    fingerprint: options.fingerprint,
    provider: options.provider,
    model: options.model,
    errorCategory: hasContent ? null : "malformed",
  };
}

export function unavailableResponse(
  fingerprint: string,
  errorCategory: string,
  limitation: string,
  provider: string | null = null,
  model: string | null = null,
): OracleResponse {
  return {
    schemaVersion: ORACLE_SCHEMA_VERSION,
    status:
      errorCategory === "malformed" ||
      errorCategory === "provider_error" ||
      errorCategory === "invalid_input" ||
      errorCategory === "network"
        ? "ERROR"
        : "UNAVAILABLE",
    summary: null,
    facts: [],
    marketObservation: null,
    context: [],
    interpretation: [],
    uncertainties: [],
    limitations: [limitation],
    fingerprint,
    provider,
    model,
    errorCategory,
  };
}
