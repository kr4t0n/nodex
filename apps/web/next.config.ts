import { loadEnvFile } from 'node:process';

import type { NextConfig } from 'next';

// Next defaults to the app directory; accounts share the monorepo's root .env.
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
  // The Docker runtime copies this server and its traced dependency closure.
  output: 'standalone',
};

export default config;
