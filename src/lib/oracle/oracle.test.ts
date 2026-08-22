import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { CatalystEvent } from "../../types/catalyst";
import { analyzeEvent } from "../intelligence/engine";
import { oracleFingerprint } from "./fingerprint";
import { normalizeOracleResponse } from "./normalize";
import { projectOracleInput } from "./project";
import type { OracleProvider } from "./provider";
import { sanitizeValue } from "./sanitize";
import { createOracleService } from "./service";
import { validateOracleInput } from "./validate";

const NOW = Date.parse("2026-08-19T18:00:00.000Z");

function evt(partial: Partial<CatalystEvent> = {}): CatalystEvent {
  const base: CatalystEvent = {
    id: "evt_cpi",
    title: "US CPI rises more than expected",
    summary: "Annual CPI printed above consensus.",
    source: "BLS",
    sourceUrl: "https://example.com/cpi",
    sourceUrls: ["https://example.com/cpi"],
    publishedAt: "2026-08-19T12:30:00.000Z",
    fetchedAt: "2026-08-19T12:31:00.000Z",
    assets: ["gold", "usd"],
    categories: ["macro"],
    impact: null,
    sourceStatus: "live",
    providers: ["fred"],
    ...partial,
  };
  return { ...base, intelligence: partial.intelligence === null ? null : analyzeEvent(base, NOW) };
}

const SUCCESS_PAYLOAD = {
  schemaVersion: "1.0",
  status: "SUCCESS",
  summary: "CPI printed above consensus. This is an explanation of supplied facts.",
  facts: ["FACT: CPI was released at 2026-08-19T12:30:00.000Z."],
  marketObservation: "OBSERVATION: XAUUSD moved -0.71% over the 15-minute observed window.",
  context: ["FOMC also occurred 2 minutes after."],
  interpretation: ["INTERPRETATION: Timing is consistent with the event being potentially relevant to Gold."],
  uncertainties: ["UNCERTAINTY: Other high-impact events occurred in the same window."],
  limitations: ["Observation is not proof of cause."],
};

function providerWith(payload: unknown): OracleProvider {
  return {
    id: "mock",
    model: "mock-1",
    analyze: async () => ({ ok: true, payload }),
  };
}

test("valid OracleInput projects from CatalystEvent with schemaVersion 1.0", () => {
  const input = projectOracleInput(evt());
  const validated = validateOracleInput(input);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  assert.equal(validated.input.schemaVersion, "1.0");
  assert.equal(validated.input.event.id, "evt_cpi");
  assert.ok(validated.input.intelligence);
});

test("missing event ID is rejected", () => {
  const input = projectOracleInput(evt({ id: "" }));
  const validated = validateOracleInput(input);
  assert.equal(validated.ok, false);
});

test("invalid timestamp is rejected", () => {
  const input = projectOracleInput(evt());
  input.event.publishedAt = "not-a-date";
  const validated = validateOracleInput(input);
  assert.equal(validated.ok, false);
});

test("missing intelligence, marketReaction, and context remain null", () => {
  const input = projectOracleInput(evt({ intelligence: null, marketReaction: null, context: null }));
  assert.equal(input.intelligence, null);
  assert.equal(input.marketReaction, null);
  assert.equal(input.context, null);
  assert.equal(input.event.importance, null);
  assert.equal(input.event.assets[0]?.relevance, null);
  const validated = validateOracleInput(input);
  assert.equal(validated.ok, true);
});

test("partial input with intelligence but no reaction/context is valid", () => {
  const input = projectOracleInput(evt({ marketReaction: null, context: null }));
  assert.ok(input.intelligence);
  assert.equal(input.marketReaction, null);
  assert.equal(input.context, null);
  assert.equal(validateOracleInput(input).ok, true);
});

test("sanitization strips API keys and secret fields", () => {
  const dirty = sanitizeValue({
    title: "CPI",
    ORACLE_API_KEY: "sk-secret-abcdef123456",
    authorization: "Bearer xai-secret-abcdef",
    note: "token sk-secret-abcdef123456 leaked",
  }) as Record<string, unknown>;
  assert.equal(dirty.ORACLE_API_KEY, undefined);
  assert.equal(dirty.authorization, undefined);
  assert.equal(dirty.note, "token [redacted] leaked");
});

test("API key isolation across project/analyze/response", async () => {
  const secret = "sk-oracle-secret-do-not-leak";
  const event = evt();
  (event as unknown as { apiKey: string }).apiKey = secret;
  const service = createOracleService({
    provider: {
      id: "mock",
      model: "mock-1",
      analyze: async (input) => {
        assert.doesNotMatch(JSON.stringify(input), /sk-oracle-secret/);
        return { ok: true, payload: SUCCESS_PAYLOAD };
      },
    },
  });
  const response = await service.analyzeEvent(event);
  assert.doesNotMatch(JSON.stringify(response), /sk-oracle-secret/);
});

