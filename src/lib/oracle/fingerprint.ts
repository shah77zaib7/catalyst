import { createHash } from "node:crypto";
import type { OracleInput } from "./types";

export function stableStringify(value: unknown): string {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`).join(",")}}`;
}

export function oracleFingerprint(input: OracleInput, model: string): string {
  return createHash("sha256")
    .update(`${input.schemaVersion}|${model}|${stableStringify(input)}`)
    .digest("hex");
}
