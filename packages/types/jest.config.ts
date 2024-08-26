import baseConfig from '../../jest.config';

import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  ...baseConfig,
  displayName: '@seonggukchoi/types',
  rootDir: '../../',
  testRegex: `packages/types/src/${baseConfig.testRegex}`,
};

export default config;
