/**
 * Node entry point. Re-exports the filesystem loader, so it is not safe for the
 * browser. Browser consumers import the `./schema` and `./taxonomy` subpaths,
 * which are free of node: builtins.
 */
export * from './taxonomy.ts';
export * from './schema.ts';
export * from './load.ts';
