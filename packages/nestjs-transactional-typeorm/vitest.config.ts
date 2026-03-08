import { resolve } from 'node:path';

import { mergeConfig } from 'vitest/config';

import { createVitestConfig } from '../../vitest.config';

export default mergeConfig(createVitestConfig(__dirname), {
  test: {
    setupFiles: [resolve(__dirname, 'test/setup.ts')],
  },
});
