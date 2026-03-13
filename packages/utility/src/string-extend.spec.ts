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

    it('should strip leading underscore when input starts with uppercase.', () => {
      expect(StringExtend.camelToSnake('CamelCase')).toBe('camel_case');
    });

    it('should convert each consecutive uppercase letter individually.', () => {
      expect(StringExtend.camelToSnake('HTMLParser')).toBe('h_t_m_l_parser');
    });

    it('should return the same single lowercase character.', () => {
      expect(StringExtend.camelToSnake('a')).toBe('a');
    });

    it('should return an empty string for empty input.', () => {
      expect(StringExtend.camelToSnake('')).toBe('');
    });

    it('should return the same string when all lowercase.', () => {
      expect(StringExtend.camelToSnake('lowercase')).toBe('lowercase');
    });

    it('should convert a single uppercase character to lowercase.', () => {
      expect(StringExtend.camelToSnake('A')).toBe('a');
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

    it('should only convert the second underscore in consecutive underscores.', () => {
      expect(StringExtend.snakeToCamel('a__b')).toBe('a_B');
    });

    it('should return the same single lowercase character.', () => {
      expect(StringExtend.snakeToCamel('a')).toBe('a');
    });

    it('should return an empty string for empty input.', () => {
      expect(StringExtend.snakeToCamel('')).toBe('');
    });

    it('should not convert uppercase letter after underscore.', () => {
      expect(StringExtend.snakeToCamel('a_B')).toBe('a_B');
    });

    it('should preserve trailing underscore when no lowercase follows.', () => {
      expect(StringExtend.snakeToCamel('test_')).toBe('test_');
    });

    it('should convert leading underscore followed by lowercase letter.', () => {
      expect(StringExtend.snakeToCamel('_test')).toBe('Test');
    });
  });
});
