import { StringExtend } from './string-extend';

describe('StringExtend', () => {
  describe('camelToSnake', () => {
    const camelCase = 'camelCase';
    const snakeCase = 'camel_case';

    it('should convert `camelCase` to `camel_case` via public method.', () => {
      expect(new StringExtend(camelCase).camelToSnake()).toBe(snakeCase);
    });

    it('should convert `camelCase` to `camel_case` via static method.', () => {
      expect(StringExtend.camelToSnake(camelCase)).toBe(snakeCase);
    });
  });

  describe('snakeToCamel', () => {
    const snakeCase = 'snake_case';
    const camelCase = 'snakeCase';

    it('should convert `snake_case` to `snakeCase` via public method.', () => {
      expect(new StringExtend(snakeCase).snakeToCamel()).toBe(camelCase);
    });

    it('should convert `snake_case` to `snakeCase` via static method.', () => {
      expect(StringExtend.snakeToCamel(snakeCase)).toBe(camelCase);
    });
  });
});
