import { z } from 'zod';

import { COMPONENT_TYPES, PRIMITIVE_TYPES, RUNTIMES } from './taxonomy.ts';

/** Addresses are relative to the served registry or configured destination. */
export const relativePathSchema = z.string().min(1).refine(
  (value) => /^[A-Za-z0-9_@./-]+$/.test(value) &&
    value.split('/').every((part) => part !== '..' && part !== '.' && part.length > 0),
  'Expected a relative path without traversal, URL syntax, or empty segments',
);

export const tierSchema = z.enum(['primitive', 'expressive']);
export const densitySchema = z.enum(['close-read', 'glance']);
export const aspectRatioSchema = z.string().regex(/^\d+(\.\d+)?\/\d+(\.\d+)?$/)
  .refine((value) => value.split('/').every((part) => Number(part) > 0), 'Aspect dimensions must be positive');
export const propSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().default(false),
});

const componentFields = {
  component: z.enum([...COMPONENT_TYPES, ...PRIMITIVE_TYPES]),
  tier: tierSchema,
  runtime: z.enum(RUNTIMES),
  library: z.string().optional(),
  density: densitySchema.optional(),
  aspectRatio: aspectRatioSchema.optional(),
  tags: z.array(z.string()).default([]),
  entry: relativePathSchema,
  exports: z.array(z.string().regex(/^[A-Za-z_$][\w$]*$/)).min(1),
  props: z.array(propSchema).optional(),
  strokeAsArea: z.boolean().default(false),
  externalData: z.array(z.string().url()).default([]),
};

/** Authored explicitly: examples never become consumer runtime dependencies. */
export const componentMetaSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  description: z.string().optional(),
  ...componentFields,
  files: z.array(relativePathSchema).min(1),
  shared: z.array(relativePathSchema).default([]),
  dependencies: z.array(z.string()).default([]),
  example: z.object({
    entry: relativePathSchema,
    export: z.string().regex(/^[A-Za-z_$][\w$]*$/),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
}).strict().refine((meta) => meta.files.includes(meta.entry), 'Entry must be a declared runtime file')
  .refine((meta) => !meta.files.includes(meta.example.entry), 'Examples must not ship as runtime files');

export const nodexMetaSchema = z.object({
  language: z.string(),
  ...componentFields,
  preview: z.object({
    path: relativePathSchema,
    width: z.number().positive(),
    height: z.number().positive(),
    /** Measured space outside chart content; the gallery supplies its own inset. */
    insets: z.object({
      top: z.number().nonnegative(),
      right: z.number().nonnegative(),
      bottom: z.number().nonnegative(),
      left: z.number().nonnegative(),
    }).optional(),
  }),
});

/** A shadcn-compatible item; every file has an explicit consumer destination. */
export const registryItemFileSchema = z.object({
  path: relativePathSchema,
  target: relativePathSchema,
  content: z.string().optional(),
  type: z.enum(['registry:component', 'registry:ui', 'registry:hook', 'registry:lib', 'registry:file']),
});

export const registryItemSchema = z.object({
  $schema: z.string().optional(),
  name: z.string(),
  type: z.enum(['registry:component', 'registry:ui']),
  title: z.string(),
  description: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  files: z.array(registryItemFileSchema).min(1),
  meta: nodexMetaSchema,
}).refine((item) => item.files.some((file) => file.target === item.meta.entry), 'Entry must match a file target');

export const registrySchema = z.object({
  $schema: z.string().optional(),
  name: z.string(),
  homepage: z.string().optional(),
  items: z.array(registryItemSchema),
});

export const languageMetaSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  description: z.string(),
  visibility: z.enum(['public', 'restricted']).default('public'),
  density: z.array(densitySchema).optional(),
  featured: z.array(z.string()).default([]),
}).strict();

export const languageFilesSchema = z.object({
  tokens: relativePathSchema,
  tokensJson: relativePathSchema,
  design: relativePathSchema,
});

export const publishedLanguageSchema = languageMetaSchema.extend({
  files: languageFilesSchema,
  counts: z.object({ expressive: z.number().int().nonnegative(), primitives: z.number().int().nonnegative() }),
});

export type RegistryItem = z.infer<typeof registryItemSchema>;
export type Registry = z.infer<typeof registrySchema>;
/** Browsing retains the delivery addresses, without downloading runtime source. */
export type GalleryItem = Omit<RegistryItem, 'files'> & {
  files: Array<Omit<RegistryItem['files'][number], 'content'>>;
};
export type GalleryRegistry = Omit<Registry, 'items'> & { items: GalleryItem[] };
export type LanguageMeta = z.infer<typeof languageMetaSchema>;
export type PublishedLanguage = z.infer<typeof publishedLanguageSchema>;
export type ComponentMeta = z.infer<typeof componentMetaSchema>;
export type NodexMeta = z.infer<typeof nodexMetaSchema>;
export type Tier = z.infer<typeof tierSchema>;
export type Density = z.infer<typeof densitySchema>;
