import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/oracle/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { analyzeCatalystEvent, analyzeOracleInput } = await import("@/lib/oracle/service");
        let body: unknown = null;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            {
              schemaVersion: "1.0",
              status: "ERROR",
              summary: null,
              facts: [],
              marketObservation: null,
              context: [],
              interpretation: [],
              uncertainties: [],
              limitations: ["Request body must be JSON."],
              fingerprint: "",
              provider: null,
              model: null,
              errorCategory: "invalid_input",
            },
            { status: 400 },
          );
        }

        const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        const response = record.event
          ? await analyzeCatalystEvent(record.event as never)
          : await analyzeOracleInput(record.input ?? record);

        const http =
          response.status === "ERROR" && response.errorCategory === "invalid_input" ? 400 : 200;
        return Response.json(response, { status: http });
      },
    },
  },
});
