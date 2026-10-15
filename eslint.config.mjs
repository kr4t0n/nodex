import { fixupPluginRules } from '@eslint/compat';
import parser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import next from '@next/eslint-plugin-next';
import globals from 'globals';

// Only coverage gaps in Oxlint belong here; do not extend recommended presets.
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      'public/**',
      'apps/web/public/**',
    ],
  },
  {
    files: ['**/*.{jsx,tsx}'],
    languageOptions: { parser },
    // Legacy lifecycles still typecheck; TypeScript is not a deprecation check.
    plugins: { react: fixupPluginRules(react) },
    settings: { react: { version: 'detect' } },
    rules: { 'react/no-deprecated': 'error' },
  },
  {
    files: ['apps/web/**/*.{js,jsx,ts,tsx}'],
    languageOptions: { parser, globals: globals.browser },
    plugins: { '@next/next': next },
    rules: { '@next/next/no-location-assign-relative-destination': 'warn' },
  },
];
