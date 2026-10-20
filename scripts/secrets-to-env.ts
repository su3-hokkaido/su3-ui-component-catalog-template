/**
 * Converts an AWS Secrets Manager SecretString read from stdin (docs/project_plan.md section 7).
 * Used by scripts/secrets-pull-aws.sh and scripts/secrets-push-cloudflare.sh.
 *
 * Usage: node scripts/secrets-to-env.ts [--format env|json|names] [--source <secret id>]
 *   env    the generated .env.local (default; --source is required)
 *   json   a flat object of string values, for `wrangler pages secret bulk`
 *   names  the variable names, one per line
 * Errors never include a value.
 */
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { parseSecretString, toDotenv } from './lib/secrets.ts';

function main(): void {
  const { values } = parseArgs({
    options: {
      format: { type: 'string', default: 'env' },
      source: { type: 'string' },
    },
  });
  const secrets = parseSecretString(readFileSync(0, 'utf8'));

  switch (values.format) {
    case 'env':
      if (values.source === undefined) {
        throw new Error('--source <secret id> is required for --format env.');
      }
      process.stdout.write(toDotenv(secrets, values.source));
      break;
    case 'json':
      process.stdout.write(`${JSON.stringify(secrets)}\n`);
      break;
    case 'names':
      process.stdout.write(
        Object.keys(secrets)
          .sort()
          .map((name) => `${name}\n`)
          .join(''),
      );
      break;
    default:
      throw new Error(`Unknown --format "${values.format}". Use env, json or names.`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
