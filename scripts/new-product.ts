/**
 * Scaffolds a productId (docs/project_plan.md sections 3 and 9).
 *
 * Usage: node scripts/new-product.ts <productId>
 *
 * Creates src/products/{productId}/index.ts and rewrites package.json `exports` with the new
 * `./{productId}` sub-path. Storybook, the ESLint dependency rules, the Storybook site build and
 * tsdown pick the product up from the directory list; add components with /new-component.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { expectedExports } from './lib/package-exports.ts';
import { listProductIds } from './lib/products.ts';
import { isValidProductId } from './lib/storybook-site.ts';

const root = resolve(import.meta.dirname, '..');

const INDEX_SOURCE = `// Public API of this product, published as the package sub-path of the same name. Re-export each
// component here, e.g. export * from './components/{category}/{Component}';
export {};
`;

function main(args: string[]): void {
  const [productId, ...extra] = args;
  if (productId === undefined || extra.length > 0) {
    throw new Error('Usage: node scripts/new-product.ts <productId>');
  }
  if (!isValidProductId(productId)) {
    throw new Error(`productId must be lower-case kebab-case (e.g. acme-web): "${productId}"`);
  }
  const productDir = join(root, 'src/products', productId);
  if (existsSync(productDir)) {
    throw new Error(`${relative(root, productDir)} already exists.`);
  }

  // Read package.json first, so that a broken file stops the script before anything is created.
  const packageJsonPath = join(root, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>;

  mkdirSync(productDir, { recursive: true });
  writeFileSync(join(productDir, 'index.ts'), INDEX_SOURCE);

  packageJson.exports = expectedExports(listProductIds(root));
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  console.log(`Created ${relative(root, productDir)}/index.ts and the "./${productId}" export.`);
  console.log(
    `Next: add components with /new-component, then run make dev PRODUCT_ID=${productId}.`,
  );
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
