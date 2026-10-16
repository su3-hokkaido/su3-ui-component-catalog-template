# UI Catalog Template — Context for Claude Code

> このファイルは Claude Code に UI カタログリポジトリのテンプレートを実装させるためのコンテキスト（仕様書）です。
> リポジトリ内の成果物（コード・コメント・ドキュメント）はすべて **英語** で作成すること。ただし `README_JA.md` のみ日本語。
> 「✅ 決定事項」と書かれた箇所は、元の素案から変更・補足し、オーナーの承認を得た点です。この内容に従って実装してください。

---

## 1. Goal / Purpose

- **Goal**: UI/UX コンポーネントを束ねるカタログリポジトリ（Storybook ベース）のテンプレートを作成する。
- **Purpose**: 業務委託・正社員として新しい組織に参画した際に、Fork してすぐ導入できる「テンプレート兼サンプル」として使う。
- **Distribution**:
  - リポジトリは Public（GitHub Template Repository として設定）。
  - テンプレート状態のままでもパッケージとしてインストールできるよう、npm に OSS として公開する。
- **License**: MIT（✅ 決定事項：OSS 公開のため明示的に追加）

---

## 2. Tech Stack

| Category | Tool | Notes |
|---|---|---|
| Hosting | GitHub | Template repository, Actions, Releases |
| UI | React + TypeScript | `strict: true` |
| Styling | Tailwind CSS | 最新メジャー（v4 系、CSS-first 設定）。詳細は §10 |
| Catalog | Storybook | 最新安定版（Vite builder）。addon: a11y, docs, interactions |
| Package manager | pnpm | Corepack で固定（`packageManager` フィールド） |
| Runtime | Node.js | 最新 LTS。`.nvmrc` と `engines` で固定 |
| Unit test | Vitest + React Testing Library | 環境は `jsdom`。`@testing-library/jest-dom` の matcher を利用 |
| Lint / Format | ESLint (flat config) + Prettier | `eslint-config-prettier` で競合回避 |
| Library build | tsup（esbuild ベース） | ESM + CJS + `.d.ts` を出力 |
| Container | Dockerfile + docker compose | ローカル開発は Docker 前提 |
| Task runner | Makefile | 全コマンドの入口 |
| Deploy | Cloudflare Pages（要件を満たせない場合は Workers Static Assets） | 他クラウドへ差し替え可能な構成にする。§4 参照 |
| Visual regression test | Playwright | `toHaveScreenshot` でビルド済み Storybook を撮影。§11 参照 |
| Versioning | Changesets | SemVer (MAJOR.MINOR.PATCH) |

### ✅ 決定事項

1. **Jest を外し Vitest に一本化する**
   素案に Jest と Vitest が併記されているが役割が重複する。Storybook（Vite builder）と設定を共有でき、RTL もそのまま使えるため Vitest に統一する。
2. **esbuild を直接使わず tsup を使う**
   ライブラリビルドでは型定義出力・ESM/CJS 両対応・`exports` 設定が必要になり、素の esbuild だと自作スクリプトが増える。tsup は esbuild ベースなので素案の意図は維持できる。
3. **バージョン管理に Changesets を導入**
   tag/Releases 運用を手作業にせず、PR ごとに変更種別（major/minor/patch）を記録 → リリース PR → tag & GitHub Release & npm publish を自動化する。
4. **Cloudflare は Pages を第一候補とし、要件を満たせない場合のみ Workers Static Assets に切り替える**
   判断基準と手順は §4「Cloudflare の採用サービス」に従う。どちらを採用してもデプロイ固有の設定は `deploy/cloudflare/` 配下に閉じ込める。

---

## 3. Repository Structure

