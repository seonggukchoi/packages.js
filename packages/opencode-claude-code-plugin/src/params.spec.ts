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
      bridgeOpenCodeMcp: false,
      claudeMdPath: undefined,
      cwd: '/workspace',
      effort: 'high',
      env: {},
      loadClaudeMd: false,
      maxTurns: 12,
      mcpServers: {},
      pathToClaudeCodeExecutable: 'claude',
      settingSources: [],
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
        bridgeOpenCodeMcp: 'bad',
        claudeMdPath: '',
        cwd: '',
        effort: 'bad',
        env: { A: '1', B: 2 },
        loadClaudeMd: 'bad',
        maxTurns: Number.NaN,
        mcpServers: [],
        pathToClaudeCodeExecutable: '',
        settingSources: ['settings.json', 123],
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
      bridgeOpenCodeMcp: false,
      claudeMdPath: undefined,
      cwd: '/workspace',
      effort: undefined,
      env: { A: '1' },
      loadClaudeMd: false,
      maxTurns: 12,
      mcpServers: {},
      pathToClaudeCodeExecutable: 'claude',
      settingSources: ['settings.json'],
    });
  });

  it('preserves valid booleans, numbers, and non-empty strings', () => {
    const output = {
      options: {
        bridgeOpenCodeMcp: true,
        claudeMdPath: '/repo/CLAUDE.md',
        cwd: '/custom',
        effort: 'medium',
        env: { A: '1' },
        loadClaudeMd: true,
        maxTurns: 7,
        mcpServers: { github: { type: 'local' } },
        pathToClaudeCodeExecutable: '/usr/local/bin/claude',
        settingSources: [],
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
      bridgeOpenCodeMcp: true,
      claudeMdPath: '/repo/CLAUDE.md',
      cwd: '/custom',
      effort: 'medium',
      env: { A: '1' },
      loadClaudeMd: true,
      maxTurns: 7,
      mcpServers: { github: { type: 'local' } },
      pathToClaudeCodeExecutable: '/usr/local/bin/claude',
      settingSources: [],
    });
  });
});
