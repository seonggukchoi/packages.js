import { describe, expect, it } from 'vitest';

import { buildBridge } from './bridge.js';

describe('buildBridge', () => {
  it('prefers OpenCode bridge tools when provider-side executors are attached', () => {
    const bridge = buildBridge({
      bridgeTools: ['bash', 'read', 'question'],
      nativeTools: ['bash', 'read'],
      prompt: [],
      toolPreference: 'opencode-first',
      tools: {
        bash: {
          execute: async () => 'ok',
          inputSchema: { properties: { command: { type: 'string' } }, type: 'object' },
          type: 'function',
        },
        question: {
          execute: async () => 'ok',
          inputSchema: { type: 'object' },
          type: 'function',
        },
        read: {
          execute: async () => 'ok',
          inputSchema: { properties: { filePath: { type: 'string' } }, type: 'object' },
          type: 'function',
        },
      },
    });

    expect(bridge.nativeTools).toEqual([]);
    expect(bridge.bridgedToolNames).toEqual(['bash', 'question', 'read']);
    expect(bridge.allowedTools).toEqual(['mcp__opencode__*']);
    expect(bridge.permissionPromptToolName).toBe('mcp__opencode__question');
    expect(bridge.warnings).toEqual([]);
  });

  it('falls back to Claude native tools and hides broken OpenCode tools without executors', () => {
    const bridge = buildBridge({
      bridgeTools: ['bash', 'question'],
      nativeTools: ['bash'],
      prompt: [],
      toolPreference: 'opencode-first',
      tools: [
        { inputSchema: { type: 'object' }, name: 'bash', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'question', type: 'function' as const },
      ],
    });

    expect(bridge.nativeTools).toEqual(['Bash']);
    expect(bridge.bridgedToolNames).toEqual([]);
    expect(bridge.allowedTools).toEqual(['Bash']);
    expect(bridge.permissionPromptToolName).toBeUndefined();
    expect(bridge.warnings).toEqual(['Skipping OpenCode tool "question" because no provider-side executor was attached.']);
  });

  it('registers executable bridge handlers and skips non-executable tool definitions', async () => {
    const bridge = buildBridge({
      bridgeTools: ['question', 'task', 'todowrite', 'webfetch', 'websearch', 'oc_websearch', 'apply_patch', 'codesearch', 'custom'],
      prompt: [],
      tools: {
        apply_patch: {
          execute: async () => 'patched',
          inputSchema: { type: 'object' },
          type: 'function',
        },
        codesearch: {
          execute: async () => 'searched',
          inputSchema: { type: 'object' },
          type: 'function',
        },
        custom: {
          description: 'Generic tool',
          execute: async (args: unknown) => ({ content: [{ text: JSON.stringify(args), type: 'text' }] }),
          inputSchema: { properties: { query: { type: 'string' } }, required: ['query'], type: 'object' },
          type: 'function',
        },
        invalid: 'bad',
        oc_websearch: {
          inputSchema: { type: 'object' },
          type: 'function',
        },
        question: {
          inputSchema: { type: 'object' },
          type: 'function',
        },
        task: {
          inputSchema: { type: 'object' },
          type: 'function',
        },
        throws_execute: {
          execute: async () => {
            throw new Error('boom');
          },
          inputSchema: { properties: { query: { type: 'string' } }, type: 'object' },
          type: 'function',
        },
        todowrite: {
          inputSchema: { type: 'object' },
          type: 'function',
        },
        webfetch: {
          inputSchema: { type: 'object' },
          type: 'function',
        },
        websearch: {
          inputSchema: { type: 'object' },
          type: 'function',
        },
      },
    });
    const registeredTools = (
      bridge.mcpServers.opencode as unknown as {
        instance: { _registeredTools: Record<string, { handler: (args: unknown) => Promise<unknown> }> };
      }
    ).instance._registeredTools as Record<string, { handler: (args: unknown) => Promise<unknown> }>;

    expect(Object.keys(registeredTools).sort()).toEqual(['apply_patch', 'codesearch', 'custom']);
    expect(bridge.warnings).toEqual([
      'Skipping OpenCode tool "oc_websearch" because no provider-side executor was attached.',
      'Skipping OpenCode tool "question" because no provider-side executor was attached.',
      'Skipping OpenCode tool "task" because no provider-side executor was attached.',
      'Skipping OpenCode tool "todowrite" because no provider-side executor was attached.',
      'Skipping OpenCode tool "webfetch" because no provider-side executor was attached.',
      'Skipping OpenCode tool "websearch" because no provider-side executor was attached.',
    ]);
    await expect(registeredTools.custom.handler({ a: 1 })).resolves.toEqual({
      content: [{ text: '{"a":1}', type: 'text' }],
    });
    await expect(registeredTools.apply_patch.handler({ patchText: 'diff' })).resolves.toEqual({
      content: [{ text: 'patched', type: 'text' }],
    });
    await expect(registeredTools.codesearch.handler({ query: 'q' })).resolves.toEqual({
      content: [{ text: 'searched', type: 'text' }],
    });
  });

  it('supports array tool inputs and skips unbridgeable schemas', () => {
    const arrayBridge = buildBridge({
      bridgeTools: ['custom'],
      prompt: [],
      tools: {
        custom: {
          execute: async () => 'ok',
          inputSchema: { properties: { query: { type: 'string' } }, type: 'object' },
          type: 'function',
        },
      },
    });
    const invalidBridge = buildBridge({
      bridgeTools: ['custom'],
      prompt: [],
      tools: {
        custom: {
          execute: async () => 'ok',
          inputSchema: { type: 'null' },
          type: 'function',
        },
        invalid: 'bad',
      },
    });
    const unknownBridge = buildBridge({
      prompt: [],
      tools: 'bad',
    });

    expect(arrayBridge.bridgedToolNames).toEqual(['custom']);
    expect(invalidBridge.bridgedToolNames).toEqual([]);
    expect(invalidBridge.allowedTools).toEqual([]);
    expect(invalidBridge.warnings).toEqual([
      'Skipping OpenCode tool "custom" because its schema could not be converted for the Claude Agent SDK bridge.',
    ]);
    expect(unknownBridge.bridgedToolNames).toEqual([]);
  });
});
