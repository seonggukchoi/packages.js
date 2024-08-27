import baseConfig from '../../jest.config';

import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  ...baseConfig,
  displayName: '@seonggukchoi/nestjs-contextual-pino',
  rootDir: '../../',
  testRegex: `packages/nestjs-contextual-pino/src/${baseConfig.testRegex}`,
};

export default config;
