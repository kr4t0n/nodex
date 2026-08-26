import { loadEnvFile } from 'node:process';

import type { NextConfig } from 'next';

/**
 * Load the monorepo's single `.env`.
 *
 * Next reads `.env` relative to the app directory, which in a workspace means
 * `apps/web/.env`. Secrets living in two places is exactly how one of them goes
 * stale, and `.env.example`, the migration runner, and docker-compose all sit at
 * the root, so the root is where the real file belongs.
 *
 * This runs before the server starts, so everything downstream sees the values.
 * A missing file is not an error: the registry, every public page, and the whole
 * build work without one. Only the accounts layer needs it.
 */
try {
  loadEnvFile(new URL('../../.env', import.meta.url).pathname);
} catch {
  // No .env. The accounts layer will report itself unconfigured.
}

const config: NextConfig = {
  reactStrictMode: true,
  // The registry is a sibling workspace, so tracing has to reach outside the app
  // directory when bundling for deployment.
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  typedRoutes: true,
};

export default config;
