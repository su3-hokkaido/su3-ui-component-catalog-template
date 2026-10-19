/**
 * Visual regression test (docs/project_plan.md section 11). Every story in the built Storybook
 * (dist/storybook/{productId}, from `pnpm run build-storybook:all`) is captured in both themes, once
 * per viewport project. Stories are enumerated from each product's index.json, so a new story is
 * covered without editing this file. Run it with `make vrt` / `make vrt-update`, which use the
 * Playwright image so that rendering matches CI.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  collectVrtStories,
  expectedSnapshots,
  parseVrtParameters,
  snapshotName,
  THEMES,
  type Theme,
  type VrtStory,
  type VrtStoryIndex,
} from './stories.ts';

const siteDir = resolve(import.meta.dirname, '../../dist/storybook');
const screenshotsDir = resolve(import.meta.dirname, '__screenshots__');
// The built files are served from disk through request routing, so no web server is needed.
const origin = 'http://storybook.vrt';

function loadStories(): VrtStory[] {
  if (!existsSync(siteDir)) {
    throw new Error('dist/storybook is missing. Run `pnpm run build-storybook:all` first.');
  }
  const products = readdirSync(siteDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(siteDir, entry.name, 'index.json')))
    .map((entry) => ({
      productId: entry.name,
      index: JSON.parse(
        readFileSync(join(siteDir, entry.name, 'index.json'), 'utf8'),
      ) as VrtStoryIndex,
    }));
  if (products.length === 0) {
    throw new Error('dist/storybook contains no Storybook build.');
  }
  return collectVrtStories(products);
}

function listBaselines(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.png'))
    .map((file) => file.split('\\').join('/'));
}

/**
 * Opens a story and waits until Storybook has finished rendering it. Storybook has no public API
 * for this, so the preview's current render is read; an upgrade that changes it fails here.
 */
async function openStory(page: Page, story: VrtStory, theme: Theme): Promise<unknown> {
  await page.goto(
    `${origin}/${story.productId}/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`,
  );
  const phase = await page
    .waitForFunction(() => {
      const preview = (
        globalThis as { __STORYBOOK_PREVIEW__?: { currentRender?: { phase?: string } } }
      ).__STORYBOOK_PREVIEW__;
      const current = preview?.currentRender?.phase;
      return current === 'finished' || current === 'errored' || current === 'aborted'
        ? current
        : undefined;
    })
    .then((handle) => handle.jsonValue());
  expect(phase, `story ${story.id} failed to render`).toBe('finished');
  await expect(page.locator('body')).not.toHaveClass(/sb-show-errordisplay/);

  return page.evaluate(async () => {
    await document.fonts.ready;
    const preview = (
      globalThis as {
        __STORYBOOK_PREVIEW__?: {
          currentRender?: { story?: { parameters?: Record<string, unknown> } };
        };
      }
    ).__STORYBOOK_PREVIEW__;
    return preview?.currentRender?.story?.parameters?.vrt;
  });
}

/** The file under dist/storybook that a request URL points at, or undefined (served as 404). */
function siteFile(url: string): string | undefined {
  let path: string;
  try {
    path = decodeURIComponent(new URL(url).pathname);
  } catch {
    return undefined;
  }
  const file = resolve(siteDir, `.${path}`);
  const rel = relative(siteDir, file);
  if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`)) {
    return undefined;
  }
  return existsSync(file) && statSync(file).isFile() ? file : undefined;
}

const stories = loadStories();

test.beforeEach(async ({ context }) => {
  await context.route(`${origin}/**`, async (route) => {
    const file = siteFile(route.request().url());
    await (file ? route.fulfill({ path: file }) : route.fulfill({ status: 404 }));
  });
});

for (const story of stories) {
  for (const theme of THEMES) {
    test(`${story.scope} ${story.id} ${theme}`, async ({ page }, testInfo) => {
      const vrt = parseVrtParameters(await openStory(page, story, theme));
      test.skip(vrt.disable, 'parameters.vrt.disable');
      test.skip(
        !vrt.viewports.some((viewport) => viewport === testInfo.project.name),
        'not in parameters.vrt.viewports',
      );

      await expect(page).toHaveScreenshot(snapshotName(story, theme), { fullPage: true });
    });
  }
}

// Playwright requires the fixtures argument to be a destructuring pattern, even when it is unused.
// eslint-disable-next-line no-empty-pattern
test('has no baseline without a story', ({}, testInfo) => {
  const expected = expectedSnapshots(stories);
  const orphans = listBaselines(join(screenshotsDir, testInfo.project.name)).filter(
    (file) => !expected.has(file),
  );

  expect(
    orphans,
    `Delete the baselines of removed or renamed stories under tests/vrt/__screenshots__/${testInfo.project.name}/`,
  ).toEqual([]);
});
