import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import swc from 'unplugin-swc';
import { mergeConfig } from 'vitest/config';

import { createVitestConfig } from '../../vitest.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
