import baseConfig from '../../jest.config';

import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  ...baseConfig,
  displayName: '@seonggukchoi/address',
  rootDir: '../../',
  testRegex: `packages/address/src/${baseConfig.testRegex}`,
};

export default config;
