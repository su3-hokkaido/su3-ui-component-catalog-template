[English](./README.md)

# su3-ui-component-catalog-template

Storybook ベースの UI コンポーネントカタログのテンプレートです。Tailwind CSS v4 でスタイルした
React + TypeScript のコンポーネント、プロダクトごとの Storybook と Cloudflare Pages へのデプロイ、
Docker で動くビジュアルリグレッションテスト、Changesets による npm パッケージの公開を備えています。

フォークするか GitHub のテンプレートとして使えば、新しい組織のコンポーネントカタログをすぐに
始められます。サンプルのコンポーネントがビルド、テスト、デプロイ、公開まで通る状態で動きます。

- プロダクト（`productId`）ごとに Storybook を作ります。共通コンポーネントはどのビルドにも入り、
  ポータルページがプロダクトを一覧します。
- どのコンポーネントにも短い URL があります: `/{productId}/c/{category}/{component}`。
- コンポーネントのクラスには `uic:` が付くので、利用側の Tailwind CSS やスタイルと衝突しません。
  ビルド済み CSS としても、利用側の Tailwind 向けのデザイントークンとしても配布します。
- `make` を入口にした Docker 前提の開発で、ローカルと CI で同じチェックが走ります。
- すべてのストーリーを、ライトとダークのテーマ、デスクトップとモバイルで Playwright により
  ビジュアルリグレッションテストします。

## 技術スタック

| 領域                           | ツール                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| UI                             | React 19, TypeScript 6 (`strict`)                                                           |
| スタイル                       | Tailwind CSS 4（CSS-first の `@theme` トークン、プレフィックス `uic`、preflight なし）、cva |
| カタログ                       | Storybook 10（Vite ビルダー、a11y・docs・themes アドオン）                                  |
| ユニットテスト                 | Vitest + React Testing Library (jsdom)                                                      |
| ビジュアルリグレッションテスト | 公式 Docker イメージ上の Playwright (`linux/amd64`)                                         |
| Lint / フォーマット            | ESLint 10 (flat config), Prettier                                                           |
| ライブラリビルド               | tsdown（ESM + CJS + 型定義）、`styles.css` は Tailwind CLI                                  |
| ランタイム / パッケージ        | Node.js 26 (`.nvmrc`, `devEngines`), pnpm 12 (`packageManager`)                             |
| 開発環境                       | Docker + docker compose, Makefile                                                           |
| デプロイ                       | Cloudflare Pages（GitHub Actions から Wrangler で direct upload）                           |
| リリース                       | Changesets, GitHub Releases, npm Trusted Publishing                                         |
| シークレット                   | AWS Secrets Manager（正とする保管先）、任意で Cloudflare Pages にも登録                     |

## クイックスタート

必要なもの: Docker（macOS と Windows では Docker Desktop）と `make`。ホストに Node.js は
不要です。AWS CLI v2 はシークレット関連のコマンドを使うときだけ必要です。

```sh
make setup   # copy .env.*.sample, build the image, install dependencies
make dev     # Storybook for PRODUCT_ID=sample at http://localhost:5070
```

日常的に使うその他のコマンド:

```sh
make dev PRODUCT_ID=sample   # Storybook for one product (default: sample)
make preview                 # every product, built and served by nginx at http://localhost:5071
make ci                      # the checks CI runs: format, lint, types, tests, builds
make vrt                     # visual regression test in the Playwright image
```

ポートと既定のプロダクトは `.env.docker`（`DEV_PORT`、`PREVIEW_PORT`、`PRODUCT_ID`）で設定します。
ホストに Node.js 26 と pnpm があれば、ほとんどのコマンドに `local-` 版があります（例:
`make local-dev`。`make help` に一覧）。VRT は常に Docker で実行します。

## プロジェクト構成

