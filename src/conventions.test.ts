/**
 * Mechanical checks for the conventions in docs/project_plan.md sections 3, 4, 9, 11 and 13.
 * They run with the unit tests so that a convention violation fails `pnpm run ci`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { expectedExports } from '../scripts/lib/package-exports.ts';
import { isValidProductId } from '../scripts/lib/storybook-site.ts';

const root = process.cwd();
const sharedDir = resolve(root, 'src/shared');
const productsDir = resolve(root, 'src/products');

interface ComponentEntry {
  /** `shared` or a productId. */
  scope: string;
  scopeDir: string;
  category: string;
  name: string;
  dir: string;
}

function subdirectories(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function collectComponents(scope: string, scopeDir: string): ComponentEntry[] {
  const componentsDir = join(scopeDir, 'components');
  return subdirectories(componentsDir).flatMap((category) =>
    subdirectories(join(componentsDir, category)).map((name) => ({
      scope,
      scopeDir,
      category,
      name,
      dir: join(componentsDir, category, name),
    })),
  );
}

/** Converts a kebab-case category directory into a story title segment (`date-pickers` -> `Date Pickers`). */
function toTitleSegment(category: string): string {
  return category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function readStoryTitle(storyFile: string): string | undefined {
  return /\btitle:\s*['"]([^'"]+)['"]/.exec(readFileSync(storyFile, 'utf8'))?.[1];
}

const products = subdirectories(productsDir);
const sharedComponents = collectComponents('shared', sharedDir);
const productComponents = products.flatMap((product) =>
  collectComponents(product, join(productsDir, product)),
);
const allComponents = [...sharedComponents, ...productComponents];

describe('component conventions', () => {
  it('finds the reference components', () => {
    expect(sharedComponents.length).toBeGreaterThan(0);
    expect(productComponents.length).toBeGreaterThan(0);
  });

  describe.each(allComponents.map((entry) => [relative(root, entry.dir), entry] as const))(
    '%s',
    (_label, entry) => {
      it('uses a kebab-case category and a PascalCase component name', () => {
        expect(entry.category).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        expect(entry.name).toMatch(/^[A-Z][A-Za-z0-9]*$/);
      });

      it('contains exactly the component, story, test and index files', () => {
        const files = readdirSync(entry.dir).sort();
        const expected = [
          `${entry.name}.stories.tsx`,
          `${entry.name}.test.tsx`,
          `${entry.name}.tsx`,
          'index.ts',
        ].sort();

        expect(files).toEqual(expected);
      });

      it('has a {Category}/{Component} story title and a Default story', () => {
        const storyFile = join(entry.dir, `${entry.name}.stories.tsx`);
        const source = readFileSync(storyFile, 'utf8');

        expect(readStoryTitle(storyFile)).toBe(`${toTitleSegment(entry.category)}/${entry.name}`);
        expect(source).toMatch(/export const Default\b/);
      });

      it("is re-exported from its scope's index.ts", () => {
        const scopeIndex = readFileSync(join(entry.scopeDir, 'index.ts'), 'utf8');

        expect(scopeIndex).toContain(`'./components/${entry.category}/${entry.name}'`);
      });
    },
  );

  describe.each(products)('build for product "%s"', (product) => {
    it('uses a kebab-case productId, because it is a URL path segment', () => {
      expect(isValidProductId(product)).toBe(true);
    });

    it('has unique story titles across src/shared and the product', () => {
      const titles = [
        ...sharedComponents,
        ...productComponents.filter((entry) => entry.scope === product),
      ].map((entry) => readStoryTitle(join(entry.dir, `${entry.name}.stories.tsx`)));

      expect(new Set(titles).size).toBe(titles.length);
    });
  });

  it('exports every product from package.json, so none is left out of the package', () => {
    const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      exports?: unknown;
    };

    // Add a product with `make new-product`, which writes this map.
    expect(packageJson.exports).toEqual(expectedExports(products));
  });

  it('runs the VRT in the Playwright image that matches @playwright/test', () => {
    const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      devDependencies?: Record<string, string>;
    };
    const dockerfile = readFileSync(resolve(root, 'Dockerfile'), 'utf8');
    const tag = /^FROM mcr\.microsoft\.com\/playwright:v(\S+?)-\S+ AS vrt$/m.exec(dockerfile)?.[1];

    // Bump both together, or the browser build differs from the one the baselines came from.
    expect(tag).toBe(packageJson.devDependencies?.['@playwright/test']);
  });
});
