import { RegexBuilderExactOptions } from '../types';

export const convertPatternToExact = (pattern: string, options: RegexBuilderExactOptions): string => {
  const isExactStart = options.exact === true || (typeof options.exact === 'object' && options.exact.start === true);
  const isExactEnd = options.exact === true || (typeof options.exact === 'object' && options.exact.end === true);

  return `${isExactStart ? '^' : ''}${pattern}${isExactEnd ? '$' : ''}`;
};
