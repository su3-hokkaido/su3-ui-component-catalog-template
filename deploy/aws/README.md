# Deploying to Amazon S3 + CloudFront

An outline for replacing Cloudflare Pages (docs/project_plan.md section 8). It has not been run
against AWS; treat it as a starting point and check the current AWS documentation.

The build does not change: `pnpm run build-storybook:all` writes a static site to
`dist/storybook/` (the portal at `/`, one Storybook per product under `/{productId}/`). What has to
be replaced is the upload, the clean-URL redirect and the environments.

## Resources

- One private S3 bucket per environment (preview and production), served only through
  CloudFront with Origin Access Control.
- One CloudFront distribution per environment, default root object `index.html`, with the
  function below on viewer requests.
- An IAM role for GitHub Actions trusted through OIDC (`token.actions.githubusercontent.com`),
  limited to the repository and branch, allowed to write the bucket and create invalidations.

## Clean URLs and directory indexes

S3 has no `_redirects`. A CloudFront Function (viewer request) can apply the same rule as
`deploy/cloudflare/_redirects` and `deploy/local/nginx.conf`, and add the `index.html` that S3
does not resolve for `/sample/`:

```js
function handler(event) {
  var request = event.request;
  var match = request.uri.match(/^\/([a-z0-9-]+)\/c\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/);
  if (match) {
    return {
      statusCode: 302,
      statusDescription: 'Found',
      headers: {
        location: {
          value: '/' + match[1] + '/?path=/story/' + match[2] + '-' + match[3] + '--default',
        },
      },
    };
  }
  if (request.uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!request.uri.split('/').pop().includes('.')) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: request.uri + '/' } },
    };
  }
  return request;
}
```

## Files to replace

- `deploy/cloudflare/` -> `deploy/aws/deploy.sh`: `aws s3 sync dist/storybook "s3://$BUCKET"
--delete --exclude _redirects`, then `aws cloudfront create-invalidation --paths '/*'`.
- `.github/workflows/_deploy.yml`: `permissions: id-token: write`,
  `aws-actions/configure-aws-credentials` with the role, the bucket and distribution per
  environment as variables, and a skip condition on those variables instead of
  `CLOUDFLARE_PROJECT_NAME`.
- `scripts/build-storybook-all.ts`: stop copying `_redirects`, or keep it and exclude it from the
  upload as above.
- `scripts/secrets-push-cloudflare.sh` and its make targets: remove them; a static site on S3 has
  no runtime secrets.
