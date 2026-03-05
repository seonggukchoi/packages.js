import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  rootDir: './',
  testRegex: 'src/.*\\.(e2e-)?(spec|test)\\.[tj]sx?$',
  coverageDirectory: './coverage',
  transform: { '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: './tsconfig.json', isolatedModules: true }] },
  passWithNoTests: true,
  silent: false,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
};

export default config;
