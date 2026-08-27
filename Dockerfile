# syntax=docker/dockerfile:1

# The nodex web app, as a container.
#
# The build context is the repository root rather than `apps/web`, because the
# app is one workspace of several and the image needs `registry/` to generate
# previews and the manifest before Next can prerender the routes that read it.
#
# Three stages so the runtime image carries no toolchain and no source: install,
# build, then a runtime holding only Next's standalone output.

# ---------------------------------------------------------------- dependencies

FROM node:24-bookworm-slim AS deps
WORKDIR /app

# Manifests only, so this layer is cached until a dependency actually changes.
# Copying the whole tree first would rebuild the install on every source edit.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/cli/package.json packages/cli/

# `npm ci` needs the lockfile to carry a resolved entry for this platform's
# native binaries. See optionalDependencies in the root package.json: without
# them lightningcss and friends install their JavaScript wrapper and no binding,
# and the build fails looking for a `.node` file.
RUN npm ci

# ----------------------------------------------------------------------- build

FROM node:24-bookworm-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Baked in, not read at runtime. Next inlines NEXT_PUBLIC_* into the client
# bundle at build time, and `lib/registry.ts` runs in the browser, so pointing
# the app at a CDN is a property of the image rather than of the container.
ARG NEXT_PUBLIC_REGISTRY_URL=""
ENV NEXT_PUBLIC_REGISTRY_URL=$NEXT_PUBLIC_REGISTRY_URL

# Generates tokens.css, the standalone previews, and the manifest. The app
# prerenders its routes from that manifest, so this has to come first.
RUN npm run build:registry

# `prebuild` copies registry/ and public/r/ into apps/web/public.
RUN npm run build --workspace @nodex/web

# --------------------------------------------------------------------- runtime

FROM node:24-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
# Next's standalone server binds localhost by default, which is unreachable from
# outside the container.
ENV HOSTNAME=0.0.0.0
ENV PORT=4180

# Standalone carries the server plus only the node_modules actually reached, and
# already includes apps/web/public. `.next/static` is the one thing it omits.
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static

# Migrations travel with the image so a deployment can apply its own schema
# rather than depending on someone having run them from a laptop. The path must
# mirror the monorepo layout: migrate.mjs resolves its directory relative to its
# own location as `../apps/web/migrations`, so flattening it to `/app/migrations`
# leaves the script scanning a path that does not exist.
COPY --from=build --chown=node:node /app/apps/web/migrations ./apps/web/migrations
COPY --from=build --chown=node:node /app/scripts/migrate.mjs ./scripts/migrate.mjs

USER node
EXPOSE 4180

# No health check here: the app answers before the database is reachable, by
# design, so a 200 on `/` would not tell an orchestrator anything it needs.
CMD ["node", "apps/web/server.js"]
