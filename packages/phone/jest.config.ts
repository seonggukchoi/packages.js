import baseConfig from '../../jest.config';

import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  ...baseConfig,
  displayName: '@seonggukchoi/phone',
  rootDir: '../../',
  testRegex: `packages/phone/src/${baseConfig.testRegex}`,
};

export default config;
