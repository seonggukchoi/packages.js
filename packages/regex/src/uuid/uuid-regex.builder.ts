import { convertPatternToExact, convertOptionsToFlags } from '../helpers';

import { UUID_PATTERN } from './constants';
import { InvalidUuidVersionException } from './exceptions';
import { UuidRegexBuilderOptions } from './types';

export const buildUuidRegex = (options: UuidRegexBuilderOptions): RegExp => {
  const pattern = UUID_PATTERN[options.version];

  if (!pattern) {
    throw new InvalidUuidVersionException(options.version);
  }

  return new RegExp(convertPatternToExact(pattern, options), convertOptionsToFlags(options));
};
