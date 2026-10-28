# nodex Helm chart

Deploys the nodex web app: the browsable registry and the accounts layer.

```bash
helm repo add nodex https://kr4t0n.github.io/nodex/helm
helm repo update
helm upgrade --install nodex nodex/nodex --version 0.3.2 --set siteUrl=https://nodex.example.com
```

Chart `0.3.2` defaults to `docker.io/kr4t0n/nodex:0.3.2` for both the app
and migration Job. Set `image.tag` to override that release explicitly.

## Docker

Build from the repository root and run on port 4180:

```bash
docker build -t nodex .
docker run -p 4180:4180 --env-file .env nodex
```

The dependency stage caches Chromium and its OS libraries; the build renders the
registry and builds Next. Runtime contains Next's standalone output and migrations,
without Chromium. Run `node scripts/migrate.mjs` inside the container to apply the
schema. Omit `--env-file .env` when running without accounts.

## Accounts are optional

Without a database the site serves every public page and the CLI reads it
anonymously, which is the whole registry. Only the `/languages` index is gated.

```bash
helm install nodex nodex/nodex \
  --set siteUrl=https://nodex.example.com \
  --set database.url='postgres://user:pass@host:5432/nodex' \
  --set github.clientId=... --set github.clientSecret=...
```

The GitHub OAuth app's callback URL must be exactly
`<siteUrl>/api/auth/github/callback`.

Schema migrations run as a `pre-install`/`pre-upgrade` Job from the same image,
so the schema is in place before any new pod serves traffic. They are skipped
entirely when no database is configured.

## One setting is not a chart value

`NEXT_PUBLIC_REGISTRY_URL`, which points the browser at a CDN instead of the
app's own `/registry`, is baked at image build time:

```bash
docker build --build-arg NEXT_PUBLIC_REGISTRY_URL=https://cdn.example.com .
```

Next inlines `NEXT_PUBLIC_*` into the browser bundle, and the code that reads it
runs in the browser, so no runtime value can change it. Everything else,
including `siteUrl`, is runtime configuration and one image serves any hostname.

## Values

See `values.yaml`, which is commented. The ones that matter most are `siteUrl`,
`image.tag`, `database.url` or `database.existingSecret`, and `ingress`.

## Publishing setup

Publish only for a requested release; follow [the release flow](../../AGENTS.md#change-and-release-flow).
The [Docker workflow](../../.github/workflows/docker.yml) publishes amd64 images on
`main`, `v*` tags or manual runs. Configure `DOCKERHUB_USERNAME` and
`DOCKERHUB_TOKEN` secrets; optional variables are `DOCKERHUB_REPOSITORY` and
`NEXT_PUBLIC_REGISTRY_URL`. Missing credentials skip publication, so check the
published image as well as workflow status.

Enable GitHub Pages for the `gh-pages` branch in repository settings. The
[chart workflow](../../.github/workflows/helm-publish.yml) creates that branch if
needed and serves packages from `helm/`. It runs when chart/workflow files change
on `main`, or manually. Published chart versions are immutable: bump
[`Chart.yaml`](Chart.yaml)'s `version` for changed content. `appVersion` pins the
default image for both the app and migration Job; `image.tag` overrides it.
