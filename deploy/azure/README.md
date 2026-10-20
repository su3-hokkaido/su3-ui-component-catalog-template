# Deploying to Azure Static Web Apps

An outline for replacing Cloudflare Pages (docs/project_plan.md section 8). It has not been run
against Azure; treat it as a starting point and check the current Azure documentation.

The build does not change: `pnpm run build-storybook:all` writes a static site to
`dist/storybook/` (the portal at `/`, one Storybook per product under `/{productId}/`). What has to
be replaced is the upload, the clean-URL redirect and the environments.

## Resources

- One Static Web App. Production is its default environment; a named preview environment
  (for example `develop`) serves the `develop` branch.
- A deployment token stored as a GitHub secret (or an OIDC-based deployment, if available for
  your setup).

## Clean URLs

`staticwebapp.config.json` routes match wildcards only at the end of a path and cannot copy path
segments into a redirect, so the `/{productId}/c/{category}/{component}` rule cannot be one
route. Generate one route per component instead, at build time, from the same data the portal
uses (`collectCleanUrls` in `scripts/lib/storybook-site.ts`):

```json
{
  "routes": [
    {
      "route": "/sample/c/buttons/toggle",
      "redirect": "/sample/?path=/story/buttons-toggle--default",
      "statusCode": 302
    }
  ]
}
```

Write the file to `dist/storybook/staticwebapp.config.json` in `scripts/build-storybook-all.ts`,
next to the portal, and test the generator like the existing helpers.

## Files to replace

- `deploy/cloudflare/` -> the generator above; `_redirects` is no longer needed.
- `.github/workflows/_deploy.yml`: `Azure/static-web-apps-deploy` with `app_location:
dist/storybook`, `skip_app_build: true`, the deployment token, `deployment_environment` set to
  the preview name for `develop`, and a skip condition on a repository variable instead of
  `CLOUDFLARE_PROJECT_NAME`.
- `scripts/secrets-push-cloudflare.sh` and its make targets: remove them, or replace them with
  `az staticwebapp appsettings set` if the app gains server-side functions.
