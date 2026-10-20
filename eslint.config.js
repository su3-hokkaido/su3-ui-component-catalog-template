// @ts-check
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import storybook from 'eslint-plugin-storybook';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Product directories under src/products. The dependency-direction zones are generated from this
 * list so that a newly added product is covered without editing this file.
 */
const products = readdirSync(resolve(import.meta.dirname, 'src/products'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

/** Dependency direction from docs/project_plan.md section 3. */
const dependencyZones = [
  {
    target: './src/shared',
    from: './src/products',
    message: 'src/shared must not import from src/products.',
  },
  ...products.map((product) => ({
    target: `./src/products/${product}`,
    from: './src/products',
    except: [`./${product}`],
    message: 'A product must not import from another product. Move shared code to src/shared.',
  })),
];

export default defineConfig(
  globalIgnores([
    'coverage',
    'dist',
    'storybook-static',
    'test-results',
    'playwright-report',
    '.wrangler',
  ]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.js'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ...reactHooks.configs.flat['recommended-latest'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver()],
    },
    rules: {
      'import-x/no-restricted-paths': ['error', { zones: dependencyZones }],
    },
  },
  storybook.configs['flat/recommended'],
  prettier,
);
