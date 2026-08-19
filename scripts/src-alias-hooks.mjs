const TS_EXT = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const bare = new URL(`../src/${specifier.slice(2)}`, import.meta.url).href;
    try {
      return await nextResolve(bare, context);
    } catch {
      return nextResolve(`${bare}.ts`, context);
    }
  }

  const parent = context.parentURL ?? "";
  if (parent.includes("/src/") && specifier.startsWith(".") && !TS_EXT.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      return nextResolve(specifier, context);
    }
  }

  return nextResolve(specifier, context);
}
