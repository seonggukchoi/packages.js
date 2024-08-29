import { RegexBuilderFlagOptions } from '../types';

export const convertOptionsToFlags = (options: RegexBuilderFlagOptions): string => {
  return [...(options.caseSensitive ? ['i'] : []), ...(options.global ? ['g'] : [])].join('');
};
