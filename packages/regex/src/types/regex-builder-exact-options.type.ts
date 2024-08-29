export type RegexBuilderExactOptions = {
  /**
   * Whether the regex should match the whole string.
   * This is equivalent to using the `^` and `$` anchors.
   *
   * When `true`, it is equivalent to using the `^` and `$` anchors.
   *
   * When an object, it allows to specify whether the regex should match the start and/or the end of the string.
   *
   * @example true
   * @default false
   */
  exact?: boolean | { start?: boolean; end?: boolean };
};
