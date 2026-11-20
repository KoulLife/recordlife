import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // All test files share one Postgres database; run them one at a time.
    fileParallelism: false,
    hookTimeout: 30000,
  },
});
