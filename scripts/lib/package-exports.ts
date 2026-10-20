/**
 * The package.json `exports` map (docs/project_plan.md section 9), derived from the product list so
 * that tsdown.config.ts, scripts/new-product.ts and the conventions test agree on it.
 */

/** Conditional export of one JavaScript entry built by tsdown (ESM and CJS, each with types). */
export interface EntryExport {
  import: { types: string; default: string };
  require: { types: string; default: string };
}

export type PackageExports = Record<string, EntryExport | string>;

/** Stylesheets and package.json, exported after the JavaScript entries. */
export const STATIC_EXPORTS = {
  './styles.css': './dist/styles.css',
  './theme.css': './dist/theme.css',
  './package.json': './package.json',
} as const satisfies PackageExports;

/** tsdown entry name for a product; product files live under dist/products. */
export function productEntryName(productId: string): string {
  return `products/${productId}`;
}

/** Export condition for a tsdown entry named `entryName` (e.g. `index`, `products/sample`). */
export function entryExport(entryName: string): EntryExport {
  return {
    import: { types: `./dist/${entryName}.d.mts`, default: `./dist/${entryName}.mjs` },
    require: { types: `./dist/${entryName}.d.cts`, default: `./dist/${entryName}.cjs` },
  };
}

/** The full `exports` map: shared at the root, one sub-path per product, then stylesheets. */
export function expectedExports(productIds: readonly string[]): PackageExports {
  const products = [...productIds]
    .sort()
    .map((productId) => [`./${productId}`, entryExport(productEntryName(productId))] as const);
  return { '.': entryExport('index'), ...Object.fromEntries(products), ...STATIC_EXPORTS };
}
