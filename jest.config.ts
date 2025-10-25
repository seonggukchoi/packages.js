import { join } from 'node:path';

import type { JestConfigWithTsJest } from 'ts-jest';

export const defaultTestRegex = '.*\\.(e2e-)?(spec|test)\\.[tj]sx?$';
export const getDefaultTestRegex = (currentDirectoryName: string) => join(currentDirectoryName, 'src', defaultTestRegex);
export const getDefaultCoverageDirectory = (currentDirectoryName: string) => join(currentDirectoryName, 'coverage');

const config: JestConfigWithTsJest = {
  moduleNameMapper: { '@seonggukchoi/(.*)(.*)': '<rootDir>packages/$1/src$2' },
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: './tsconfig.json', isolatedModules: true }] },
  testEnvironment: 'node',
  rootDir: '../../',
  displayName: process.env.npm_package_name,
  silent: false,
  passWithNoTests: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
};

export default config;