```
.
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # format check, lint, typecheck, unit test, storybook build
│   │   ├── deploy_dev.yml      # develop → Cloudflare (dev / preview)
│   │   ├── deploy_prod.yml     # main → Cloudflare (production)
│   │   ├── vrt.yml             # Playwright visual regression test
│   │   └── release.yml         # Changesets: release PR → tag → GitHub Release → npm publish
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/
├── .changeset/
├── .storybook/
│   ├── main.ts                 # PRODUCT_ID に応じて stories の glob を切り替える
│   └── preview.ts
├── deploy/
│   ├── cloudflare/             # Pages: wrangler.jsonc, _redirects, functions/（必要時）
│   ├── aws/                    # README のみ（S3 + CloudFront の差し替え手順）
│   └── azure/                  # README のみ（Static Web Apps の差し替え手順）
├── scripts/
│   ├── build-storybook-all.sh  # 全 productId をビルドして dist/storybook/{productId}/ に配置
│   ├── secrets-pull-aws.sh
│   └── new-product.sh          # productId の雛形生成
├── src/
│   ├── styles/
│   │   └── index.css           # Tailwind エントリ + @theme デザイントークン
│   ├── lib/
│   │   └── cn.ts               # clsx + tailwind-merge のユーティリティ
│   ├── shared/                 # 全プロダクト共通のコンポーネント・トークン
│   │   ├── components/
│   │   │   └── Button/
│   │   │       ├── Button.tsx
│   │   │       ├── Button.stories.tsx
│   │   │       ├── Button.test.tsx
│   │   │       └── index.ts
│   │   └── tokens/
│   ├── products/
│   │   └── sample/             # productId = "sample"
│   │       ├── components/
│   │       │   └── buttons/Toggle/...
│   │       └── index.ts
│   └── index.ts
├── portal/                     # ルート "/" に置く productId 一覧ページ（静的 HTML）
├── tests/
│   └── vrt/
│       ├── stories.spec.ts     # Storybook の index.json から全 story を列挙して撮影
│       └── __screenshots__/    # ベースライン画像（git 管理）
├── playwright.config.ts
├── .env.local.sample
├── .env.docker.sample
├── .gitignore
├── .nvmrc
├── Dockerfile
├── compose.yaml
├── Makefile
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── eslint.config.js
├── .prettierrc
├── LICENSE
├── CLAUDE.md                   # 以降の開発で Claude Code が従う規約
├── README.md
└── README_JA.md
```

- サンプルとして `shared/Button` と `products/sample/buttons/Toggle` を最低限実装し、story・test・export まで一通り揃えた「お手本」にする。
- `scripts/new-product.sh <productId>` で新しいプロダクトディレクトリを生成できるようにする。

---

## 4. productId ごとの URL 設計

素案：`http://localhost:5071/{productId}/buttons/toggle`（ローカルでは preview 環境で確認）

### ✅ 決定事項（前提の補足）

Storybook の URL はネイティブでは `/?path=/story/buttons-toggle--default` 形式で、`/{productId}/buttons/toggle` のようなパスは直接は作れない。以下の方針で実現する。

1. **productId ごとに Storybook を個別ビルド**し、`dist/storybook/{productId}/` に配置する（`PRODUCT_ID` 環境変数で `.storybook/main.ts` の stories glob を `src/shared/**` + `src/products/{productId}/**` に絞る）。
2. ルート `/` には `portal/` の productId 一覧ページを配置する。
3. **きれいな URL はリダイレクトで提供**する：
   `/{productId}/{category}/{component}` → `/{productId}/?path=/story/{category}-{component}--default`
   - Cloudflare: 下記「Cloudflare の採用サービス」の優先順で実装
   - ローカル（Docker）: 本番ビルドを nginx で配信し、同等の rewrite ルールを設定
4. 開発中の `make dev`（Storybook dev server、HMR あり）は単一 productId のみを対象とし、通常の Storybook URL で十分とする。きれいな URL の確認は `make preview`（ビルド済み成果物の配信）で行う。

### Cloudflare の採用サービス

オーナーの希望は **Cloudflare Pages**。以下の順で検討し、上から順に要件を満たせる方式を採用する。実装前に Cloudflare の最新公式ドキュメントで各機能の仕様を確認すること。

