import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/** The productIds: every directory under `{root}/src/products`, sorted. */
export function listProductIds(root: string): string[] {
  return readdirSync(join(root, 'src/products'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}
