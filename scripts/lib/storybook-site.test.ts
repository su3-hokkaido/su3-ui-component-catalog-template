import { describe, expect, it } from 'vitest';
import {
  PORTAL_PLACEHOLDER,
  collectCleanUrls,
  escapeHtml,
  isValidProductId,
  renderPortal,
  sanitize,
  type StoryIndexEntry,
} from './storybook-site.ts';

function story(title: string, name: string, id: string): StoryIndexEntry {
  return { type: 'story', title, name, id };
}

function indexOf(...entries: StoryIndexEntry[]) {
  return { entries: Object.fromEntries(entries.map((entry) => [entry.id, entry])) };
}

describe('isValidProductId', () => {
  it.each(['sample', 'acme-web', 'app2'])('accepts %s', (productId) => {
    expect(isValidProductId(productId)).toBe(true);
  });

  it.each(['Sample', 'acme_web', '-acme', 'acme-', 'a--b', 'a b', ''])(
    'rejects "%s"',
    (productId) => {
      expect(isValidProductId(productId)).toBe(false);
    },
  );
});

describe('sanitize', () => {
  it('matches the segments Storybook puts into story ids', () => {
    expect(sanitize('Buttons')).toBe('buttons');
    expect(sanitize('IconButton')).toBe('iconbutton');
    expect(sanitize('Date Pickers')).toBe('date-pickers');
    expect(sanitize(' Form / Inputs! ')).toBe('form-inputs');
  });
});

describe('collectCleanUrls', () => {
  it('lists Default stories with their clean URLs, sorted by title', () => {
    const index = indexOf(
      story('Buttons/Toggle', 'Default', 'buttons-toggle--default'),
      story('Buttons/Toggle', 'Pressed', 'buttons-toggle--pressed'),
      { type: 'docs', title: 'Buttons/Toggle', name: 'Docs', id: 'buttons-toggle--docs' },
      story('Date Pickers/DateField', 'Default', 'date-pickers-datefield--default'),
      story('Actions/Button', 'Default', 'actions-button--default'),
    );

    expect(collectCleanUrls('sample', index)).toEqual([
      {
        title: 'Actions/Button',
        storyId: 'actions-button--default',
        path: '/sample/c/actions/button',
      },
      {
        title: 'Buttons/Toggle',
        storyId: 'buttons-toggle--default',
        path: '/sample/c/buttons/toggle',
      },
      {
        title: 'Date Pickers/DateField',
        storyId: 'date-pickers-datefield--default',
        path: '/sample/c/date-pickers/datefield',
      },
    ]);
  });

  it('rejects a title that does not have two segments', () => {
    const index = indexOf(story('Forms/Inputs/Text', 'Default', 'forms-inputs-text--default'));

    expect(() => collectCleanUrls('sample', index)).toThrow(/exactly two segments/);
  });

  it('rejects a story whose id does not match the redirect target', () => {
    const index = indexOf(story('Buttons/Toggle', 'Default', 'custom-id--default'));

    expect(() => collectCleanUrls('sample', index)).toThrow(
      /redirects to "buttons-toggle--default"/,
    );
  });
});

describe('renderPortal', () => {
  const template = `<main>\n${PORTAL_PLACEHOLDER}\n</main>`;

  it('links each product and its components', () => {
    const html = renderPortal(template, [
      {
        productId: 'sample',
        components: [
          {
            title: 'Buttons/Toggle',
            storyId: 'buttons-toggle--default',
            path: '/sample/c/buttons/toggle',
          },
        ],
      },
    ]);

    expect(html).toContain('<a href="/sample/">sample</a>');
    expect(html).toContain('<a href="/sample/c/buttons/toggle">Buttons/Toggle</a>');
    expect(html).not.toContain(PORTAL_PLACEHOLDER);
  });

  it('escapes text taken from story titles', () => {
    const html = renderPortal(template, [
      {
        productId: 'sample',
        components: [{ title: '<b>&"x"</b>', storyId: 'x', path: '/sample/c/x/y' }],
      },
    ]);

    expect(html).toContain('&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;');
  });

  it('keeps "$" sequences in titles literal', () => {
    const html = renderPortal(template, [
      { productId: 'sample', components: [{ title: "A/$'", storyId: 'x', path: '/p' }] },
    ]);

    expect(html).toContain('A/$&#39;');
  });

  it('requires the placeholder in the template', () => {
    expect(() => renderPortal('<main></main>', [])).toThrow(PORTAL_PLACEHOLDER);
  });
});

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});
