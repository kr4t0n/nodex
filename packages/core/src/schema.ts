import { z } from 'zod';

import { COMPONENT_TYPES, PRIMITIVE_TYPES, RUNTIMES } from './taxonomy.ts';

/**
 * The nodex manifest is a superset of the shadcn `registry-item` schema, so a
 * React consumer can run `npx shadcn add <url>` against any nodex item without
 * nodex shipping a second representation. Nodex-specific fields live in the
 * schema's arbitrary `meta` record, which shadcn passes through untouched.
 */

export const registryItemTypeSchema = z.enum([
  'registry:base',
  'registry:block',
  'registry:component',
  'registry:file',
  'registry:font',
  'registry:hook',
  'registry:item',
  'registry:lib',
  'registry:page',
  'registry:style',
  'registry:theme',
  'registry:ui',
]);

/** shadcn requires `target` on `registry:file` and `registry:page`. */
export const registryItemFileSchema = z.discriminatedUnion('type', [
  z.object({
    path: z.string(),
    content: z.string().optional(),
    type: z.enum(['registry:file', 'registry:page']),
    target: z.string(),
  }),
  z.object({
    path: z.string(),
    content: z.string().optional(),
    type: registryItemTypeSchema.exclude(['registry:file', 'registry:page']),
    target: z.string().optional(),
  }),
]);

export const cssVarsSchema = z.object({
  theme: z.record(z.string(), z.string()).optional(),
  light: z.record(z.string(), z.string()).optional(),
  dark: z.record(z.string(), z.string()).optional(),
});

export const tierSchema = z.enum(['primitive', 'expressive']);

/**
 * Density describes how a component is READ, not how it is drawn. Stroke weight
 * is already the design language's job; encoding it again here would duplicate
 * information the tokens already carry.
 *
 * Optional by design. The close-read / glance split is an artifact of how the
 * first collection was authored; a future language may have no such distinction
 * and simply omits the field.
 */
export const densitySchema = z.enum(['close-read', 'glance']);

export const aspectRatioSchema = z
  .string()
  .regex(
    /^\d+(\.\d+)?\/\d+(\.\d+)?$/,
    'aspectRatio must look like "800/300" so it drops straight into CSS aspect-ratio',
  );

/** Nodex fields, carried inside shadcn's pass-through `meta` record. */
export const nodexMetaSchema = z.object({
  language: z.string(),
  tier: tierSchema,
  component: z.enum([...COMPONENT_TYPES, ...PRIMITIVE_TYPES]),
  runtime: z.enum(RUNTIMES),
  density: densitySchema.optional(),
  aspectRatio: aspectRatioSchema.optional(),
  tags: z.array(z.string()).default([]),
});

export const registryItemSchema = z.object({
  $schema: z.string().optional(),
  name: z.string(),
  type: registryItemTypeSchema,
  title: z.string(),
  description: z.string().optional(),
  extends: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  devDependencies: z.array(z.string()).optional(),
  registryDependencies: z.array(z.string()).optional(),
  files: z.array(registryItemFileSchema).optional(),
  cssVars: cssVarsSchema.optional(),
  css: z.record(z.string(), z.unknown()).optional(),
  docs: z.string().optional(),
  categories: z.array(z.string()).optional(),
  meta: nodexMetaSchema,
});

export const registrySchema = z.object({
  $schema: z.string().optional(),
  name: z.string(),
  homepage: z.string(),
  items: z.array(registryItemSchema).default([]),
});

/**
 * `languages/<slug>/meta.json` — the language's own declaration.
 *
 * `visibility` exists from day one even though everything is currently public,
 * because adding it later would mean a migration. `density` lists the legal
 * values for this language; a component may only declare a density that appears
 * here, and may not declare one at all if this is absent.
 */
export const languageMetaSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'language slug must be kebab-case'),
  name: z.string(),
  description: z.string(),
  visibility: z.enum(['public', 'restricted']).default('public'),
  density: z.array(densitySchema).optional(),
  /** Component slugs shown as the live composite on the gallery index. */
  featured: z.array(z.string()).default([]),
});

/** `expressive/<slug>/meta.json` — one component's own declaration. */
export const componentMetaSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'component slug must be kebab-case'),
  title: z.string(),
  description: z.string().optional(),
  component: z.enum([...COMPONENT_TYPES, ...PRIMITIVE_TYPES]),
  tier: tierSchema,
  runtime: z.enum(RUNTIMES),
  density: densitySchema.optional(),
  aspectRatio: aspectRatioSchema.optional(),
  tags: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  /**
   * Set when the stroke IS the area rather than an outline — sankey flows,
   * streamgraph ribbons, violin bodies, heatmap cells drawn as thick lines.
   * There the width encodes magnitude, so the hairline ceiling does not apply.
   * Declared explicitly rather than inferred from component type, because the
   * same type can be drawn either way.
   */
  strokeAsArea: z.boolean().default(false),
  /**
   * URLs the component fetches data from at runtime. Declared rather than left
   * buried in the chart body, because a component that silently pulls from a
   * third-party host is a supply-chain surface the consumer should see.
   */
  externalData: z.array(z.string().url()).default([]),
});

export type RegistryItem = z.infer<typeof registryItemSchema>;
export type Registry = z.infer<typeof registrySchema>;
export type LanguageMeta = z.infer<typeof languageMetaSchema>;
export type ComponentMeta = z.infer<typeof componentMetaSchema>;
export type NodexMeta = z.infer<typeof nodexMetaSchema>;
export type Tier = z.infer<typeof tierSchema>;
export type Density = z.infer<typeof densitySchema>;
