import baseConfig from '../../jest.config';

import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  ...baseConfig,
  displayName: '@seonggukchoi/regex',
  rootDir: '../../',
  testRegex: `packages/regex/src/${baseConfig.testRegex}`,
};

export default config;
