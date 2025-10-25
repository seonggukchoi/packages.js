import baseConfig, { getDefaultCoverageDirectory, getDefaultTestRegex } from '../../jest.config';

import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  ...baseConfig,
  rootDir: './',
  testRegex: getDefaultTestRegex(__dirname),
  coverageDirectory: getDefaultCoverageDirectory(__dirname),
  transform: { '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: './tsconfig.json', isolatedModules: true }] },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};

export default config;