1. **Pages + `_redirects`**：`/:productId/:category/:component` → `/:productId/?path=/story/...` の変換が `_redirects` の placeholder 機能だけで書けるならこれを採用する（クエリ文字列を含む宛先や、1 セグメント内で複数 placeholder を連結する書き方が可能かを確認する）。
2. **Pages + Pages Functions**：`_redirects` で表現できない場合、`functions/[productId]/[category]/[component].ts` などで 302 リダイレクトを返す。
3. **Workers Static Assets**：上記 2 つで以下の要件のいずれかを満たせない場合のみ切り替える。切り替えた場合は理由を README と PR に記載する。

Pages で満たすべき要件：

- productId ごとのサブパス配信と、きれいな URL からのリダイレクト
- `main` → production、`develop` → preview（`wrangler pages deploy --branch develop` によるブランチエイリアス URL）の 2 環境
- 任意のカスタムドメイン設定
- GitHub Actions からの wrangler によるデプロイ

### ドメイン

- 任意ドメインを指定可能にする。未設定時は `*.pages.dev`（Workers の場合は `*.workers.dev`）を使う。
- Pages のカスタムドメインは wrangler の設定ファイルではなくダッシュボード / API で設定するため、設定手順を README に記載する（Workers の場合は `wrangler.jsonc` の routes を環境変数 `CF_CUSTOM_DOMAIN` から設定）。

---

## 5. Container / Local Development

- Docker 利用を前提とする（ホストに Node を入れなくても動くこと）。
- `Dockerfile` は multi-stage：
  - `dev`：Node LTS + Corepack(pnpm)。Storybook dev server を起動。
  - `build`：Storybook と パッケージをビルド。
  - `preview`：nginx でビルド成果物を配信（URL rewrite 込み）。
- `compose.yaml`：
  - `storybook` サービス（dev）：ホスト `5070` → コンテナ `5070`（Storybook を `-p 5070` で起動し、HMR の WebSocket もポートを揃える）。ソースを bind mount、`node_modules` は named volume。
  - `preview` サービス（profile 指定で起動）：ホスト `5071` → nginx。
  - ポートは `.env.docker` の `DEV_PORT=5070` / `PREVIEW_PORT=5071` で変更可能にする。
- ホストに Node がある人向けに、Docker を使わない `make` ターゲット（`local-*`）も用意する。

---

## 6. Makefile

`make help` でターゲット一覧と説明を表示すること。最低限のターゲット：

| Target | Description |
|---|---|
| `make help` | ターゲット一覧 |
| `make setup` | `.env.*.sample` をコピー、イメージビルド、依存インストール |
| `make up` / `make down` | docker compose 起動・停止 |
| `make dev PRODUCT_ID=sample` | Storybook dev server（http://localhost:5070） |
| `make preview` | 全 productId をビルドして nginx で配信（http://localhost:5071） |
| `make vrt` | Playwright で visual regression test を実行 |
| `make vrt-update` | ベースライン画像を更新 |
| `make install PKG=xxx` | コンテナ内で `pnpm add` |
| `make lint` / `make format` / `make typecheck` | 静的解析 |
| `make test` / `make test-watch` | Vitest |
| `make build` | パッケージビルド（tsup） |
| `make build-storybook` | 全 productId の Storybook ビルド |
| `make ci` | CI と同じチェックをローカルで一括実行 |
| `make new-product ID=xxx` | productId の雛形生成 |
| `make secrets-pull-aws` | AWS Secrets Manager から `.env.local` を生成 |
| `make changeset` | Changeset の作成 |
| `make shell` | コンテナにシェルで入る |

---

## 7. Environment Variables / Secrets

- 配布するのは `.env.local.sample` と `.env.docker.sample` のみ。`.env`, `.env.local`, `.env.docker` などの実ファイルは `.gitignore` で除外する。
- sample ファイルには各変数の用途を英語コメントで記載する。

### ✅ 決定事項：Cloudflare から Secrets をコピーする手順は成立しない

