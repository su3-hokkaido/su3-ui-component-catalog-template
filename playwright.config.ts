import { defineConfig, devices } from '@playwright/test';

/**
 * Visual regression test (docs/project_plan.md section 11), run inside the Playwright image by
 * `make vrt` / `make vrt-update` against the built Storybook. Chromium only, one project per
 * viewport; the project names are the viewport names used by `parameters.vrt.viewports`.
 */
export default defineConfig({
  testDir: 'tests/vrt',
  testMatch: '*.spec.ts',
  // Baselines are always rendered on Linux in the same image, so no platform suffix.
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide' },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
