/**
 * Pure helpers for the multi-product Storybook site (docs/project_plan.md section 4): productId
 * validation, clean-URL derivation from Storybook's index.json and portal rendering. They have no
 * file system access so that they can be unit-tested; scripts/build-storybook-all.ts does the I/O.
 */

/** productIds are URL path segments and directory names, so they are lower-case kebab-case. */
const PRODUCT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Marker in portal/index.html that is replaced with the generated product list. */
export const PORTAL_PLACEHOLDER = '<!-- products -->';

export function isValidProductId(productId: string): boolean {
  return PRODUCT_ID_PATTERN.test(productId);
}

/**
 * Same rules Storybook uses to turn a title or story name into an id segment: lower-case,
 * punctuation and spaces become `-`, repeated and surrounding dashes are removed.
 */
export function sanitize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/** The subset of a Storybook index.json (v5) entry that is used here. */
export interface StoryIndexEntry {
  type: string;
  id: string;
  name: string;
  title: string;
}

export interface StoryIndex {
  entries: Record<string, StoryIndexEntry>;
}

/** A component reachable through `/{productId}/c/{category}/{component}`. */
export interface CleanUrlEntry {
  title: string;
  storyId: string;
  path: string;
}

/**
 * Lists every `Default` story of one product build with its clean URL. Throws when a title does not
 * map onto the redirect rule, because the clean URL would otherwise point at a missing story.
 */
export function collectCleanUrls(productId: string, index: StoryIndex): CleanUrlEntry[] {
  return Object.values(index.entries)
    .filter((entry) => entry.type === 'story' && entry.name === 'Default')
    .map((entry) => {
      const segments = entry.title.split('/');
      const [category, component] = segments.map(sanitize);
      if (segments.length !== 2 || !category || !component) {
        throw new Error(
          `Story title "${entry.title}" must have exactly two segments ({Category}/{Component}).`,
        );
      }
      // The redirect rule rebuilds the id as `{category}-{component}--default`.
      const expectedId = `${category}-${component}--default`;
      if (entry.id !== expectedId) {
        throw new Error(
          `Story "${entry.title}" has id "${entry.id}", but its clean URL redirects to "${expectedId}".`,
        );
      }
      return {
        title: entry.title,
        storyId: entry.id,
        path: `/${productId}/c/${category}/${component}`,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export interface PortalProduct {
  productId: string;
  components: CleanUrlEntry[];
}

/** Renders the product list and inserts it into the portal template. */
export function renderPortal(template: string, products: PortalProduct[]): string {
  if (!template.includes(PORTAL_PLACEHOLDER)) {
    throw new Error(`The portal template must contain ${PORTAL_PLACEHOLDER}.`);
  }
  const sections = products.map(({ productId, components }) => {
    const id = escapeHtml(productId);
    const items = components
      .map(
        (component) =>
          `          <li><a href="${escapeHtml(component.path)}">${escapeHtml(component.title)}</a></li>`,
      )
      .join('\n');
    return [
      '      <section class="product">',
      `        <h2><a href="/${id}/">${id}</a></h2>`,
      '        <ul>',
      items,
      '        </ul>',
      '      </section>',
    ].join('\n');
  });
  return template.replace(PORTAL_PLACEHOLDER, () => sections.join('\n'));
}
