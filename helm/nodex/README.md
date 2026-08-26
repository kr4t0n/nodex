# nodex Helm chart

Deploys the nodex web app: the browsable registry and the accounts layer.

```bash
helm repo add nodex https://kr4t0n.github.io/nodex/helm
helm repo update
helm install nodex nodex/nodex --set siteUrl=https://nodex.example.com
```

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