```
.
├── .changeset/          # pending changesets and the Changesets config
├── .github/             # workflows (CI, VRT, deploy, release), setup action, templates
├── .storybook/          # Storybook config; PRODUCT_ID selects the stories
├── deploy/
│   ├── cloudflare/      # _redirects (clean URLs) and deploy.sh
│   ├── local/           # nginx.conf for make preview (same rules as Cloudflare)
│   ├── aws/             # notes for S3 + CloudFront
│   └── azure/           # notes for Azure Static Web Apps
├── docs/                # project_plan.md and per-task design.md / task.md
├── portal/              # page listing every product, served at /
├── scripts/             # Storybook site build, new-product, package checks, secrets
├── src/
│   ├── lib/             # cn() and the class prefix
│   ├── styles/          # theme.css (tokens) and the Tailwind entries
│   ├── shared/          # components in every product
│   │   └── components/{category}/{Component}/
│   ├── products/
│   │   └── sample/      # one directory per productId
│   │       └── components/{category}/{Component}/
│   └── index.ts         # package root: re-exports src/shared
└── tests/vrt/           # Playwright suite and the committed baselines
```

### プロダクト

`productId` は `src/products/` の下のディレクトリです（小文字のケバブケース、例: `acme-web`）。
プロダクトごとに、`src/shared` とそのプロダクトを含む Storybook が `dist/storybook/{productId}/` に
ビルドされ、パッケージのサブパス（`su3-ui-component-catalog-template/{productId}`）も用意されます。
`/` のポータルがすべてのプロダクトとそのコンポーネントを一覧します。

依存の向き（ESLint で強制）: プロダクトは `src/shared` から import できます。`src/shared` は
プロダクトから import しません。プロダクト同士も import し合いません。

### URL とストーリーの命名

- どのコンポーネントにも `Default` ストーリーを開くクリーン URL があります:
  `/{productId}/c/{category}/{component}`（例: `/sample/c/buttons/toggle`）。`make preview`（nginx）と
  Cloudflare Pages（`_redirects`）で使えます。`make dev` では Storybook 本来の URL を使います。
- ストーリーの `title` は `{Category}/{Component}`（例: `Buttons/Toggle`）で、productId は
  含めません。どのストーリーファイルも `Default` ストーリーを export します。
- URL のセグメントは Storybook がサニタイズした ID で、小文字になり、英数字以外は `-` に
  置き換わります。タイトル `Buttons/IconButton` は `/sample/c/buttons/iconbutton` になります。
- タイトルはビルド内で一意である必要があるため、プロダクトは `src/shared` のタイトルを
  再利用できません。重複すると `make ci` が失敗します。

### コンポーネントの追加

コンポーネントのディレクトリにはちょうど 4 つのファイルを置きます。例:
`src/products/sample/components/buttons/Toggle/`

```
Toggle.tsx           # the component: uic: classes, cn(), cva variants, className prop
Toggle.stories.tsx   # title 'Buttons/Toggle', with a Default story
Toggle.test.tsx      # Vitest + React Testing Library
index.ts             # re-export
```

そのうえで、コンポーネントを `src/shared/index.ts` または `src/products/{productId}/index.ts` から
re-export します。スタイルのルール: Tailwind のユーティリティだけを使い、必ず `uic:` を付けます。
色、余白、角丸、フォントは `src/styles/theme.css` のトークンから取ります。`bg-[#123456]` のような
任意値は使いません。preflight に頼らず、`uic:border` には `uic:border-solid` を組み合わせます。
`make ci` がディレクトリ構成、タイトル、export を検査します。

Claude Code では `/new-component` が 4 つのファイルと export を作成します。詳しい規約と
チェックリスト（ベースライン、changeset、`make ci`）は `CLAUDE.md` にあります。

### ビジュアルリグレッションテスト

`make vrt` はすべての Storybook をビルドし、`linux/amd64` に固定した公式イメージで Playwright を
実行するので、ローカルと CI で描画が一致します。各プロダクトの `index.json` にあるすべての
ストーリーを、ライトとダークのテーマで `desktop`（1280x720）と `mobile`（Pixel 7）について撮影します。
共通のストーリーは 1 回だけ撮影します。ストーリーごとに除外したり、ビューポートを絞ったりできます:

