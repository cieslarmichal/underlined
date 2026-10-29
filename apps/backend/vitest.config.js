import { defineConfig, mergeConfig } from 'vitest/config';

import config from '../../vitest.config.js';

export default mergeConfig(
  config,
  defineConfig({
    test: {
      include: ['**/*.test.ts'],
      pool: 'forks',
      fileParallelism: false,
    },
  }),
);
