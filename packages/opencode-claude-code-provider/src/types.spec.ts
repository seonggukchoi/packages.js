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
        effort: 'high',
        env: { API_URL: 'https://example.com' },
        pathToClaudeCodeExecutable: '/usr/local/bin/claude',
      },
      {
        env: { BASE_URL: 'https://default.example.com' },
      },
    );

    expect(normalized).toMatchObject({
      effort: 'high',
      pathToClaudeCodeExecutable: '/usr/local/bin/claude',
    });
    expect(normalized.env.BASE_URL).toBe('https://default.example.com');
    expect(normalized.env.API_URL).toBe('https://example.com');
  });
});

describe('sessionId normalization', () => {
  it('passes through a valid UUID', () => {
    const normalized = normalizeProviderOptions({ sessionId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }, {});

    expect(normalized.sessionId).toBe('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');
  });

  it('converts a non-UUID string to a deterministic UUID v5', () => {
    const normalized = normalizeProviderOptions({ sessionId: 'my-opencode-session' }, {});

    expect(normalized.sessionId).toMatch(/^[\da-f]{8}-[\da-f]{4}-5[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);

    const again = normalizeProviderOptions({ sessionId: 'my-opencode-session' }, {});

    expect(again.sessionId).toBe(normalized.sessionId);
  });

  it('returns undefined for empty or missing sessionId', () => {
    expect(normalizeProviderOptions({ sessionId: '' }, {}).sessionId).toBeUndefined();
    expect(normalizeProviderOptions({}, {}).sessionId).toBeUndefined();
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
