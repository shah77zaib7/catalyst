import { createFileRoute } from "@tanstack/react-router";
import { parseAssetList } from "@/lib/market/instruments";
import { ASSETS } from "@/types/catalyst";

export const Route = createFileRoute("/api/market/quotes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getMarketQuotes } = await import("@/lib/market/service");
        const url = new URL(request.url);
        const raw = url.searchParams.get("assets") ?? ASSETS.join(",");
        const assets = parseAssetList(raw.split(","));
        const quotes = await getMarketQuotes(assets.length > 0 ? assets : [...ASSETS]);
        return Response.json({
          quotes,
          requestedAt: new Date().toISOString(),
        });
      },
    },
  },
});