```tsx
export const Animated: Story = {
  parameters: { vrt: { viewports: ['desktop'] } }, // or { disable: true }
};
```

ベースライン画像は `tests/vrt/__screenshots__/{viewport}/{shared|productId}/` にコミットします。

- 見た目を変えたときやストーリーを追加したときは、`make vrt-update` を実行して変わった画像を
  コミットします。
- 削除または改名したストーリーのベースラインは消してください（残っているとテストが失敗します）。
  `parameters.vrt` で除外したストーリーやビューポートの画像も同様です。
- **レビュー**: ベースラインを変更するプルリクエストは、画像の差分をレビューしてください
  （"Files changed" の GitHub の画像差分表示）。CI で VRT が失敗したときは `vrt-report` artifact を
  ダウンロードし、`playwright-report/index.html` で期待画像、実際の画像、差分を確認します。

## テンプレートの使い方

"Use this template" またはフォークのあとは、以下の項目を順に進めてください。全体の仕様と
各判断の理由は `docs/project_plan.md` にあります。

### パッケージ名とスコープの変更

`su3-ui-component-catalog-template`（例: `@acme/ui` に変更）を次の場所で置き換えます:

- `package.json`: `name` と `repository`（npm は provenance がそこに書かれたリポジトリから来たかを
  検証します）。あわせて `description`、番号を振り直すなら `version`。
- `README.md` と `README_JA.md`: タイトルとすべての import 例。
- `.changeset/*.md`: 未適用の changeset に書かれたパッケージ名（例:
  `.changeset/initial-release.md`）。
- `.env.docker.sample`: `AWS_SECRET_ID` の例。
- `LICENSE`: 著作権者。`.github/CODEOWNERS`: オーナー。
- GitHub のリポジトリ変数: `NPM_PUBLISH_REPOSITORY`（自分の `owner/repo`）と
  `CLOUDFLARE_PROJECT_NAME`（後述）。
- 独自にしたい場合は Tailwind のプレフィックス（次の項目）。

パッケージは npm に公開（public）されます（`.changeset/config.json` の `access: public`）。
代わりに GitHub Packages で非公開にする場合:

1. GitHub の組織でスコープした名前（例: `@acme/ui`）にし、`package.json` に追加します:

   ```json
   {
     "publishConfig": { "registry": "https://npm.pkg.github.com" }
   }
   ```

2. `.changeset/config.json` の `access` を `restricted` にします。
3. `release.yml` でジョブに `packages: write` を与え、Changesets のステップに
   `NODE_AUTH_TOKEN: ${{ github.token }}` を渡し、レジストリ用の `.npmrc` を用意します。
   GitHub Packages は npm Trusted Publishing を使わないので、`id-token: write` は不要になります。
4. 利用側は `.npmrc` に `@acme:registry=https://npm.pkg.github.com` とトークンを追加します。

### Tailwind のプレフィックスの変更

プレフィックス `uic` は、ライブラリのクラスと CSS 変数を利用側のものと分けるためのものです。
独自のもの（例: `acme`）にするには:

1. `src/lib/prefix.ts`: `CLASS_PREFIX`。
2. `src/styles/index.css` と `src/styles/package.css`: Tailwind の import にある `prefix(uic)`。
3. `src/styles/theme.css` と `.storybook/preview.css`: `--uic-*` の変数。
4. `src/` 内のすべての `uic:` クラス（`uic:` を検索して置換）。
5. README と README_JA の利用側スニペット、`CLAUDE.md`、`.claude/agents/`、`.claude/skills/` の規約。

`src/lib/prefix.ts` とスタイルシートのプレフィックスが食い違うと `make ci` が失敗します。
プレフィックスは描画を変えないので、VRT のベースラインはそのまま使えます。

### productId の追加

```sh
make new-product PRODUCT_ID=acme-web
```

