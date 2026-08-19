import type { CatalystCategory, NewsAsset } from "../../types/catalyst";

export type TextClassification = {
  assets: NewsAsset[];
  categories: CatalystCategory[];
};

type Rule = {
  pattern: RegExp;
  assets: NewsAsset[];
  categories: CatalystCategory[];
};

const RULES: Rule[] = [
  {
    pattern: /\b(fomc|federal reserve|fed chair|jerome powell|rate hike|rate cut|interest rates?|policy rate|central banks?)\b/i,
    assets: ["gold", "btc", "usd"],
    categories: ["central-banks", "macro"],
  },
  {
    pattern: /\b(cpi|pce|ppi|inflation|consumer price|producer price|deflation)\b/i,
    assets: ["gold", "usd"],
    categories: ["macro"],
  },
  {
    pattern: /\b(nfp|nonfarm|non-farm|payrolls|unemployment|jobs report|labor market)\b/i,
    assets: ["gold", "usd"],
    categories: ["macro"],
  },
  {
    pattern: /\b(gdp|recession|treasury yield|us dollar|dxy|greenback)\b/i,
    assets: ["gold", "usd"],
    categories: ["macro"],
  },
  {
    pattern: /\b(oil shock|crude oil|opec|energy shock|brent)\b/i,
    assets: ["gold", "usd"],
    categories: ["macro"],
  },
  {
    pattern: /\b(xau|gold price|gold prices|bullion|precious metals?)\b/i,
    assets: ["gold"],
    categories: ["gold"],
  },
  {
    pattern: /\b(bitcoin|btc|spot btc|btc etf|bitcoin etf)\b/i,
    assets: ["btc"],
    categories: ["crypto"],
  },
  {
    pattern: /\b(ethereum|ether\b|eth etf)\b/i,
    assets: ["eth"],
    categories: ["crypto"],
  },
  {
    pattern: /\b(solana|\bsol\b)\b/i,
    assets: ["sol"],
    categories: ["crypto"],
  },
  {
    pattern: /\b(cryptocurrenc(?:y|ies)|digital assets?|crypto market|crypto markets)\b/i,
    assets: ["btc", "eth", "sol"],
    categories: ["crypto"],
  },
  {
    pattern: /\b(sanction|sanctions|geopolitics|geopolitical|armed conflict|military strike|missile|invasion|ceasefire|war zone|middle east conflict)\b/i,
    assets: ["gold"],
    categories: ["geopolitical"],
  },
];

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function classifyText(text: string): TextClassification {
  const assets: NewsAsset[] = [];
  const categories: CatalystCategory[] = [];
  const haystack = text.toLowerCase();

  for (const rule of RULES) {
    if (rule.pattern.test(haystack)) {
      assets.push(...rule.assets);
      categories.push(...rule.categories);
    }
  }

  if (/\bgold\b/i.test(haystack) && !assets.includes("gold")) {
    assets.push("gold");
    categories.push("gold");
  }

  if (categories.includes("geopolitical") && categories.includes("crypto")) {
    assets.push("btc");
  }

  return {
    assets: unique(assets),
    categories: unique(categories),
  };
}
