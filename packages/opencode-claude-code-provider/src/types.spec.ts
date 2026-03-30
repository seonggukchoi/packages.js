import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EXECUTABLE_PATH,
  getBoolean,
  getNumber,
  getRecord,
  getString,
  getStringArray,
  isRecord,
  normalizeProviderOptions,
} from './types.js';

describe('normalizeProviderOptions', () => {
  it('applies defaults', () => {
    const normalized = normalizeProviderOptions(undefined, {});

    expect(normalized.env.PATH).toBeTypeOf('string');
    expect(normalized.pathToClaudeCodeExecutable).toBe(DEFAULT_EXECUTABLE_PATH);
  });

  it('applies raw option overrides', () => {
    const normalized = normalizeProviderOptions(
      {
        env: { API_URL: 'https://example.com' },
        pathToClaudeCodeExecutable: '/usr/local/bin/claude',
      },
      {
        env: { BASE_URL: 'https://default.example.com' },
      },
    );

    expect(normalized).toMatchObject({
      pathToClaudeCodeExecutable: '/usr/local/bin/claude',
    });
    expect(normalized.env.BASE_URL).toBe('https://default.example.com');
    expect(normalized.env.API_URL).toBe('https://example.com');
  });
});

describe('type helpers', () => {
  it('normalizes primitive helper values', () => {
    expect(getString('x')).toBe('x');
    expect(getString('')).toBeUndefined();
    expect(getBoolean(true)).toBe(true);
    expect(getBoolean('true')).toBeUndefined();
    expect(getNumber(1)).toBe(1);
    expect(getNumber(Number.NaN)).toBeUndefined();
    expect(getStringArray(['a', '', 'b'])).toEqual(['a', 'b']);
    expect(getStringArray([''])).toEqual([]);
    expect(getStringArray('bad')).toBeUndefined();
    expect(getRecord({ a: 1 })).toEqual({ a: 1 });
    expect(getRecord(null)).toBeUndefined();
    expect(isRecord({})).toBe(true);
    expect(isRecord(null)).toBe(false);
  });
});