`src/products/acme-web/index.ts` を作成し、`package.json` の `exports` に `./acme-web` サブパスを
追加します。Storybook、ポータル、ESLint の依存ルール、パッケージのビルド、VRT は新しいプロダクトを
自動的に扱います。あとはコンポーネントを追加し、`make dev PRODUCT_ID=acme-web` を実行します。

### Cloudflare の設定

ワークフローは `develop` を Cloudflare Pages のプレビューに、`main` を本番にデプロイします。
`CLOUDFLARE_PROJECT_NAME` が設定されるまではデプロイジョブが notice を出してスキップされるので、
テンプレートから作った直後のリポジトリでも設定なしで CI が通ります。

1. 本番ブランチを `main` にして Pages プロジェクトを一度だけ作成します。ダッシュボード
   （Workers & Pages > Create > Pages > Direct Upload）か、シェルに API トークンを設定した
   Wrangler で作ります:

   ```sh
   npx wrangler pages project create <project-name> --production-branch main
   ```

2. 権限 Account / Cloudflare Pages / Edit の API トークンを作成します。
3. GitHub リポジトリで次を設定します:
   - Environments: `development` と `production`（必要に応じて `production` に保護ルールを追加）。
   - Secrets: `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID`（リポジトリまたは environment
     レベル）。
   - Variable: `CLOUDFLARE_PROJECT_NAME`（リポジトリレベル。デプロイジョブの実行条件は environment が
     適用される前に評価されるため）。
   - `main` と `develop` のブランチ保護: プルリクエスト必須にし、CI と VRT を必須チェックにします。
     デプロイは push で走り、CI を待ちません。

これで `develop` は `https://develop.<project-name>.pages.dev`、`main` は
`https://<project-name>.pages.dev` で公開されます。カスタムドメインは Cloudflare のダッシュボード
（Workers & Pages > プロジェクト > Custom domains）か API で追加し、リポジトリ側の変更は不要です。

クリーン URL のルールは `deploy/cloudflare/_redirects` で、ビルドにコピーされます。
`deploy/local/nginx.conf` と揃えておいてください。

### シークレットストアの選択

静的な Storybook ではシークレットはほとんど要らないため、テンプレートは仕組みだけを用意して
います。Cloudflare のシークレットは読み出せないので、AWS Secrets Manager を正とします。

- 環境ごとに 1 つのシークレットを作り、値はフラットな JSON オブジェクト（コンソールのキー/値形式）
  にします。例: `{"STORYBOOK_API_URL": "https://api.example.com"}`。
- `AWS_PROFILE`、`AWS_REGION`、`AWS_SECRET_ID` を `.env.docker`（またはコマンドライン）で設定します。
- `make secrets-pull-aws` は必要なら `aws sso login` でサインインし、`.env.local`（権限 600）を
  書き出します。手書きの `.env.local` は `FORCE=1` なしでは置き換えません。
- 任意: `make secrets-push-cloudflare PAGES_ENV=preview`（または `production`）は、確認のあと同じ
  シークレットを Pages プロジェクトに登録します（`YES=1` で確認を省略でき、端末が無いときは必須）。
  `CLOUDFLARE_PROJECT_NAME` は AWS の設定と同じ方法で読み、`CLOUDFLARE_API_TOKEN` と
  `CLOUDFLARE_ACCOUNT_ID` はシェルの環境変数から読みます。

Storybook がストーリーに渡すのは `STORYBOOK_*` の変数だけで、これらはビルド後のサイトに埋め込まれ
ます。本物のシークレットは入れないでください。

別のストア（1Password、Doppler など）を使う場合は、`scripts/secrets-pull-aws.sh`
（`scripts/lib/aws-secrets.sh`）の取得処理をそのストアの CLI に置き換え、JSON を `.env.local` に
変換する `scripts/secrets-to-env.ts` はそのまま使います。どちらの場合も CI の認証情報は GitHub
Secrets に置きます。

