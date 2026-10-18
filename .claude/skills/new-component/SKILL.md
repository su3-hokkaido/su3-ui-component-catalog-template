---
name: new-component
description: Scaffold a new UI component (component, story, test, index) in src/shared or a product, and wire its export, following this project's conventions. Use when the user asks to add, create or scaffold a component, e.g. "add a Toggle to sample" or "create a shared Badge".
---

# new-component

Create a component directory that satisfies the checklist in `docs/project_plan.md` §13, so that
it builds, appears in Storybook, has a clean URL, is covered by the VRT, and is exported from the
package.

## Inputs

Determine these from the request; ask only if one cannot be inferred:

- **scope**: `shared` or a productId (must exist under `src/products/`; otherwise suggest
  `make new-product PRODUCT_ID=...` first).
- **category**: lower-case kebab-case directory, e.g. `buttons`, `forms`, `feedback`.
- **Component**: PascalCase name, e.g. `Toggle`.

Derived values:

- Base directory: `src/shared` or `src/products/{productId}`.
- Directory: `{base}/components/{category}/{Component}/`.
- Story title: `{Category}/{Component}` where `{Category}` is the category in title case
  (`buttons` -> `Buttons`, `date-pickers` -> `Date Pickers`).
- Clean URL: `/{productId}/c/{category-id}/{component-id}`, where the IDs are Storybook's sanitized
  forms (lower-case, non-alphanumerics to `-`). Tell the user the resulting URL.

## Steps

1. Check that the title is unused: grep for `title: '{Category}/{Component}'` in `src/shared` and in
   the target product. Stop and ask if it exists.
2. Check the tokens available in `src/styles/theme.css` (`@theme`). If the component needs a value
   that has no token, add the token there first.
3. Create the four files, following the existing sample components (`src/shared/components/actions/Button`
   and `src/products/sample/components/buttons/Toggle`) when they exist; otherwise use these
   shapes:

   `{Component}.tsx`
   ```tsx
   import { cva, type VariantProps } from 'class-variance-authority';
   import type { ComponentPropsWithoutRef } from 'react';
   import { cn } from '<relative path>/lib/cn';

   const toggleVariants = cva('uic:inline-flex uic:items-center uic:rounded-md', {
     variants: {
       size: {
         sm: 'uic:h-8 uic:px-3 uic:text-sm',
         md: 'uic:h-10 uic:px-4 uic:text-base',
       },
     },
     defaultVariants: { size: 'md' },
   });

   /** Props for {@link Toggle}. */
   export interface ToggleProps
     extends ComponentPropsWithoutRef<'button'>,
       VariantProps<typeof toggleVariants> {}

   /** A two-state button. */
   export function Toggle({ className, size, ...props }: ToggleProps) {
     return <button className={cn(toggleVariants({ size }), className)} {...props} />;
   }
   ```

   `{Component}.stories.tsx`
   ```tsx
   import type { Meta, StoryObj } from '@storybook/react-vite';
   import { Toggle } from './Toggle';

   const meta = {
     title: 'Buttons/Toggle',
     component: Toggle,
   } satisfies Meta<typeof Toggle>;

   export default meta;
   type Story = StoryObj<typeof meta>;

   /** Required: clean URLs point at the Default story. */
   export const Default: Story = { args: { children: 'Toggle' } };
   ```

   `{Component}.test.tsx`: Vitest + React Testing Library. Query by role or label, and cover the
   behavior of each variant and state that matters.

   `index.ts`
   ```ts
   export { Toggle, type ToggleProps } from './Toggle';
   ```

   Use the Storybook framework package and type imports that the repository already uses
   (check `.storybook/main.ts`); confirm current APIs with Context7 if unsure.
4. Re-export from the scope's `index.ts` (`src/shared/index.ts` or
   `src/products/{productId}/index.ts`).
5. Run `make lint typecheck test` and fix failures. Then run `make vrt-update` to create the
   baseline images for the new stories, and tell the user which baseline files were added.
6. Mention to the user that a changeset is needed if this is a user-visible addition
   (`make changeset`, minor).

## Rules

- All Tailwind utilities use the `uic:` prefix; no arbitrary values, inline styles or CSS files.
- Do not rely on preflight (e.g. pair `uic:border` with `uic:border-solid`).
- Do not import from another product; `shared` never imports from products.
- English for all code and comments; no emojis. Respond to the user in Japanese.
