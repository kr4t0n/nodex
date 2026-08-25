import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The registry is a sibling workspace, so tracing has to reach outside the app
  // directory when bundling for deployment.
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  typedRoutes: true,
};

export default config;
