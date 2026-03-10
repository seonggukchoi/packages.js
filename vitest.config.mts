import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const defaultInclude = ['src/**/*.{spec,test}.{ts,tsx}', 'src/**/*.e2e-{spec,test}.{ts,tsx}'];

export const createVitestConfig = (dir: string) =>
  defineConfig({
    resolve: {
      alias: {
        '@seonggukchoi/address': resolve(__dirname, 'packages/address/src'),
        '@seonggukchoi/class-transformer-extends': resolve(__dirname, 'packages/class-transformer-extends/src'),
        '@seonggukchoi/datee': resolve(__dirname, 'packages/datee/src'),
        '@seonggukchoi/nestjs-contextual-pino': resolve(__dirname, 'packages/nestjs-contextual-pino/src'),
        '@seonggukchoi/nestjs-transactional-typeorm': resolve(__dirname, 'packages/nestjs-transactional-typeorm/src'),
        '@seonggukchoi/opencode-notifier': resolve(__dirname, 'packages/opencode-notifier/src'),
        '@seonggukchoi/phone': resolve(__dirname, 'packages/phone/src'),
        '@seonggukchoi/regex': resolve(__dirname, 'packages/regex/src'),
        '@seonggukchoi/strict-class-transformer': resolve(__dirname, 'packages/strict-class-transformer/src'),
        '@seonggukchoi/types': resolve(__dirname, 'packages/types/src'),
        '@seonggukchoi/utility': resolve(__dirname, 'packages/utility/src'),
      },
    },
    test: {
      globals: true,
      environment: 'node',
      include: defaultInclude,
      root: dir,
      passWithNoTests: true,
      clearMocks: true,
      mockReset: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        reportsDirectory: resolve(dir, 'coverage'),
        include: ['src/**/*.ts'],
        exclude: ['src/**/index.ts', 'src/**/*.{spec,test}.ts', 'src/**/*.e2e-{spec,test}.ts'],
        thresholds: {
          100: true,
        },
      },
    },
  });

export default createVitestConfig(__dirname);
