import baseConfig from '../../jest.config';

import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  ...baseConfig,
  displayName: '@seonggukchoi/{{PACKAGE_NAME}}',
  rootDir: '../../',
  testRegex: `packages/{{PACKAGE_NAME}}/src/${baseConfig.testRegex}`,
};

export default config;
