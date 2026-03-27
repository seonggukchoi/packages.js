import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EXECUTABLE_PATH,
  DEFAULT_MAX_TURNS,
  DEFAULT_PERMISSION_MODE,
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

    expect(normalized.cwd).toBe(process.cwd());
    expect(normalized.env.PATH).toBeTypeOf('string');
    expect(normalized.loadClaudeMd).toBe(false);
    expect(normalized.maxTurns).toBe(DEFAULT_MAX_TURNS);
    expect(normalized.pathToClaudeCodeExecutable).toBe(DEFAULT_EXECUTABLE_PATH);
    expect(normalized.permissionMode).toBe(DEFAULT_PERMISSION_MODE);
  });

  it('applies raw option overrides', () => {
    const normalized = normalizeProviderOptions(
      {
        claudeMdPath: '/repo/CLAUDE.md',
        cwd: '/repo',
        effort: 'high',
        env: { API_URL: 'https://example.com' },
        loadClaudeMd: true,
        maxTurns: 3,
        pathToClaudeCodeExecutable: '/usr/local/bin/claude',
        permissionMode: 'plan',
      },
      {
        env: { BASE_URL: 'https://default.example.com' },
      },
    );

    expect(normalized).toMatchObject({
      claudeMdPath: '/repo/CLAUDE.md',
      cwd: '/repo',
      effort: 'high',
      loadClaudeMd: true,
      maxTurns: 3,
      pathToClaudeCodeExecutable: '/usr/local/bin/claude',
      permissionMode: 'plan',
    });
    expect(normalized.env.BASE_URL).toBe('https://default.example.com');
    expect(normalized.env.API_URL).toBe('https://example.com');
  });

  it('ignores invalid permission modes', () => {
    const normalized = normalizeProviderOptions(
      {
        permissionMode: 'invalid-mode',
      },
      {
        permissionMode: 'dontAsk',
      },
    );

    expect(normalized.permissionMode).toBe('dontAsk');
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
