/**
 * Builds the multi-product Storybook site (docs/project_plan.md section 4):
 *
 *   dist/storybook/
 *     index.html        portal listing every product and its components
 *     _redirects        Cloudflare clean-URL rule (deploy/cloudflare/_redirects)
 *     {productId}/      Storybook build containing src/shared plus that product
 *
 * Usage: node scripts/build-storybook-all.ts [productId...]
 * Without arguments every directory under src/products is built. dist/storybook is always rebuilt
 * from scratch, so building a subset leaves only those products (and a portal listing them). The
 * PRODUCT_ID environment variable is ignored on purpose: it is set per build here, and the dev
 * container always has one.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { listProductIds } from './lib/products.ts';
import {
  collectCleanUrls,
  isValidProductId,
  renderPortal,
  type PortalProduct,
  type StoryIndex,
} from './lib/storybook-site.ts';

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'dist/storybook');

function selectProducts(requested: string[]): string[] {
  const products = listProductIds(root);
  if (products.length === 0) {
    throw new Error('src/products contains no product.');
  }
  const invalid = products.filter((productId) => !isValidProductId(productId));
  if (invalid.length > 0) {
    throw new Error(`productIds must be lower-case kebab-case: ${invalid.join(', ')}`);
  }
  const unknown = requested.filter((productId) => !products.includes(productId));
  if (unknown.length > 0) {
    throw new Error(`Unknown productId: ${unknown.join(', ')}. Available: ${products.join(', ')}`);
  }
  return requested.length > 0 ? requested : products;
}

function buildProduct(productId: string): PortalProduct {
  const productDir = join(outDir, productId);
  console.log(`\nBuilding Storybook for "${productId}" into ${relative(root, productDir)}`);
  const result = spawnSync(
    'pnpm',
    ['exec', 'storybook', 'build', '--output-dir', productDir, '--quiet'],
    { cwd: root, stdio: 'inherit', env: { ...process.env, PRODUCT_ID: productId } },
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Storybook build failed for "${productId}".`);
  }
  const index = JSON.parse(readFileSync(join(productDir, 'index.json'), 'utf8')) as StoryIndex;
  return { productId, components: collectCleanUrls(productId, index) };
}

function main(): void {
  const productIds = selectProducts(process.argv.slice(2));
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const products = productIds.map(buildProduct);

  const template = readFileSync(join(root, 'portal/index.html'), 'utf8');
  writeFileSync(join(outDir, 'index.html'), renderPortal(template, products));
  copyFileSync(join(root, 'deploy/cloudflare/_redirects'), join(outDir, '_redirects'));

  console.log(`\nBuilt ${productIds.join(', ')} into ${relative(root, outDir)}`);
  for (const { components } of products) {
    for (const component of components) {
      console.log(`  ${component.path} -> ${component.storyId}`);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