- Cloudflare の Worker Secrets は **書き込み専用**で、値を API や wrangler で読み出すことはできない。
- また `cloudflared access login` は Cloudflare Access で保護されたアプリへの認証用であり、Secrets 取得には使えない。

そのため以下の構成を提案する：

- **Secrets の正（Source of Truth）は AWS Secrets Manager** に置く。
  - `make secrets-pull-aws`：`aws sso login --profile $AWS_PROFILE` → `aws secretsmanager get-secret-value` → `.env.local` を生成。
  - 必要なら `make secrets-push-cloudflare`：Secrets Manager の値を `wrangler secret put` で Cloudflare に反映（一方向）。
- **CI/CD 用の認証情報**（`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`）は GitHub Actions Secrets / Environments で管理する。
- 静的な Storybook 配信だけであれば実行時 Secrets はほぼ不要。テンプレートでは「仕組みとして用意しておく」位置付けとし、README に「AWS 以外（1Password, Doppler 等）に差し替える場合」の差し替えポイントを記載する。

---

## 8. GitHub Actions

### ブランチ戦略

- `main`：本番。マージで production デプロイ。
- `develop`：開発統合。マージで dev（preview）デプロイ。
- feature ブランチ → `develop` への PR、`develop` → `main` へのリリース PR。

### Workflows

| File | Trigger | Jobs |
|---|---|---|
| `ci.yml` | PR, push（全ブランチ） | `prettier --check`, `eslint`, `tsc --noEmit`, `vitest run`（coverage）, `build-storybook`, `build`（パッケージ） |
| `deploy_dev.yml` | push to `develop` | Storybook 全ビルド → Cloudflare dev 環境へ deploy |
| `deploy_prod.yml` | push to `main` | Storybook 全ビルド → Cloudflare production へ deploy |
| `vrt.yml` | PR | Storybook 全ビルド → Playwright VRT。失敗時は差分レポートを artifact としてアップロード |
| `release.yml` | push to `main` | Changesets action：リリース PR 作成、またはマージ時に tag / GitHub Release / npm publish |

- デプロイ処理は `deploy/cloudflare/` 配下のスクリプトと reusable workflow（`_deploy.yml` 等）に閉じ込め、AWS/Azure へ差し替える際の変更箇所を最小にする。
- GitHub Environments（`development`, `production`）を使い、production には保護ルールを設定できる構成にする。
- pnpm store をキャッシュする。
- （任意）PR ごとの preview デプロイ URL を PR コメントに投稿する。

---

## 9. Package Publishing

- パッケージ名：**`su3-ui-component-catalog-template`**（scope なし）。
  - Fork 先では各組織の名前（例：`@acme/ui`）に置き換える前提とし、置き換え箇所（`package.json`, README, import 例, workflow）を README に一覧化する。
  - 初回 publish 前に npm 上で名前が未使用であることを確認する。
- `package.json` の `exports` でサブパスを提供：
  - `su3-ui-component-catalog-template` → shared
  - `su3-ui-component-catalog-template/{productId}` → 各プロダクト
  - `su3-ui-component-catalog-template/styles.css` → ビルド済み CSS（§10 参照）
  - `su3-ui-component-catalog-template/theme.css` → Tailwind 利用側向けのトークン定義（§10 参照）
- `react`, `react-dom` は `peerDependencies`。`tailwindcss` は利用側がビルド済み CSS を使う場合に不要なため、optional な peer とする。
- `sideEffects` を適切に設定し tree-shaking 可能にする。
- 公開先：
  - テンプレート自体：**npmjs（public）**。npm の Trusted Publishing（GitHub Actions OIDC）と provenance を利用し、長期 npm トークンを持たない。
  - Fork 先の組織：社内利用なら **GitHub Packages（private）** に切り替えられるよう、`publishConfig.registry` の差し替え手順を README に記載。
- バージョン：SemVer。Changesets で管理し、tag は `v1.2.3` 形式。

---

## 10. Styling (Tailwind CSS)

### Setup

