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
        sessionID: 'sess-123',
        agent: 'coder',
      },
      output,
    );

    expect(output.options).toEqual({
      effort: 'high',
      env: {},
      pathToClaudeCodeExecutable: 'claude',
      sessionId: 'sess-123',
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
        sessionID: 'sess-456',
        agent: 'coder',
      },
      output,
    );

    expect(output.options).toEqual({ cwd: '/tmp' });
  });

  it('normalizes invalid values to safe defaults', () => {
    const output = {
      options: {
        effort: 'bad',
        env: { A: '1', B: 2 },
        pathToClaudeCodeExecutable: '',
      },
    };

    normalizeChatParams(
      {
        model: {
          providerID: 'claude-code',
        },
        sessionID: 'sess-123',
        agent: 'coder',
      },
      output,
    );

    expect(output.options).toEqual({
      effort: undefined,
      env: { A: '1' },
      pathToClaudeCodeExecutable: 'claude',
      sessionId: 'sess-123',
    });
  });

  it('preserves valid values', () => {
    const output = {
      options: {
        effort: 'medium',
        env: { A: '1' },
        pathToClaudeCodeExecutable: '/usr/local/bin/claude',
      },
    };

    normalizeChatParams(
      {
        model: {
          providerID: 'claude-code',
        },
        sessionID: 'sess-123',
        agent: 'coder',
      },
      output,
    );

    expect(output.options).toEqual({
      effort: 'medium',
      env: { A: '1' },
      pathToClaudeCodeExecutable: '/usr/local/bin/claude',
      sessionId: 'sess-123',
    });
  });
});
