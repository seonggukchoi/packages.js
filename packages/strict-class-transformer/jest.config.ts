import baseConfig from '../../jest.config';

import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  ...baseConfig,
  displayName: '@seonggukchoi/strict-class-transformer',
  rootDir: '../../',
  testRegex: `packages/strict-class-transformer/src/${baseConfig.testRegex}`,
};

export default config;