- Tailwind CSS 最新メジャー（v4 系）を採用し、設定は CSS-first（`src/styles/index.css` の `@import "tailwindcss"` と `@theme`）で行う。`tailwind.config.js` は原則作らない。
- Storybook は `@tailwindcss/vite` プラグインで読み込み、`.storybook/preview.ts` で `src/styles/index.css` を import する。
- デザイントークン（color, spacing, radius, font など）は `@theme` 内の CSS 変数として定義し、全コンポーネントはトークン経由で参照する。任意値（`bg-[#123456]` 等）の多用は避ける。
- ダークモードは `.dark` クラス切り替え方式とし、Storybook のツールバーから切り替えられるようにする。

### Class collision 対策

- 利用側アプリの Tailwind / 既存 CSS と衝突しないよう、**prefix `uic` を付ける**（`@import "tailwindcss" prefix(uic);` → `uic:bg-primary`）。
  - `uic` = "UI catalog"。`ui` は短いが汎用的すぎて、他の UI ライブラリや利用側の命名とぶつかりやすいため避ける。
  - Fork 先では組織名の略称（例：`acme`）に変えることを推奨し、README に変更方法を記載する。
  - prefix は `src/styles/index.css` の 1 箇所と、`tailwind-merge` の設定（`extendTailwindMerge({ prefix })`）を同じ定数から変更できるようにする。
  - Tailwind v4 の prefix に使える文字種の制約を公式ドキュメントで確認すること。
- preflight（リセット CSS）は配布用 CSS には含めず、利用側のリセットに干渉しないようにする（Storybook 上では有効にしてよい）。

### Variants / class 結合

- `cn()` = `clsx` + `tailwind-merge` を `src/lib/cn.ts` に用意し、全コンポーネントで `className` prop を受けて結合できるようにする。
- variant 定義には `class-variance-authority`（cva）を使い、variant を型安全に公開する。

### 配布方法（利用側の 2 パターンに対応）

1. **ビルド済み CSS を使う（Tailwind 未導入のプロジェクト向け）**
   - Tailwind CLI（または Vite 経由）で `dist/styles.css` を生成し、`import "su3-ui-component-catalog-template/styles.css"` で読み込めるようにする。
2. **利用側の Tailwind でビルドする（Tailwind 導入済みのプロジェクト向け）**
   - `dist/theme.css`（`@theme` トークン）を配布する。
   - 利用側の CSS で `@import "su3-ui-component-catalog-template/theme.css";` と `@source "../node_modules/su3-ui-component-catalog-template/dist";` を書けば、パッケージ内のクラスがスキャンされることを README に記載する。

- 両パターンとも README_JA / README にコード例付きで記載する。

---

## 11. Visual Regression Test (Playwright)

- Playwright の `toHaveScreenshot` を使い、**ビルド済み Storybook**（`make preview` と同じ成果物）の各 story を撮影・比較する。
- 撮影対象は Storybook の `index.json` から自動列挙し、story を追加するたびにテストを書かなくてよいようにする。各 story は `iframe.html?id=<storyId>&viewMode=story` を開いて撮影する。
- story 単位で除外・設定変更できるよう、story の `parameters`（例：`vrt: { disable: true }`, `vrt: { viewports: [...] }`）を読み取る。
- 撮影条件を固定する：
  - ブラウザは Chromium のみ（初期スコープ）。ビューポートは desktop / mobile の 2 種。
  - アニメーション無効、フォント読み込み完了を待つ。
  - ライト / ダークの両テーマを撮影する。
- **フォントや OS による描画差を避けるため、ローカルも CI も公式 Playwright Docker イメージ内で実行する**（`make vrt` はコンテナで実行）。ベースライン画像は git にコミットする。
- ベースライン更新は `make vrt-update` で行い、更新を含む PR では差分画像をレビューする運用を README に記載する。

---

## 12. Documentation

### README.md（英語）

冒頭に `[日本語はこちら](./README_JA.md)` へのリンク。構成：

