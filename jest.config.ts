/* eslint-disable @typescript-eslint/naming-convention */
import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  moduleNameMapper: { '@seonggukchoi/(.*)(.*)': '<rootDir>packages/$1/src$2' },
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: './tsconfig.json', isolatedModules: true }] },
  testEnvironment: 'node',
  rootDir: './',
  testRegex: '.*\\.(e2e-)?(spec|test)\\.[tj]sx?$',
  coverageDirectory: './coverage',
  silent: false,
  passWithNoTests: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
};

export default config;
