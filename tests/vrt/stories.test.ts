import { describe, expect, it } from 'vitest';
import {
  collectVrtStories,
  expectedSnapshots,
  parseVrtParameters,
  snapshotName,
  VIEWPORTS,
  type VrtStoryIndex,
} from './stories.ts';

function index(...entries: [id: string, type: string, importPath: string][]): VrtStoryIndex {
  return {
    entries: Object.fromEntries(
      entries.map(([id, type, importPath]) => [id, { id, type, importPath }]),
    ),
  };
}

const button = './src/shared/components/actions/Button/Button.stories.tsx';

describe('collectVrtStories', () => {
  it('captures shared stories once, from the first product, and skips docs entries', () => {
    const stories = collectVrtStories([
      {
        productId: 'zeta',
        index: index(
          ['actions-button--default', 'story', button],
          [
            'cards-card--default',
            'story',
            './src/products/zeta/components/cards/Card/Card.stories.tsx',
          ],
        ),
      },
      {
        productId: 'alpha',
        index: index(
          ['actions-button--docs', 'docs', button],
          ['actions-button--secondary', 'story', button],
          ['actions-button--default', 'story', button],
          [
            'buttons-toggle--default',
            'story',
            './src/products/alpha/components/buttons/Toggle/Toggle.stories.tsx',
          ],
        ),
      },
    ]);

    expect(stories).toEqual([
      { productId: 'alpha', scope: 'alpha', id: 'buttons-toggle--default' },
      { productId: 'alpha', scope: 'shared', id: 'actions-button--default' },
      { productId: 'alpha', scope: 'shared', id: 'actions-button--secondary' },
      { productId: 'zeta', scope: 'zeta', id: 'cards-card--default' },
    ]);
  });

  it('returns nothing without products', () => {
    expect(collectVrtStories([])).toEqual([]);
  });
});

describe('snapshotName and expectedSnapshots', () => {
  const story = { productId: 'sample', scope: 'shared', id: 'actions-button--default' };

  it('names a baseline by scope, story and theme', () => {
    expect(snapshotName(story, 'dark')).toEqual(['shared', 'actions-button--default-dark.png']);
  });

  it('lists both themes for every story', () => {
    expect([...expectedSnapshots([story])]).toEqual([
      'shared/actions-button--default-light.png',
      'shared/actions-button--default-dark.png',
    ]);
  });
});

describe('parseVrtParameters', () => {
  it('captures every viewport by default', () => {
    expect(parseVrtParameters(undefined)).toEqual({ disable: false, viewports: VIEWPORTS });
    expect(parseVrtParameters({})).toEqual({ disable: false, viewports: VIEWPORTS });
  });

  it('reads disable and viewports', () => {
    expect(parseVrtParameters({ disable: true })).toEqual({ disable: true, viewports: VIEWPORTS });
    expect(parseVrtParameters({ viewports: ['mobile'] })).toEqual({
      disable: false,
      viewports: ['mobile'],
    });
  });

  it.each([
    ['a non-object', true, 'must be an object'],
    ['null', null, 'must be an object'],
    ['an array', [], 'must be an object'],
    ['an unknown key', { disabled: true }, 'Unknown parameters.vrt keys: disabled'],
    ['a non-boolean disable', { disable: 'yes' }, 'disable must be a boolean'],
    ['an unknown viewport', { viewports: ['tablet'] }, 'viewports must be a non-empty array'],
    ['no viewport', { viewports: [] }, 'viewports must be a non-empty array'],
    ['a string viewport', { viewports: 'mobile' }, 'viewports must be a non-empty array'],
  ])('rejects %s', (_case, value, message) => {
    expect(() => parseVrtParameters(value)).toThrow(message);
  });
});
