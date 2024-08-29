export type RegexBuilderFlagOptions = {
  /**
   * Whether the regex should be case-sensitive.
   * This is equivalent to using the `i` flag.
   * @example true
   * @default false
   */
  caseSensitive?: boolean;

  /**
   * Whether the regex should be global.
   * This is equivalent to using the `g` flag.
   * @example true
   * @default false
   */
  global?: boolean;
};