1. One-liner description
2. Tech stack
3. Quick start（`make setup` → `make dev`）
4. Project structure / productId の考え方
5. **Using this template**（Fork / "Use this template" 後にやること）
   - パッケージ名・scope の置き換え
   - productId の追加（`make new-product`）
   - Cloudflare の設定（GitHub Secrets、custom domain）
   - Secrets 管理方式の選択
   - デプロイ先を AWS / Azure に変える場合
6. Installing the published package（利用側の例）
7. Release flow（Changesets）
8. Make commands
9. License

### README_JA.md（日本語）

- README.md と**同じ見出し構成・同じ順序**にして差分比較しやすくする。
- 冒頭に `[English](./README.md)` へのリンク。

### その他

- `CLAUDE.md`：コーディング規約、ディレクトリ規約、コンポーネント追加時のチェックリスト（component / story / test / export を揃える）、コミット前に `make ci` を通すこと等。
- `CONTRIBUTING.md`（任意）

---

## 13. Coding Conventions（CLAUDE.md にも反映）

- 全コード・コメント・ドキュメントは英語。
- 1 コンポーネント = 1 ディレクトリ（`Component.tsx`, `Component.stories.tsx`, `Component.test.tsx`, `index.ts`）。
- Story の `title` は `{Category}/{Component}` とし、productId は title に含めない（URL 設計とビルド単位で表現するため）。
- アクセシビリティ：Storybook a11y addon で違反が出ないこと。
- スタイリングは Tailwind CSS のユーティリティクラスのみで行い、コンポーネント単位の CSS ファイルは作らない（§10）。
- クラスの結合は必ず `cn()` を使い、variant は cva で定義する。
- 色・余白などはトークン経由で指定し、ハードコードした値を使わない。

---

## 14. Implementation Phases

1. 基盤：pnpm / TS / ESLint / Prettier / Vitest / Storybook / Tailwind CSS / サンプルコンポーネント
2. Docker / compose / Makefile
3. productId 別ビルド、portal、URL rewrite（nginx・Cloudflare）
4. パッケージビルド（tsup + CSS 出力）と exports
5. Playwright VRT（Docker 実行、ベースライン作成）
6. GitHub Actions（CI → VRT → deploy → release）
7. Secrets スクリプト
8. README / README_JA / CLAUDE.md

各フェーズ完了時に `make ci` が通ること。

## 15. Acceptance Criteria

- [ ] クリーンな環境で `make setup && make dev` だけで Storybook が http://localhost:5070 で開く
- [ ] `make preview` で `http://localhost:5071/sample/buttons/toggle` が該当 story を表示する
- [ ] `make vrt` がローカル（Docker）と CI で同じ結果になり、story を追加するとテスト対象に自動で含まれる
- [ ] Cloudflare Pages（または切り替え理由を記載した Workers）上で `/{productId}/{category}/{component}` の URL が機能する
- [ ] `make ci` が成功し、CI でも同じ内容が実行される
- [ ] `develop` / `main` への push で Cloudflare に自動デプロイされる
- [ ] Changeset 付き PR のマージで tag・Release・npm publish が行われる
- [ ] 別プロジェクトから `pnpm add su3-ui-component-catalog-template` してコンポーネントを import できる
- [ ] Tailwind 未導入のプロジェクトでも `styles.css` の import だけでスタイルが当たる
- [ ] Tailwind 導入済みのプロジェクトで `theme.css` + `@source` の設定によりスタイルが当たり、利用側のクラスと衝突しない
- [ ] Fork 後に置き換えが必要な箇所が README に網羅されている

---

## 16. Decisions Summary

- Package name: `su3-ui-component-catalog-template`
- Styling: Tailwind CSS v4、prefix `uic`（§10）
- Deploy: Cloudflare Pages を優先。要件を満たせない場合のみ Workers Static Assets（§4）
- Local ports: dev = `5070`, preview = `5071`
- Visual regression test: Playwright（§11）
- 本ドキュメント内の「✅ 決定事項」はすべて承認済み

上記以外で実装中に判断が必要になった場合は、一般的なベストプラクティスに従って決め、PR の説明に判断理由を記載すること。
