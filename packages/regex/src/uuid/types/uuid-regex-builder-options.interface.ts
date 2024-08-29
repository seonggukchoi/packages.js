import { RegexBuilderOptions } from '../../types';

import { UuidVersion } from './uuid-version.type';

/**
 * Options for the UUID regex builder.
 */
export type UuidRegexBuilderOptions = RegexBuilderOptions & {
  /**
   * The version of the UUID to build the regex for.
   * @example UUID_VERSION.V4
   * @default UUID_VERSION.V4
   */
  version: UuidVersion;
};