### デプロイ先を AWS / Azure に切り替える

デプロイ固有の処理は `deploy/cloudflare/` と `.github/workflows/_deploy.yml` にまとまっており、
ビルド（静的サイトの `dist/storybook`）は変わりません。切り替えるには、デプロイスクリプトと
再利用ワークフローを置き換え、クリーン URL のルールを移植します。概要:

- [deploy/aws/README.md](./deploy/aws/README.md): Amazon S3 + CloudFront。
- [deploy/azure/README.md](./deploy/azure/README.md): Azure Static Web Apps。

## 公開パッケージのインストール

```sh
pnpm add su3-ui-component-catalog
```

peer dependencies: `react` と `react-dom` 19。`tailwindcss` 4.3 以上は、後述する 2 つ目の CSS
パターンでだけ必要です。

```tsx
import { Button } from 'su3-ui-component-catalog'; // shared components
import { Toggle } from 'su3-ui-component-catalog/sample'; // the sample product

export function Example() {
  return (
    <>
      <Button variant="secondary">Cancel</Button>
      <Toggle defaultPressed>Bold</Toggle>
    </>
  );
}
```

パッケージは ESM と CJS を型定義付きで配布し、JavaScript の先頭に `'use client'` があるので、
Next.js App Router のサーバーコンポーネントから直接 import できます。

### パターン 1: ビルド済み CSS（Tailwind を使わないプロジェクト）

アプリのエントリーやルートレイアウトなどで、スタイルシートを一度だけ import します:

```ts
import 'su3-ui-component-catalog/styles.css';
```

コンポーネントが使うクラス、デザイントークン、ダークテーマだけを含みます。リセット（preflight）
は含まないので、ページのほかの部分を変えません。

### パターン 2: 自前の Tailwind CSS（すでに Tailwind を使っているプロジェクト）

Tailwind のプレフィックスはコンパイル単位で効くため、利用側の Tailwind ビルドではライブラリの
`uic:` クラスを生成できません。ライブラリ用に別の CSS エントリーを用意し、自分の Tailwind の
エントリーと並べて import します:

```css
/* ui-catalog.css (separate from the app's own Tailwind entry) */
@layer theme, utilities;
@import 'tailwindcss/theme.css' layer(theme) prefix(uic);
@import 'tailwindcss/utilities.css' layer(utilities) prefix(uic) source(none);
@import 'su3-ui-component-catalog/theme.css';
@source '../node_modules/su3-ui-component-catalog/dist';
```

`@source` のパスは、このファイルから `node_modules` への相対位置に合わせてください。ファイルは
必ず分けます。ライブラリの `theme.css` は既定のパレットをリセット（`--color-*: initial`）するので、
1 つのコンパイルにまとめると `bg-red-500` のような利用側の色まで消えてしまいます。どちらの
パターンも Vite と Next.js で確認済みです（詳細は `docs/2026-10-18_03_phase4-package-build/design.md`）。

### ダークモード

`dark` クラスを持つ要素の内側でコンポーネントはダークテーマになります。例: `<html class="dark">`。

## リリースの流れ

バージョンは SemVer に従い Changesets で管理します。タグは `vX.Y.Z` です。

1. 公開パッケージに影響する feature ブランチ（`develop` から切った `feature/...`）は changeset を
   追加します: `make changeset` を実行し、major、minor、patch のどれかを選んで変更内容を書きます。
2. プルリクエストを `develop` にマージします（プレビューにデプロイされます）。
3. リリース用のプルリクエストで `develop` を `main` にマージします（本番にデプロイされます）。
4. `main` で `release.yml` が "chore: version packages" プルリクエストを作成または更新し、
   バージョンの更新と `CHANGELOG.md` を入れます。
5. それをマージすると `vX.Y.Z` タグと GitHub Release が作られ、npm Trusted Publishing で npm に
   公開されます（npm トークンは保存しません）。
