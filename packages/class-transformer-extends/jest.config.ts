import baseConfig, { getDefaultCoverageDirectory, getDefaultTestRegex } from '../../jest.config';

import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  ...baseConfig,
  testRegex: getDefaultTestRegex(__dirname),
  coverageDirectory: getDefaultCoverageDirectory(__dirname),
};

export default config;
