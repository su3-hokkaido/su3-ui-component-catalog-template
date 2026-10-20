// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';
import { MANAGED_MARKER, parseSecretString, quoteEnvValue, toDotenv } from './secrets.ts';

describe('parseSecretString', () => {
  it('reads a flat object and stringifies numbers and booleans', () => {
    expect(parseSecretString('{"STORYBOOK_A":"x","PORT":5070,"ON":true}')).toEqual({
      STORYBOOK_A: 'x',
      PORT: '5070',
      ON: 'true',
    });
  });

  it.each([
    ['plain text', 'not json', /not JSON/],
    ['an array', '["a"]', /flat JSON object/],
    ['null', 'null', /flat JSON object/],
    ['a string', '"a"', /flat JSON object/],
    ['a bad name', '{"1A":"x"}', /Invalid variable name "1A"/],
    ['a dashed name', '{"A-B":"x"}', /Invalid variable name "A-B"/],
    ['a nested value', '{"A":{"b":1}}', /value of A must be/],
    ['a null value', '{"A":null}', /value of A must be/],
    ['a prototype key', '{"__proto__":"x"}', /Invalid variable name "__proto__"/],
  ])('rejects %s', (_label, text, message) => {
    expect(() => parseSecretString(text)).toThrow(message);
  });

  it('never puts a value in an error', () => {
    expect(() => parseSecretString('{"TOKEN":["s3cret"]}')).toThrow(/^(?!.*s3cret)/);
  });
});

describe('quoteEnvValue', () => {
  it('prefers single quotes, then backticks, then double quotes', () => {
    expect(quoteEnvValue('A', 'plain')).toBe("'plain'");
    expect(quoteEnvValue('A', "it's")).toBe("`it's`");
    expect(quoteEnvValue('A', "it's `x`")).toBe('"it\'s `x`"');
    expect(quoteEnvValue('A', 'two\nlines')).toBe('"two\\nlines"');
  });

  it.each([
    ['a carriage return', 'a\r\nb', /carriage return/],
    ['a backslash before $', 'a\\$b', /backslash before "\$"/],
    ['a line break with a double quote', 'a\n"b"', /line break/],
    ['a line break with a backslash', 'a\n\\b', /line break/],
    ['every quote and a backslash', '\'"`\\', /quote characters and backslashes/],
    ['a trailing backslash', 'ends with \\', /quote characters and backslashes/],
  ])('rejects %s', (_label, value, message) => {
    expect(() => quoteEnvValue('KEY', value)).toThrow(message);
  });
});

describe('MANAGED_MARKER', () => {
  it('matches the marker the shell scripts check', () => {
    const shell = readFileSync(join(import.meta.dirname, 'aws-secrets.sh'), 'utf8');

    expect(shell).toContain(`readonly MANAGED_MARKER='${MANAGED_MARKER}'`);
  });

  it('is the first line of .env.local.sample, so the copy made by make setup can be replaced', () => {
    const sample = readFileSync(join(import.meta.dirname, '../../.env.local.sample'), 'utf8');

    expect(sample.split('\n')[0]).toBe(MANAGED_MARKER);
  });
});

describe('toDotenv', () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('starts with the managed marker and sorts the keys', () => {
    const text = toDotenv({ STORYBOOK_B: 'b', STORYBOOK_A: 'a' }, 'app/dev');

    expect(text.split('\n')[0]).toBe(MANAGED_MARKER);
    expect(text).toContain('"app/dev"');
    expect(text.endsWith("STORYBOOK_A='a'\nSTORYBOOK_B='b'\n")).toBe(true);
  });

  it('rejects a source that would break the header', () => {
    expect(() => toDotenv({}, 'a\nB=1')).toThrow(/secret id/);
  });

  // The Storybook Vite builder reads .env files with Vite's loadEnv, so every representable value
  // must come back unchanged.
  it('round-trips through Vite loadEnv', () => {
    const secrets = {
      STORYBOOK_PLAIN: 'https://api.example.com/v1?a=1&b=2',
      STORYBOOK_EMPTY: '',
      STORYBOOK_SPACES: '  padded  ',
      STORYBOOK_HASH: 'value # not a comment',
      STORYBOOK_DOLLAR: 'pa$$word $HOME ${PATH}',
      STORYBOOK_SINGLE: "it's",
      STORYBOOK_DOUBLE: 'say "hi"',
      STORYBOOK_BACKTICK: 'run `cmd`',
      STORYBOOK_BACKSLASH: 'C:\\temp\\new',
      STORYBOOK_MIXED: "it's `x` $y",
      STORYBOOK_QUOTE_BACKSLASH: "it's C:\\dir",
      STORYBOOK_LINES: 'line 1\nline 2\nline 3 $z',
      // Non-ASCII text (an accented letter and katakana), escaped to keep the source ASCII.
      STORYBOOK_UNICODE: 'caf\u00e9 \u30ab\u30bf\u30ed\u30b0',
    };
    dir = mkdtempSync(join(tmpdir(), 'secrets-'));
    writeFileSync(join(dir, '.env.local'), toDotenv(secrets, 'app/dev'));

    expect(loadEnv('development', dir, 'STORYBOOK_')).toEqual(secrets);
  });
});
