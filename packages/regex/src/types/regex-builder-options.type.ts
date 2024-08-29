import { RegexBuilderExactOptions } from './regex-builder-exact-options.type';
import { RegexBuilderFlagOptions } from './regex-builder-flag-options.type';

/**
 * Options for the regex builder.
 */
export type RegexBuilderOptions = RegexBuilderFlagOptions & RegexBuilderExactOptions;
