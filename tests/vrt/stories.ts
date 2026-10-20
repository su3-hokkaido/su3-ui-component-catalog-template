/**
 * Pure helpers for the visual regression test (docs/project_plan.md section 11). They do not
 * import Playwright, so Vitest covers them; tests/vrt/stories.spec.ts wires them to the browser.
 */

/** Storybook globals for the theme addon (.storybook/preview.ts); every story is captured in both. */
export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** Playwright project names in playwright.config.ts. */
export const VIEWPORTS = ['desktop', 'mobile'] as const;
export type Viewport = (typeof VIEWPORTS)[number];

/** Directory name for stories under src/shared, which every product's Storybook contains. */
export const SHARED_SCOPE = 'shared';

/** The part of Storybook's index.json the VRT reads. */
export interface VrtStoryIndex {
  entries: Record<string, { id: string; type: string; importPath: string }>;
}

export interface VrtStory {
  /** Storybook build that serves the story (dist/storybook/{productId}). */
  productId: string;
  /** Baseline directory: `shared` or the productId. */
  scope: string;
  id: string;
}

/** Per-story settings from `parameters.vrt`. */
export interface VrtParameters {
  disable: boolean;
  viewports: readonly Viewport[];
}

/**
 * Every story to capture, sorted by scope and id. Docs entries are skipped. Shared stories appear
 * in every product's build, so they are captured once, from the first product.
 */
export function collectVrtStories(
  products: readonly { productId: string; index: VrtStoryIndex }[],
): VrtStory[] {
  const sharedProduct = [...products].map(({ productId }) => productId).sort()[0];
  const stories: VrtStory[] = [];

  for (const { productId, index } of products) {
    for (const entry of Object.values(index.entries)) {
      if (entry.type !== 'story') {
        continue;
      }
      const shared = entry.importPath.startsWith('./src/shared/');
      if (shared && productId !== sharedProduct) {
        continue;
      }
      stories.push({ productId, scope: shared ? SHARED_SCOPE : productId, id: entry.id });
    }
  }

  return stories.sort((a, b) => a.scope.localeCompare(b.scope) || a.id.localeCompare(b.id));
}

/** Baseline path segments below tests/vrt/__screenshots__/{viewport}/. */
export function snapshotName(story: VrtStory, theme: Theme): [string, string] {
  return [story.scope, `${story.id}-${theme}.png`];
}

/** Every baseline the stories can produce for one viewport, as `{scope}/{file}` paths. */
export function expectedSnapshots(stories: readonly VrtStory[]): Set<string> {
  return new Set(
    stories.flatMap((story) => THEMES.map((theme) => snapshotName(story, theme).join('/'))),
  );
}

/**
 * Validates `parameters.vrt` (`{ disable?: boolean; viewports?: Viewport[] }`). A typo would
 * otherwise silently capture or skip the story, so anything unexpected throws.
 */
export function parseVrtParameters(value: unknown): VrtParameters {
  if (value === undefined) {
    return { disable: false, viewports: VIEWPORTS };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('parameters.vrt must be an object.');
  }

  const { disable = false, viewports = VIEWPORTS, ...rest } = value as Record<string, unknown>;
  const unknownKeys = Object.keys(rest);
  if (unknownKeys.length > 0) {
    throw new Error(`Unknown parameters.vrt keys: ${unknownKeys.join(', ')}.`);
  }
  if (typeof disable !== 'boolean') {
    throw new Error('parameters.vrt.disable must be a boolean.');
  }
  if (
    !Array.isArray(viewports) ||
    viewports.length === 0 ||
    !viewports.every((viewport) => VIEWPORTS.includes(viewport as Viewport))
  ) {
    throw new Error(
      `parameters.vrt.viewports must be a non-empty array of ${VIEWPORTS.join(', ')}.`,
    );
  }

  return { disable, viewports: viewports as Viewport[] };
}
