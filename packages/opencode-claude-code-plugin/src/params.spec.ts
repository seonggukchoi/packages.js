import { describe, expect, it } from 'vitest';

import { normalizeChatParams } from './params.js';

describe('normalizeChatParams', () => {
  it('fills default values for the claude-code provider', () => {
    const output = {
      options: {
        effort: 'high',
      },
    };

    normalizeChatParams(
      {
        model: {
          providerID: 'claude-code',
        },
      },
      output,
      { cwd: '/workspace' },
    );

    expect(output.options).toEqual({
      claudeMdPath: undefined,
      cwd: '/workspace',
      effort: 'high',
      env: {},
      loadClaudeMd: false,
      maxTurns: 1,
      pathToClaudeCodeExecutable: 'claude',
      permissionMode: undefined,
    });
  });

  it('does nothing for other providers', () => {
    const output = {
      options: {
        cwd: '/tmp',
      },
    };

    normalizeChatParams(
      {
        model: {
          providerID: 'openai',
        },
      },
      output,
      { cwd: '/workspace' },
    );

    expect(output.options).toEqual({ cwd: '/tmp' });
  });

  it('normalizes invalid values to safe defaults', () => {
    const output = {
      options: {
        claudeMdPath: '',
        cwd: '',
        effort: 'bad',
        env: { A: '1', B: 2 },
        loadClaudeMd: 'bad',
        maxTurns: Number.NaN,
        pathToClaudeCodeExecutable: '',
        permissionMode: 'bad',
      },
    };

    normalizeChatParams(
      {
        model: {
          providerID: 'claude-code',
        },
      },
      output,
      { cwd: '/workspace' },
    );

    expect(output.options).toEqual({
      claudeMdPath: undefined,
      cwd: '/workspace',
      effort: undefined,
      env: { A: '1' },
      loadClaudeMd: false,
      maxTurns: 1,
      pathToClaudeCodeExecutable: 'claude',
      permissionMode: undefined,
    });
  });

  it('preserves valid booleans, numbers, and non-empty strings', () => {
    const output = {
      options: {
        claudeMdPath: '/repo/CLAUDE.md',
        cwd: '/custom',
        effort: 'medium',
        env: { A: '1' },
        loadClaudeMd: true,
        maxTurns: 7,
        pathToClaudeCodeExecutable: '/usr/local/bin/claude',
        permissionMode: 'default',
      },
    };

    normalizeChatParams(
      {
        model: {
          providerID: 'claude-code',
        },
      },
      output,
      { cwd: '/workspace' },
    );

    expect(output.options).toEqual({
      claudeMdPath: '/repo/CLAUDE.md',
      cwd: '/custom',
      effort: 'medium',
      env: { A: '1' },
      loadClaudeMd: true,
      maxTurns: 7,
      pathToClaudeCodeExecutable: '/usr/local/bin/claude',
      permissionMode: 'default',
    });
  });
});
