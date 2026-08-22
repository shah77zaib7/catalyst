import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CatalystEvent } from "@/types/catalyst";
import type { OracleResponse, OracleStatus } from "@/lib/oracle/types";

function StatusLine({ status }: { status: OracleStatus }) {
  const label: Record<OracleStatus, string> = {
    READY: "Ready",
    PROCESSING: "Processing",
    SUCCESS: "Explanation",
    PARTIAL: "Partial explanation",
    UNAVAILABLE: "Oracle unavailable",
    ERROR: "Oracle error",
  };
  return <p className="text-[10px] font-medium tracking-[0.16em] text-subtle uppercase">{label[status]}</p>;
}

export function OraclePanel({ event }: { event: CatalystEvent }) {
  const [status, setStatus] = useState<OracleStatus>("READY");
  const [response, setResponse] = useState<OracleResponse | null>(null);

  async function explain() {
    setStatus("PROCESSING");
    try {
      const result = await fetch("/api/oracle/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ event }),
      });
      const payload = (await result.json()) as OracleResponse;
      setResponse(payload);
      setStatus(payload.status);
    } catch {
      setResponse(null);
      setStatus("ERROR");
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-border/70 px-3 py-2.5" aria-label="Oracle explanation. Not a forecast.">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium tracking-[0.16em] text-subtle uppercase">Oracle</p>
          <p className="text-[12px] text-foreground">Why this matters</p>
        </div>
        <Button type="button" variant="glass" size="sm" onClick={() => void explain()} disabled={status === "PROCESSING"}>
          {status === "PROCESSING" ? "Explaining…" : "Explain this event"}
        </Button>
      </div>
      {status === "READY" && !response ? (
        <p className="mt-2 text-[11px] text-subtle">User-triggered explanation of Catalyst facts. Not a prediction.</p>
      ) : null}
      {status !== "READY" ? <div className="mt-2"><StatusLine status={status} /></div> : null}
      {status === "UNAVAILABLE" ? (
        <p className="mt-1 text-[12px] text-subtle">Oracle unavailable</p>
      ) : null}
      {response && (response.status === "SUCCESS" || response.status === "PARTIAL") ? (
        <div className="mt-2 space-y-1.5 text-[12px] text-foreground">
          {response.summary ? <p>{response.summary}</p> : null}
          {response.marketObservation ? (
            <p className="text-[11px] text-subtle">Observed: {response.marketObservation}</p>
          ) : null}
          {response.context[0] ? <p className="text-[11px] text-subtle">Context: {response.context[0]}</p> : null}
          {response.uncertainties[0] ? (
            <p className="text-[11px] text-subtle">Uncertainty: {response.uncertainties[0]}</p>
          ) : null}
        </div>
      ) : null}
      {response?.status === "ERROR" ? (
        <p className="mt-1 text-[11px] text-subtle">{response.limitations[0] ?? "Oracle error"}</p>
      ) : null}
    </div>
  );
}
