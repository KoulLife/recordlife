import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  // The workspace package ships TypeScript source; bundle it (and its date deps).
  noExternal: ['@recordlife/shared', 'date-fns', '@date-fns/tz'],
});
