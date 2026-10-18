/**
 * Checks the built package in dist after `pnpm run build` (docs/project_plan.md sections 9 and 10).
 * publint and attw cover the package.json fields and type resolution; this script covers what is
 * specific to this library:
 *
 * - every `exports` target exists,
 * - every JavaScript file starts with 'use client' and does not bundle React,
 * - styles.css holds the prefixed utilities and tokens, including the dark theme, and nothing
 *   unprefixed (no preflight, no consumer-colliding classes),
 * - theme.css is the token source for consumers that run Tailwind.
 *
 * Usage: node scripts/check-package.ts
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { CLASS_PREFIX } from '../src/lib/prefix.ts';

const root = resolve(import.meta.dirname, '..');
const distDir = join(root, 'dist');
const problems: string[] = [];

function check(condition: boolean, message: string): void {
  if (!condition) {
    problems.push(message);
  }
}

/** Every string leaf of a conditional `exports` value. */
function exportTargets(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(exportTargets);
  }
  return [];
}

/** JavaScript files of the package (dist/storybook is not part of it). */
function packageScripts(): string[] {
  return ['.', 'products'].flatMap((dir) =>
    readdirSync(join(distDir, dir))
      .filter((file) => /\.[cm]js$/.test(file))
      .map((file) => join(distDir, dir, file)),
  );
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  exports: unknown;
};
for (const target of exportTargets(packageJson.exports)) {
  check(existsSync(join(root, target)), `exports target ${target} does not exist`);
}

for (const file of packageScripts()) {
  const source = readFileSync(file, 'utf8');
  const name = relative(root, file);
  check(source.startsWith("'use client';"), `${name} does not start with 'use client'`);
  check(!source.includes('@license React'), `${name} bundles React instead of importing it`);
}

const styles = readFileSync(join(distDir, 'styles.css'), 'utf8');
const escapedPrefix = `.${CLASS_PREFIX}\\:`;
check(styles.includes(`${escapedPrefix}bg-primary{`), 'styles.css lacks the component utilities');
check(styles.includes(`--${CLASS_PREFIX}-color-primary:`), 'styles.css lacks the color tokens');
check(
  new RegExp(`\\.dark\\{[^}]*--${CLASS_PREFIX}-color-primary:`).test(styles),
  'styles.css lacks the dark theme tokens',
);
check(!styles.includes('box-sizing:border-box'), 'styles.css contains preflight');
// A class selector right after `{`, `}` or `,` must be prefixed (or the .dark theme scope).
const unprefixedSelector = new RegExp(
  `[{},]\\.(?!${CLASS_PREFIX}\\\\:|dark\\{)[A-Za-z_-][^{,]*`,
  'g',
);
const unprefixed = styles.match(unprefixedSelector) ?? [];
check(unprefixed.length === 0, `styles.css has unprefixed selectors: ${unprefixed.join(' ')}`);

const theme = readFileSync(join(distDir, 'theme.css'), 'utf8');
check(theme.includes('@theme static'), 'theme.css lacks the @theme tokens');

if (problems.length > 0) {
  console.error(`Package check failed:\n${problems.map((problem) => `- ${problem}`).join('\n')}`);
  process.exit(1);
}
console.log('Package check passed.');
