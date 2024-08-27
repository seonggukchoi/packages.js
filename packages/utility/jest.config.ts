import baseConfig from '../../jest.config';

import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  ...baseConfig,
  displayName: '@seonggukchoi/utility',
  rootDir: '../../',
  testRegex: `packages/utility/src/${baseConfig.testRegex}`,
};

export default config;
