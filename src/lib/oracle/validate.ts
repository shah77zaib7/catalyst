import {
  CONTEXT_RELATIONSHIPS,
  CONTEXT_STATUSES,
  IMPORTANCE_TIERS,
  INTELLIGENCE_SYMBOLS,
  INTELLIGENCE_TYPES,
  MARKET_REACTION_STATUSES,
} from "../../types/catalyst";
import { ORACLE_SCHEMA_VERSION } from "./config";
import type { OracleInput, OracleValidationIssue, OracleValidationResult } from "./types";

function issue(path: string, message: string): OracleValidationIssue {
  return { path, message };
}

function isIsoOrNull(value: unknown): value is string | null {
  if (value == null) return true;
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

export function validateOracleInput(value: unknown): OracleValidationResult {
  const issues: OracleValidationIssue[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, issues: [issue("", "OracleInput must be an object")] };
  }
  const input = value as Record<string, unknown>;
  if (input.schemaVersion !== ORACLE_SCHEMA_VERSION) {
    issues.push(issue("schemaVersion", "schemaVersion must be 1.0"));
  }
  const event = input.event;
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    issues.push(issue("event", "event is required"));
    return { ok: false, issues };
  }
  const ev = event as Record<string, unknown>;
  if (typeof ev.id !== "string" || ev.id.trim() === "") {
    issues.push(issue("event.id", "event id is required"));
  }
  if (typeof ev.title !== "string") {
    issues.push(issue("event.title", "event title is required"));
  }
  if (!isIsoOrNull(ev.publishedAt)) {
    issues.push(issue("event.publishedAt", "publishedAt must be an ISO timestamp or null"));
  }
  if (ev.classification != null) {
    if (!Array.isArray(ev.classification)) {
      issues.push(issue("event.classification", "classification must be an array"));
    } else {
      for (const [i, type] of ev.classification.entries()) {
        if (!(INTELLIGENCE_TYPES as readonly string[]).includes(String(type))) {
          issues.push(issue(`event.classification.${i}`, "invalid classification"));
        }
      }
    }
  }
  if (ev.importance != null && !(IMPORTANCE_TIERS as readonly string[]).includes(String(ev.importance))) {
    issues.push(issue("event.importance", "invalid importance"));
  }
  if (Array.isArray(ev.assets)) {
    for (const [i, row] of ev.assets.entries()) {
      if (!row || typeof row !== "object") continue;
      const symbol = (row as { symbol?: unknown }).symbol;
      if (symbol != null && !(INTELLIGENCE_SYMBOLS as readonly string[]).includes(String(symbol))) {
        issues.push(issue(`event.assets.${i}.symbol`, "invalid asset"));
      }
    }
  }

  if (input.intelligence != null && typeof input.intelligence === "object") {
    const intel = input.intelligence as { classification?: { types?: unknown } };
    const types = intel.classification?.types;
    if (types != null && Array.isArray(types)) {
      for (const [i, type] of types.entries()) {
        if (!(INTELLIGENCE_TYPES as readonly string[]).includes(String(type))) {
          issues.push(issue(`intelligence.classification.types.${i}`, "invalid intelligence type"));
        }
      }
    }
  } else if (input.intelligence != null) {
    issues.push(issue("intelligence", "intelligence must be an object or null"));
  }

  if (input.marketReaction != null && typeof input.marketReaction === "object") {
    const status = (input.marketReaction as { status?: unknown }).status;
    if (status != null && !(MARKET_REACTION_STATUSES as readonly string[]).includes(String(status))) {
      issues.push(issue("marketReaction.status", "invalid marketReaction status"));
    }
  } else if (input.marketReaction != null) {
    issues.push(issue("marketReaction", "marketReaction must be an object or null"));
  }

  if (input.context != null && typeof input.context === "object") {
    const ctx = input.context as { status?: unknown; relatedEvents?: unknown };
    if (ctx.status != null && !(CONTEXT_STATUSES as readonly string[]).includes(String(ctx.status))) {
      issues.push(issue("context.status", "invalid context status"));
    }
    if (Array.isArray(ctx.relatedEvents)) {
      for (const [i, row] of ctx.relatedEvents.entries()) {
        const tags = (row as { relationship?: unknown }).relationship;
        if (!Array.isArray(tags)) continue;
        for (const tag of tags) {
          if (!(CONTEXT_RELATIONSHIPS as readonly string[]).includes(String(tag))) {
            issues.push(issue(`context.relatedEvents.${i}.relationship`, "invalid relationship"));
          }
        }
      }
    }
  } else if (input.context != null) {
    issues.push(issue("context", "context must be an object or null"));
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, input: input as unknown as OracleInput };
}
