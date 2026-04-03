import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vitest/config';
import { createVitestConfig } from '../../vitest.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default mergeConfig(createVitestConfig(__dirname), {
  test: {
    coverage: {
      exclude: ['src/**/index.ts', 'src/**/*.{spec,test}.ts', 'src/**/*.e2e-{spec,test}.ts', 'src/types.ts', 'src/main.ts'],
    },
  },
});
