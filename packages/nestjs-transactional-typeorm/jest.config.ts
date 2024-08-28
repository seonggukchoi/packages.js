import baseConfig from '../../jest.config';

import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  ...baseConfig,
  displayName: '@seonggukchoi/nestjs-transactional-typeorm',
  rootDir: '../../',
  testRegex: `packages/nestjs-transactional-typeorm/src/${baseConfig.testRegex}`,
};

export default config;
