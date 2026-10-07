import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    env: { NODE_ENV: 'test' },
    // Integration tests share one database, so running test files in parallel would let them
    // interfere with each other (cleanup in one file would delete another file's rows).
    fileParallelism: false,
  },
});