6. 続いてワークフローが `main` を `develop` に戻すプルリクエストを作ります。両方のブランチに
   バージョン更新が残るよう、マージコミットでマージしてください。

リポジトリのオーナーが一度だけ行う設定:

- GitHub: Settings > Actions > General で、GitHub Actions によるプルリクエストの作成と承認を許可します。
- 既定の `GITHUB_TOKEN` で作ったプルリクエストでは CI が走りません。バージョン更新と戻しの
  プルリクエストでも CI を走らせる必要があるなら、`RELEASE_TOKEN` シークレット（GitHub App の
  トークン、または contents と pull-requests に write 権限を持つ fine-grained トークン）を追加します。
- npm: trusted publisher はすでに存在するパッケージにしか追加できないので、最初のバージョンだけ
  手動で公開します（二要素認証が必要）。`main` をクリーンにチェックアウトし、ホストの Node.js 26 と
  pnpm で実行します:

  ```sh
  pnpm install --frozen-lockfile
  pnpm run build
  pnpm publish
  ```

  スコープ付きの名前（例: `@acme/ui`）では、この初回公開に `pnpm publish --access public` が
  必要です。そのあと npmjs.com でパッケージに trusted publisher（このリポジトリ、ワークフロー
  `release.yml`、environment なし）を追加し、リポジトリ変数 `NPM_PUBLISH_REPOSITORY` に
  `owner/repo` を設定します。公開はそのリポジトリでだけ動くので、フォークやテンプレートから
  作ったリポジトリが公開することはありません。

## Make コマンド

`make help` ですべてのターゲットを一覧できます。`PRODUCT_ID` などの設定は
`make <target> NAME=value` の形で渡します。

| コマンド                        | 説明                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| `make setup`                    | `.env.*.sample` をコピー（上書きしない）し、イメージをビルドして依存をインストール            |
| `make dev`                      | `PRODUCT_ID`（既定 `sample`）の Storybook 開発サーバー（http://localhost:5070）               |
| `make up` / `make down`         | 開発サーバーをバックグラウンドで起動 / すべてのコンテナを停止                                 |
| `make logs`                     | 開発サーバーのログを追跡                                                                      |
| `make shell`                    | 使い捨てコンテナのシェル                                                                      |
| `make preview`                  | すべてのプロダクトをビルドし nginx で配信（http://localhost:5071）                            |
| `make install`                  | 依存をインストール。`PKG="name"`（または `PKG="-D name"`）で 1 つを厳密なバージョンで追加     |
| `make lint` / `make format`     | ESLint / Prettier（書き込み）                                                                 |
| `make typecheck`                | TypeScript                                                                                    |
| `make test` / `make test-watch` | カバレッジ付きの Vitest / ウォッチモード                                                      |
| `make build`                    | パッケージを `dist` にビルド（tsdown、`styles.css`、`theme.css`）                             |
| `make build-storybook`          | 全プロダクト（または `PRODUCT_ID` だけ）の Storybook とポータルをビルド                       |
| `make ci`                       | CI と同じチェック: フォーマット、lint、型、テスト、パッケージのビルドと検査、Storybook        |
| `make vrt`                      | Playwright イメージでビジュアルリグレッションテスト                                           |
| `make vrt-update`               | 変わった、または存在しないベースラインを更新                                                  |
| `make new-product`              | `src/products/PRODUCT_ID` とパッケージの export を作成                                        |
| `make changeset`                | changeset を追加                                                                              |
| `make secrets-pull-aws`         | AWS Secrets Manager から `.env.local` を生成                                                  |
| `make secrets-push-cloudflare`  | そのシークレットを Cloudflare Pages に登録（`PAGES_ENV=production\|preview`）。リモートを変更 |
| `make clean`                    | コンテナ、`node_modules` ボリューム、ビルドしたイメージを削除                                 |
| `make local-<target>`           | Docker の代わりにホストで同じことを実行（`make help` に一覧）                                 |

## ライセンス

[MIT](./LICENSE)
