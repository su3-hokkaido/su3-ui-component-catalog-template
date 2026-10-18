import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';

/**
 * Product whose stories are included in this build. Each product is built separately
 * (docs/project_plan.md section 4), so one Storybook contains `src/shared` plus one product.
 */
const productId = process.env.PRODUCT_ID ?? 'sample';

if (!existsSync(resolve(import.meta.dirname, '../src/products', productId))) {
  throw new Error(
    `PRODUCT_ID "${productId}" does not exist under src/products. ` +
      'Create it with `make new-product PRODUCT_ID=...` or pick an existing product.',
  );
}

const config: StorybookConfig = {
  stories: [
    '../src/shared/**/*.stories.@(ts|tsx)',
    `../src/products/${productId}/**/*.stories.@(ts|tsx)`,
  ],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs', '@storybook/addon-themes'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal(viteConfig) {
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];
    return viteConfig;
  },
};

export default config;
