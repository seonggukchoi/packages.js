import { describe, expect, it } from 'vitest';

import { coerceStringValue, deepParseStringifiedJsonValues, normalizeToolArguments } from './tool-argument-normalizer.js';

describe('coerceStringValue', () => {
  it('coerces "true" to boolean true', () => {
    expect(coerceStringValue('true')).toBe(true);
  });

  it('coerces "false" to boolean false', () => {
    expect(coerceStringValue('false')).toBe(false);
  });

  it('coerces "null" to null', () => {
    expect(coerceStringValue('null')).toBe(null);
  });

  it('coerces integer strings to numbers', () => {
    expect(coerceStringValue('42')).toBe(42);
    expect(coerceStringValue('0')).toBe(0);
    expect(coerceStringValue('-7')).toBe(-7);
  });

  it('coerces decimal strings to numbers', () => {
    expect(coerceStringValue('3.14')).toBe(3.14);
    expect(coerceStringValue('-0.5')).toBe(-0.5);
  });

  it('coerces stringified JSON arrays', () => {
    expect(coerceStringValue('[1,2,3]')).toEqual([1, 2, 3]);
    expect(coerceStringValue('["a","b"]')).toEqual(['a', 'b']);
  });

  it('coerces stringified JSON objects', () => {
    expect(coerceStringValue('{"key":"value"}')).toEqual({ key: 'value' });
  });

  it('trims whitespace before coercing', () => {
    expect(coerceStringValue('  true  ')).toBe(true);
    expect(coerceStringValue(' 42 ')).toBe(42);
    expect(coerceStringValue(' [1] ')).toEqual([1]);
  });

  it('returns undefined for plain strings', () => {
    expect(coerceStringValue('hello')).toBeUndefined();
    expect(coerceStringValue('')).toBeUndefined();
    expect(coerceStringValue('/path/to/file')).toBeUndefined();
  });

  it('returns undefined for invalid JSON arrays/objects', () => {
    expect(coerceStringValue('[invalid')).toBeUndefined();
    expect(coerceStringValue('{broken}')).toBeUndefined();
  });

  it('returns undefined for numbers longer than 20 characters', () => {
    expect(coerceStringValue('123456789012345678901')).toBeUndefined();
  });
});

describe('deepParseStringifiedJsonValues', () => {
  it('coerces string values in a flat record', () => {
    expect(
      deepParseStringifiedJsonValues({
        count: '5',
        flag: 'true',
        items: '[1,2,3]',
        name: 'test',
        nothing: 'null',
      }),
    ).toEqual({
      count: 5,
      flag: true,
      items: [1, 2, 3],
      name: 'test',
      nothing: null,
    });
  });

  it('preserves non-string values as-is', () => {
    expect(
      deepParseStringifiedJsonValues({
        arr: [1, 2],
        flag: true,
        num: 42,
      }),
    ).toEqual({
      arr: [1, 2],
      flag: true,
      num: 42,
    });
  });

  it('preserves strings that cannot be coerced', () => {
    expect(
      deepParseStringifiedJsonValues({
        path: '/home/user/file.ts',
        text: 'hello world',
      }),
    ).toEqual({
      path: '/home/user/file.ts',
      text: 'hello world',
    });
  });
});

describe('normalizeToolArguments', () => {
  it('returns undefined for non-record, non-string values', () => {
    expect(normalizeToolArguments(42)).toBeUndefined();
    expect(normalizeToolArguments(null)).toBeUndefined();
    expect(normalizeToolArguments(undefined)).toBeUndefined();
    expect(normalizeToolArguments(true)).toBeUndefined();
  });

  it('parses a record and deep-coerces its values', () => {
    expect(normalizeToolArguments({ count: '3', name: 'test' })).toEqual({ count: 3, name: 'test' });
  });

  it('parses a JSON string into a record and deep-coerces', () => {
    expect(normalizeToolArguments('{"count":"3","name":"test"}')).toEqual({ count: 3, name: 'test' });
  });

  it('returns undefined for non-object JSON strings', () => {
    expect(normalizeToolArguments('"hello"')).toBeUndefined();
    expect(normalizeToolArguments('[1,2,3]')).toBeUndefined();
  });

  it('returns undefined for invalid JSON strings', () => {
    expect(normalizeToolArguments('{broken')).toBeUndefined();
  });

  it('handles nested stringified arrays in tool arguments', () => {
    const todos = JSON.stringify([{ content: 'Task 1', status: 'pending' }]);
    expect(normalizeToolArguments({ todos })).toEqual({
      todos: [{ content: 'Task 1', status: 'pending' }],
    });
  });
});
