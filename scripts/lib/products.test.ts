import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { listProductIds } from './products.ts';

describe('listProductIds', () => {
  let root: string | undefined;

  afterEach(() => {
    if (root !== undefined) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('lists the product directories in order and ignores files', () => {
    root = mkdtempSync(join(tmpdir(), 'products-'));
    for (const productId of ['zeta', 'acme-web']) {
      mkdirSync(join(root, 'src/products', productId), { recursive: true });
    }
    writeFileSync(join(root, 'src/products/README.md'), '');

    expect(listProductIds(root)).toEqual(['acme-web', 'zeta']);
  });
});
