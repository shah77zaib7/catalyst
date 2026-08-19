import { createFileRoute } from "@tanstack/react-router";
import { NEWS_ASSETS, type NewsAsset } from "@/types/catalyst";

export const Route = createFileRoute("/api/news/catalysts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getNewsFeed } = await import("@/lib/news/service");
        const url = new URL(request.url);
        const rawAssets = url.searchParams.get("assets") ?? "";
        const assets = rawAssets
          .split(",")
          .map((value) => value.trim())
          .filter((value): value is NewsAsset => (NEWS_ASSETS as readonly string[]).includes(value));
        const limit = Number(url.searchParams.get("limit") ?? "20");
        const feed = await getNewsFeed({
          assets: assets.length > 0 ? assets : undefined,
          limit: Number.isFinite(limit) ? limit : 20,
        });
        return Response.json({
          events: feed.events,
          status: feed.status,
          requestedAt: new Date().toISOString(),
        });
      },
    },
  },
});
