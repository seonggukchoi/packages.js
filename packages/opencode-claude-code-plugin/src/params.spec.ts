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
      bridgeTools: undefined,
      claudeMdPath: undefined,
      cwd: '/workspace',
      effort: 'high',
      env: {},
      loadClaudeMd: false,
      maxTurns: 12,
      mcpServers: {},
      nativeTools: undefined,
      pathToClaudeCodeExecutable: 'claude',
      permissionMode: undefined,
      settingSources: [],
      toolPreference: 'opencode-first',
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
        bridgeTools: ['question', 123],
        claudeMdPath: '',
        cwd: '',
        effort: 'bad',
        env: { A: '1', B: 2 },
        loadClaudeMd: 'bad',
        maxTurns: Number.NaN,
        mcpServers: [],
        nativeTools: ['bash', 123],
        pathToClaudeCodeExecutable: '',
        permissionMode: 'bad',
        settingSources: ['settings.json', 123],
        toolPreference: 'bad',
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
      bridgeTools: ['question'],
      claudeMdPath: undefined,
      cwd: '/workspace',
      effort: undefined,
      env: { A: '1' },
      loadClaudeMd: false,
      maxTurns: 12,
      mcpServers: {},
      nativeTools: ['bash'],
      pathToClaudeCodeExecutable: 'claude',
      permissionMode: undefined,
      settingSources: ['settings.json'],
      toolPreference: 'opencode-first',
    });
  });

  it('preserves valid booleans, numbers, and non-empty strings', () => {
    const output = {
      options: {
        bridgeOpenCodeMcp: true,
        bridgeTools: ['question'],
        claudeMdPath: '/repo/CLAUDE.md',
        cwd: '/custom',
        effort: 'medium',
        env: { A: '1' },
        loadClaudeMd: true,
        maxTurns: 7,
        mcpServers: { github: { type: 'local' } },
        nativeTools: ['bash'],
        pathToClaudeCodeExecutable: '/usr/local/bin/claude',
        permissionMode: 'default',
        settingSources: [],
        toolPreference: 'claude-first',
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
      bridgeTools: ['question'],
      claudeMdPath: '/repo/CLAUDE.md',
      cwd: '/custom',
      effort: 'medium',
      env: { A: '1' },
      loadClaudeMd: true,
      maxTurns: 7,
      mcpServers: { github: { type: 'local' } },
      nativeTools: ['bash'],
      pathToClaudeCodeExecutable: '/usr/local/bin/claude',
      permissionMode: 'default',
      settingSources: [],
      toolPreference: 'claude-first',
    });
  });
});
