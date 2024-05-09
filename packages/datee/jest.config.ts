import baseConfig from '../../jest.config';

import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  ...baseConfig,
  displayName: '@seonggukchoi/datee',
  rootDir: '../../',
  testRegex: `packages/datee/src/${baseConfig.testRegex}`,
};

export default config;
