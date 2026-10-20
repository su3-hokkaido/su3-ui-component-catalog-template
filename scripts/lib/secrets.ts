/**
 * Converts an AWS Secrets Manager `SecretString` into `.env.local` (docs/project_plan.md
 * section 7). The secret is a flat JSON object; values are written so that Vite's `loadEnv`
 * (dotenv + dotenv-expand, used by the Storybook Vite builder) reads them back unchanged.
 */

/** First line of every generated file; the pull only replaces files that start with it. */
export const MANAGED_MARKER = '# Managed by make secrets-pull-aws.';

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Parses a `SecretString`. Errors name the offending key, never a value. */
export function parseSecretString(text: string): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The secret is not JSON. Store it as key/value pairs (a flat JSON object).');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('The secret must be a flat JSON object of key/value pairs.');
  }
  const secrets: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    // __proto__ matches the pattern but cannot be stored as a plain property.
    if (!KEY_PATTERN.test(key) || key === '__proto__') {
      throw new Error(`Invalid variable name "${key}": use letters, digits and underscores.`);
    }
    if (typeof value === 'string') {
      secrets[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      secrets[key] = String(value);
    } else {
      throw new Error(`The value of ${key} must be a string, number or boolean.`);
    }
  }
  return secrets;
}

/**
 * Quotes a value for a .env file, or throws when no quoting reads back exactly:
 * - `$` is always written as `\$`, because dotenv-expand expands `$NAME`;
 * - single quotes and backticks keep everything else literally, but a trailing backslash would
 *   escape the closing quote;
 * - double quotes turn `\n` into a line break, so they hold line breaks and nothing with a
 *   backslash or a double quote; a carriage return has no escape that loadEnv reads back.
 */
export function quoteEnvValue(key: string, value: string): string {
  if (value.includes('\r')) {
    throw new Error(`The value of ${key} has a carriage return, which .env cannot represent.`);
  }
  if (value.includes('\\$')) {
    throw new Error(`The value of ${key} has a backslash before "$", which .env cannot represent.`);
  }
  const escaped = value.replaceAll('$', '\\$');
  const doubleQuotable = !value.includes('"') && !value.includes('\\');
  if (value.includes('\n')) {
    if (!doubleQuotable) {
      throw new Error(
        `The value of ${key} has a line break together with " or \\, which .env cannot represent.`,
      );
    }
    return `"${escaped.replaceAll('\n', '\\n')}"`;
  }
  const literalQuotable = !value.endsWith('\\');
  if (literalQuotable && !value.includes("'")) {
    return `'${escaped}'`;
  }
  if (literalQuotable && !value.includes('`')) {
    return `\`${escaped}\``;
  }
  if (doubleQuotable) {
    return `"${escaped}"`;
  }
  throw new Error(
    `The value of ${key} combines quote characters and backslashes in a way .env cannot represent.`,
  );
}

/** Renders the generated `.env.local`, keys sorted. `source` is the secret id it came from. */
export function toDotenv(secrets: Record<string, string>, source: string): string {
  if (/[\r\n"]/.test(source)) {
    throw new Error(`Invalid secret id: ${JSON.stringify(source)}`);
  }
  const header = [
    MANAGED_MARKER,
    `# Generated from the AWS Secrets Manager secret "${source}". Do not edit: the next`,
    '# `make secrets-pull-aws` overwrites this file. Change the secret instead.',
  ];
  const lines = Object.keys(secrets)
    .sort()
    .map((key) => `${key}=${quoteEnvValue(key, secrets[key] ?? '')}`);
  return `${[...header, ...lines].join('\n')}\n`;
}
