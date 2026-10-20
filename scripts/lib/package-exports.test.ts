import { describe, expect, it } from 'vitest';
import { entryExport, expectedExports, productEntryName } from './package-exports.ts';

describe('entryExport', () => {
  it('points import and require at the ESM and CJS builds with their own types', () => {
    expect(entryExport('products/sample')).toEqual({
      import: {
        types: './dist/products/sample.d.mts',
        default: './dist/products/sample.mjs',
      },
      require: {
        types: './dist/products/sample.d.cts',
        default: './dist/products/sample.cjs',
      },
    });
  });
});

describe('productEntryName', () => {
  it('places products under dist/products', () => {
    expect(productEntryName('acme-web')).toBe('products/acme-web');
  });
});

describe('expectedExports', () => {
  it('lists the root, every product in order, then the stylesheets and package.json', () => {
    const exports = expectedExports(['zeta', 'sample']);

    expect(Object.keys(exports)).toEqual([
      '.',
      './sample',
      './zeta',
      './styles.css',
      './theme.css',
      './package.json',
    ]);
    expect(exports['.']).toEqual(entryExport('index'));
    expect(exports['./zeta']).toEqual(entryExport('products/zeta'));
    expect(exports['./styles.css']).toBe('./dist/styles.css');
  });
});
