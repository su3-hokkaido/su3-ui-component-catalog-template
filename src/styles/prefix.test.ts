import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLASS_PREFIX } from '../lib/prefix';

// Vitest stubs CSS modules (including ?raw imports), so read the source file directly.
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('Tailwind prefix', () => {
  it('uses CLASS_PREFIX on every Tailwind import', () => {
    const imports = css.match(/@import\s+'tailwindcss\/[^;]+;/g) ?? [];

    expect(imports.length).toBeGreaterThan(0);
    for (const statement of imports) {
      expect(statement).toContain(`prefix(${CLASS_PREFIX})`);
    }
  });

  it('overrides only variables that carry CLASS_PREFIX', () => {
    const overrides = css.match(/^\s+--[a-z0-9-]+(?=:)/gm) ?? [];
    const prefixed = overrides
      .map((name) => name.trim())
      .filter((name) => !name.startsWith('--color-'));

    expect(prefixed.length).toBeGreaterThan(0);
    for (const name of prefixed) {
      expect(name.startsWith(`--${CLASS_PREFIX}-`)).toBe(true);
    }
  });
});
