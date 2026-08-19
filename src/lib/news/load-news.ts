import { createServerFn } from "@tanstack/react-start";
import { NEWS_ASSETS, type NewsAsset } from "@/types/catalyst";

function parseNewsAssets(values: unknown): NewsAsset[] {
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is NewsAsset =>
    typeof value === "string" && (NEWS_ASSETS as readonly string[]).includes(value),
  );
}

export const loadCatalystEvents = createServerFn({ method: "GET" })
  .validator((input: { assets?: NewsAsset[]; limit?: number } = {}) => {
    const limit = typeof input.limit === "number" && input.limit > 0 ? Math.min(input.limit, 50) : 20;
    return { assets: parseNewsAssets(input.assets), limit };
  })
  .handler(async ({ data }) => {
    const { getNewsFeed } = await import("./service");
    return getNewsFeed({
      assets: data.assets.length > 0 ? data.assets : undefined,
      limit: data.limit,
    });
  });
