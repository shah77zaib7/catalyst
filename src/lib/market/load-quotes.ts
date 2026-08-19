import { createServerFn } from "@tanstack/react-start";
import { parseAssetList } from "@/lib/market/instruments";
import { ASSETS, type Asset } from "@/types/catalyst";

export const loadMarketQuotes = createServerFn({ method: "GET" })
  .validator((input: { assets: Asset[] }) => {
    const assets = parseAssetList(input?.assets ?? []);
    if (assets.length === 0) {
      throw new Error("At least one valid asset is required");
    }
    return { assets };
  })
  .handler(async ({ data }) => {
    const { getMarketQuotes } = await import("./service");
    return getMarketQuotes(data.assets);
  });

export const loadMarketIntegration = createServerFn({ method: "GET" }).handler(async () => {
  const { getMarketIntegrationSnapshot } = await import("./service");
  return getMarketIntegrationSnapshot();
});

export function allSupportedAssets(): Asset[] {
  return [...ASSETS];
}
