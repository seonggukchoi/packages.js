export class StringExtend extends String {
  /**
   * Convert `camelCase` to `snake_case`.
   * @returns Case converted string.
   * @example StringExtend.camelToSnake('camelCase'); // 'camel_case'
   */
  public static camelToSnake(value: string): string {
    return new this(value).camelToSnake();
  }

  /**
   * Convert `snake_case` to `camelCase`.
   * @returns Case converted string.
   * @example StringExtend.snakeToCamel('snake_case'); // 'snakeCase'
   */
  public static snakeToCamel(value: string): string {
    return new this(value).snakeToCamel();
  }

  /**
   * Convert `camelCase` to `snake_case`.
   * @returns Case converted string.
   * @example new StringExtend('camelCase').camelToSnake(); // 'camel_case'
   */
  public camelToSnake(): string {
    return this.valueOf()
      .replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`)
      .replace(/(^_)|(_$)/, '');
  }

  /**
   * Convert `snake_case` to `camelCase`.
   * @returns Case converted string.
   * @example new StringExtend('snake_case').snakeToCamel(); // 'snakeCase'
   */
  public snakeToCamel(): string {
    return this.valueOf().replace(/_([a-z])/g, (match) => match[1].toUpperCase());
  }
}
