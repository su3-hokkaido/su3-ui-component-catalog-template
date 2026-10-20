import { defineConfig } from 'tsdown';
import { productEntryName } from './scripts/lib/package-exports.ts';
import { listProductIds } from './scripts/lib/products.ts';

/**
 * Library build (docs/project_plan.md section 9): the root entry (src/shared and cn) plus one entry
 * per product directory, in ESM and CJS with type declarations. package.json `exports` is written
 * by scripts/new-product.ts and checked by src/conventions.test.ts, not generated here.
 * dist/styles.css is built afterwards by the Tailwind CLI (see the `build` script).
 */
const productEntries = listProductIds(import.meta.dirname).map(
  (productId) => [productEntryName(productId), `src/products/${productId}/index.ts`] as const,
);

export default defineConfig({
  entry: { index: 'src/index.ts', ...Object.fromEntries(productEntries) },
  format: ['esm', 'cjs'],
  dts: true,
  platform: 'neutral',
  target: 'es2023',
  fixedExtension: true,
  // dist/storybook (scripts/build-storybook-all.ts) shares the directory, so only the package
  // output is cleaned.
  clean: ['dist/*.{mjs,cjs,d.mts,d.cts,css}', 'dist/products'],
  // Every component is a client component (some use state), so Next.js App Router consumers can
  // import them from server components.
  banner: ({ fileName }) => (/\.d\.[cm]ts$/.test(fileName) ? undefined : "'use client';"),
  copy: [{ from: 'src/styles/theme.css', to: 'dist' }],
});
