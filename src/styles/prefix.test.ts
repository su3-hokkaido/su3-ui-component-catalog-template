import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLASS_PREFIX } from '../lib/prefix';

// Vitest stubs CSS modules (including ?raw imports), so read the source files directly.
const stylesDir = resolve(process.cwd(), 'src/styles');
const stylesheets = readdirSync(stylesDir)
  .filter((file) => file.endsWith('.css'))
  .map((file) => [file, readFileSync(resolve(stylesDir, file), 'utf8')] as const);

describe('Tailwind prefix', () => {
  it('finds the Storybook, package and theme stylesheets', () => {
    expect(stylesheets.map(([file]) => file)).toEqual(
      expect.arrayContaining(['index.css', 'package.css', 'theme.css']),
    );
  });

  it.each(stylesheets)('uses CLASS_PREFIX on every Tailwind import in %s', (_file, css) => {
    const imports = css.match(/@import\s+'tailwindcss\/[^;]+;/g) ?? [];

    for (const statement of imports) {
      expect(statement).toContain(`prefix(${CLASS_PREFIX})`);
    }
  });

  it('imports Tailwind with the prefix in each compiled entry', () => {
    for (const [file, css] of stylesheets.filter(([name]) => name !== 'theme.css')) {
      expect(css, file).toContain(
        `@import 'tailwindcss/theme.css' layer(theme) prefix(${CLASS_PREFIX})`,
      );
      expect(css, file).toMatch(
        new RegExp(
          `@import 'tailwindcss/utilities\\.css' layer\\(utilities\\) prefix\\(${CLASS_PREFIX}\\)`,
        ),
      );
      expect(css, file).toContain("@import './theme.css';");
    }
  });

  it.each(stylesheets)('overrides only variables that carry CLASS_PREFIX in %s', (_file, css) => {
    const overrides = css.match(/^\s+--[a-z0-9-]+(?=:)/gm) ?? [];
    const prefixed = overrides
      .map((name) => name.trim())
      .filter((name) => !name.startsWith('--color-'));

    for (const name of prefixed) {
      expect(name.startsWith(`--${CLASS_PREFIX}-`)).toBe(true);
    }
  });

  it('defines the dark overrides in theme.css', () => {
    const theme = stylesheets.find(([file]) => file === 'theme.css')?.[1] ?? '';

    expect(theme).toContain(`--${CLASS_PREFIX}-color-primary:`);
  });
});
