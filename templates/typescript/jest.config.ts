import baseConfig from '../../jest.config';

import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  ...baseConfig,
  displayName: '@seonggukchoi/typescript-template',
  rootDir: '../../',
  testRegex: `packages/typescript-template/src/${baseConfig.testRegex}`,
};

export default config;
