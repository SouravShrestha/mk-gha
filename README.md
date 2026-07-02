# mk-gha

An interactive CLI that scaffolds GitHub Actions CI/CD workflows for your project in seconds.

## Features

- 🔍 **Auto-detects project type** from `package.json` (Next.js, React) or `.csproj` (.NET) — skips the prompt entirely when confident
- 🚀 **Multiple deploy targets** in one go: **Docker Hub**, **Cloudflare Workers**, **GitHub Packages (GHCR)**, **npm**
- 📦 Generates a `release-please` workflow for automated versioning and changelogs
- ✅ Warns before overwriting existing workflow files
- 🔧 Scaffolds a starter `wrangler.toml` when deploying to Cloudflare and none is found

## Quickstart

Run directly from npm without installing:

```bash
npx mk-gha
```

Or install globally:

```bash
npm install -g mk-gha
mk-gha
```

Run the command at the **root of your project** (next to `package.json` or your `.csproj` file).

## Generated Files

```
.github/
  workflows/
    ci-feature.yml          # Build + test on every feature branch push
    ci-main.yml             # Build + test + deploy (test/prod) + release PRs
  release-please-config.json
  .release-please-manifest.json
```

## Project Types

| Type    | Detected when                                 |
| ------- | --------------------------------------------- |
| Next.js | `next` found in `package.json` dependencies   |
| React   | `react` found in `package.json` dependencies  |
| .NET    | A `.csproj` file is found in the project root |

The project type is **auto-detected**; the prompt just lets you confirm or override.

## Deploy Targets

### Docker Hub

Builds and pushes an image to Docker Hub on every CI run and on production releases.

**Required secrets:**

| Secret            | Description                  |
| ----------------- | ---------------------------- |
| `DOCKER_USERNAME` | Your Docker Hub username     |
| `DOCKER_PASSWORD` | Your Docker Hub access token |

### Cloudflare Workers

Deploys using [Wrangler](https://developers.cloudflare.com/workers/wrangler/) to a `test` environment on CI and `production` on release.

If no `wrangler.toml`, `wrangler.json`, or `wrangler.jsonc` is found in the project root, `mk-gha` will offer to scaffold a starter `wrangler.toml` for you.

The scaffolded file includes:

- A top-level production worker definition (name derived from `package.json`)
- An `[env.test]` section for the test environment
- Placeholder sections for `[vars]` and `[[kv_namespaces]]`

You will need to fill in resource IDs (KV namespace IDs, D1 databases, etc.) and adjust the `main` entry point to match your build output before deploying.

**Required secrets:**

| Secret                  | Description                                   |
| ----------------------- | --------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API token with Workers permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID                    |

### npm

Publishes the package to the [npm registry](https://www.npmjs.com/) on every versioned release tag (`v*`).

- Feature branch and main branch pushes only run build + test — no publish step
- `registry-url` is automatically set on the Node.js setup step so `NODE_AUTH_TOKEN` is picked up correctly
- Uses `npm publish --access public` — remove the `--access public` flag if your package is scoped and should be private

**Required secrets:**

| Secret      | Description                                    |
| ----------- | ---------------------------------------------- |
| `NPM_TOKEN` | npm access token (Automation type recommended) |

### GitHub Packages (GHCR)

Builds and pushes a Docker image to the [GitHub Container Registry](https://ghcr.io) under `ghcr.io/<owner>/<repo>`. No extra secrets needed — it uses the built-in `GITHUB_TOKEN`.

**Required secrets:**

| Secret         | Description                                   |
| -------------- | --------------------------------------------- |
| `GITHUB_TOKEN` | Built-in — GitHub provides this automatically |

> **Note:** Make sure your repository's package visibility is set correctly at  
> **Settings → Packages** if you want the image to be public.

## Conventional Commits

`release-please` drives versioning from your commit messages. Use these prefixes:

| Prefix             | Effect                             |
| ------------------ | ---------------------------------- |
| `feat:`            | Bumps the **minor** version        |
| `fix:`             | Bumps the **patch** version        |
| `chore:`           | No version bump, included in notes |
| `docs:`            | No version bump, included in notes |
| `BREAKING CHANGE:` | Bumps the **major** version        |

See [conventionalcommits.org](https://www.conventionalcommits.org/) for the full spec.

## Requirements

- Node.js ≥ 18

## License

MIT
