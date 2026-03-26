import { describe, expect, it } from 'vitest';

import {
  DEFAULT_BRIDGE_TOOLS,
  DEFAULT_NATIVE_TOOLS,
  DEFAULT_TOOL_PREFERENCE,
  getBoolean,
  getNumber,
  getRecord,
  getString,
  getStringArray,
  isRecord,
  normalizeProviderOptions,
} from './types.js';

import type { QueryRunner } from './types.js';

describe('type helpers', () => {
  it('normalizes provider options and helper primitives', () => {
    const normalized = normalizeProviderOptions(
      {
        bridgeOpenCodeMcp: true,
        bridgeTools: ['question'],
        claudeMdPath: '/repo/CLAUDE.md',
        cwd: '/repo',
        effort: 'high',
        env: { A: '1', B: undefined },
        loadClaudeMd: true,
        maxTurns: 5,
        mcpServers: { github: { type: 'stdio' } },
        nativeTools: ['read'],
        openCodeMcp: { github: { command: ['node'], type: 'local' } },
        pathToClaudeCodeExecutable: '/usr/local/bin/claude',
        permissionMode: 'default',
        settingSources: ['local'],
        toolPreference: 'claude-first',
      },
      { env: { BASE: '1' } },
    );

    expect(normalized.bridgeOpenCodeMcp).toBe(true);
    expect(normalized.bridgeTools).toEqual(['question']);
    expect(normalized.claudeMdPath).toBe('/repo/CLAUDE.md');
    expect(normalized.cwd).toBe('/repo');
    expect(normalized.effort).toBe('high');
    expect(normalized.env.BASE).toBe('1');
    expect(normalized.env.A).toBeUndefined();
    expect(normalized.loadClaudeMd).toBe(true);
    expect(normalized.maxTurns).toBe(5);
    expect(normalized.mcpServers).toEqual({ github: { type: 'stdio' } });
    expect(normalized.nativeTools).toEqual(['read']);
    expect(normalized.openCodeMcp).toEqual({ github: { command: ['node'], type: 'local' } });
    expect(normalized.pathToClaudeCodeExecutable).toBe('/usr/local/bin/claude');
    expect(normalized.permissionMode).toBe('default');
    expect(normalized.settingSources).toEqual(['local']);
    expect(normalized.toolPreference).toBe('claude-first');

    expect(normalizeProviderOptions(undefined, {} as Parameters<typeof normalizeProviderOptions>[1]).bridgeTools).toEqual([
      ...DEFAULT_BRIDGE_TOOLS,
    ]);
    expect(normalizeProviderOptions(undefined, {} as Parameters<typeof normalizeProviderOptions>[1]).nativeTools).toEqual([
      ...DEFAULT_NATIVE_TOOLS,
    ]);
    expect(normalizeProviderOptions(undefined, {} as Parameters<typeof normalizeProviderOptions>[1]).toolPreference).toBe(
      DEFAULT_TOOL_PREFERENCE,
    );
    expect(
      normalizeProviderOptions({ toolPreference: 'opencode-only' }, {} as Parameters<typeof normalizeProviderOptions>[1]).toolPreference,
    ).toBe('opencode-only');
    expect(normalizeProviderOptions({ env: { A: '1' } }, {} as Parameters<typeof normalizeProviderOptions>[1]).env.A).toBe('1');
    expect(() =>
      normalizeProviderOptions(undefined, {} as Parameters<typeof normalizeProviderOptions>[1]).queryRunner({
        prompt: 'hi',
      } as Parameters<QueryRunner>[0]),
    ).toThrow('Query runner is not configured.');
    expect(getString('x')).toBe('x');
    expect(getString('')).toBeUndefined();
    expect(getBoolean(true)).toBe(true);
    expect(getBoolean('x')).toBeUndefined();
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
