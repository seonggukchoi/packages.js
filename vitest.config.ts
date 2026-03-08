import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export const defaultInclude = ['src/**/*.{spec,test}.{ts,tsx}', 'src/**/*.e2e-{spec,test}.{ts,tsx}'];

export const createVitestConfig = (dirname: string) =>
  defineConfig({
    resolve: {
      alias: {
        '@seonggukchoi/types': resolve(__dirname, 'packages/types/src'),
      },
    },
    test: {
      globals: true,
      environment: 'node',
      include: defaultInclude,
      root: dirname,
      passWithNoTests: true,
      clearMocks: true,
      mockReset: true,
      coverage: {
        reportsDirectory: resolve(dirname, 'coverage'),
      },
    },
  });

export default createVitestConfig(__dirname);
