import { resolve } from 'node:path';

import swc from 'unplugin-swc';
import { mergeConfig } from 'vitest/config';

import { createVitestConfig } from '../../vitest.config';

export default mergeConfig(createVitestConfig(__dirname), {
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  test: {
    setupFiles: [resolve(__dirname, 'test/setup.ts')],
    sequence: {
      concurrent: false,
    },
    fileParallelism: false,
    teardownTimeout: 1000,
  },
});