test("Oracle unavailable when provider reports missing key", async () => {
  const service = createOracleService({
    provider: {
      id: "mock",
      model: "mock-1",
      analyze: async () => ({ ok: false, kind: "missing_key", message: "ORACLE_API_KEY is not set" }),
    },
  });
  const response = await service.analyzeEvent(evt());
  assert.equal(response.status, "UNAVAILABLE");
  assert.equal(response.summary, null);
  assert.match(response.limitations.join(" "), /unavailable/i);
});

test("provider error normalizes without leaking credentials", async () => {
  const service = createOracleService({
    provider: {
      id: "mock",
      model: "mock-1",
      analyze: async () => ({
        ok: false,
        kind: "provider_error",
        message: "Authorization Bearer sk-should-not-appear failed",
      }),
    },
  });
  const response = await service.analyzeEvent(evt());
  assert.equal(response.status, "ERROR");
  assert.doesNotMatch(JSON.stringify(response), /sk-should-not-appear/);
});

test("successful response normalization", async () => {
  const service = createOracleService({ provider: providerWith(SUCCESS_PAYLOAD) });
  const response = await service.analyzeEvent(evt());
  assert.equal(response.status, "SUCCESS");
  assert.equal(response.schemaVersion, "1.0");
  assert.ok(response.summary);
  assert.ok(response.facts[0]?.startsWith("FACT:"));
  assert.ok(response.marketObservation);
});

test("malformed model response is ERROR and does not invent facts", async () => {
  const service = createOracleService({ provider: providerWith("not json at all") });
  const response = await service.analyzeEvent(evt());
  assert.equal(response.status, "ERROR");
  assert.equal(response.facts.length, 0);
  assert.equal(response.summary, null);
});

test("no fabricated defaults when marketReaction is missing", async () => {
  const service = createOracleService({
    provider: {
      id: "mock",
      model: "mock-1",
      analyze: async (input) => {
        assert.equal(input.marketReaction, null);
        return {
          ok: true,
          payload: {
            ...SUCCESS_PAYLOAD,
            status: "PARTIAL",
            marketObservation: null,
            summary: "CPI released. Market reaction is unavailable.",
          },
        };
      },
    },
  });
  const response = await service.analyzeEvent(evt({ marketReaction: null }));
  assert.equal(response.marketObservation, null);
  assert.match(response.summary ?? "", /unavailable/i);
});

test("schemaVersion handling and deterministic fingerprint", () => {
  const a = projectOracleInput(evt());
  const b = projectOracleInput(evt());
  assert.equal(a.schemaVersion, "1.0");
  assert.equal(oracleFingerprint(a, "mock-1"), oracleFingerprint(b, "mock-1"));
  assert.notEqual(oracleFingerprint(a, "mock-1"), oracleFingerprint(a, "mock-2"));
});

test("user-triggered analysis only — feed does not auto-call Oracle", () => {
  const feed = readFileSync(new URL("../../components/catalysts/catalyst-feed.tsx", import.meta.url), "utf8");
  const panel = readFileSync(new URL("../../components/catalysts/oracle-panel.tsx", import.meta.url), "utf8");
  assert.match(feed, /OraclePanel/);
  assert.doesNotMatch(feed, /analyzeCatalystEvent|\/api\/oracle\/analyze/);
  assert.match(panel, /Explain this event/);
  assert.match(panel, /onClick/);
  assert.match(panel, /\/api\/oracle\/analyze/);
});

test("response safety withholds prediction and causality language", () => {
  const response = normalizeOracleResponse({
    payload: {
      status: "SUCCESS",
      summary: "Gold will rise after this print.",
      facts: ["FACT: CPI printed."],
      interpretation: ["This caused Gold to dump. Buy gold."],
      marketObservation: "XAUUSD moved -0.71% over 15m.",
      context: [],
      uncertainties: [],
      limitations: [],
    },
    fingerprint: "abc",
    provider: "mock",
    model: "mock-1",
  });
  assert.equal(response.summary, null);
  assert.equal(response.interpretation.length, 0);
  assert.ok(response.limitations.some((row) => /withheld/i.test(row)));
  assert.equal(response.facts[0], "FACT: CPI printed.");
});

test("same input hits cache and does not re-call the provider", async () => {
  let calls = 0;
  const service = createOracleService({
    provider: {
      id: "mock",
      model: "mock-1",
      analyze: async () => {
        calls += 1;
        return { ok: true, payload: SUCCESS_PAYLOAD };
      },
    },
  });
  const event = evt();
  await service.analyzeEvent(event);
  await service.analyzeEvent(event);
  assert.equal(calls, 1);
});

test("invalid enum is rejected and missing numbers are not invented", () => {
  const input = projectOracleInput(evt());
  (input.event as { classification: string[] }).classification = ["NOT_A_TYPE"];
  assert.equal(validateOracleInput(input).ok, false);
});
