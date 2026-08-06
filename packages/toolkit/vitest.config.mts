import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import swc from 'unplugin-swc';
import { mergeConfig } from 'vitest/config';

import { createVitestConfig } from '../../vitest.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default mergeConfig(createVitestConfig(__dirname), {
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      tsconfigFile: './tsconfig.build.json',
    }),
  ],
  test: {
    setupFiles: ['./test/reset-exit-code.ts'],
    coverage: {
      exclude: [
        'src/**/index.ts',
        'src/**/*.{spec,test}.ts',
        'src/**/*.e2e-{spec,test}.ts',
        'src/**/*.module.ts',
        'src/main.ts',
      ],
    },
  },
});
