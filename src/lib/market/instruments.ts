import { ASSET_SYMBOLS, ASSETS, type Asset } from "../../types/catalyst";

export const MARKET_INSTRUMENTS = ASSETS.map((asset) => ({
  asset,
  symbol: ASSET_SYMBOLS[asset],
}));

export const DASHBOARD_WATCHLIST = ["gold", "bitcoin"] as const satisfies readonly Asset[];
export const GOLD_WATCHLIST = ["gold"] as const satisfies readonly Asset[];
export const CRYPTO_WATCHLIST = ["bitcoin", "ethereum", "solana"] as const satisfies readonly Asset[];

export function isAsset(value: string): value is Asset {
  return (ASSETS as readonly string[]).includes(value);
}

export function parseAssetList(values: readonly string[]): Asset[] {
  const seen = new Set<Asset>();
  for (const value of values) {
    const trimmed = value.trim().toLowerCase();
    if (isAsset(trimmed)) seen.add(trimmed);
  }
  return ASSETS.filter((asset) => seen.has(asset));
}
