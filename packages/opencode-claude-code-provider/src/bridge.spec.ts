import { describe, expect, it } from 'vitest';

import { buildBridge } from './bridge.js';

describe('buildBridge', () => {
  it('classifies the native tool set and curated bridge tools', () => {
    const bridge = buildBridge({
      bridgeTools: ['question', 'task', 'todowrite', 'webfetch', 'oc_websearch', 'oc_apply_patch'],
      nativeTools: ['bash', 'read', 'write', 'edit', 'glob', 'grep'],
      prompt: [],
      tools: [
        { inputSchema: { type: 'object' }, name: 'bash', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'read', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'question', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'task', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'todowrite', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'webfetch', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'oc_websearch', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'oc_apply_patch', type: 'function' as const },
        { inputSchema: { type: 'object' }, name: 'custom_tool', type: 'function' as const },
      ],
    });

    expect(bridge.nativeTools).toEqual(['Bash', 'Read']);
    expect(bridge.bridgedToolNames).toEqual(['question', 'task', 'todowrite', 'webfetch', 'oc_websearch', 'oc_apply_patch']);
    expect(bridge.allowedTools).toContain('mcp__opencode__*');
  });

  it('registers generic tools and executes bridge handlers', async () => {
    const bridge = buildBridge({
      bridgeTools: [
        'question',
        'task',
        'todowrite',
        'webfetch',
        'websearch',
        'oc_websearch',
        'apply_patch',
        'codesearch',
        'custom',
        'missing_execute',
        'plain_string',
        'throws_execute',
        'circular_execute',
      ],
      prompt: [],
      tools: {
        apply_patch: {
          execute: async () => 'patched',
          inputSchema: { type: 'object' },
          type: 'function',
        },
        circular_execute: {
          execute: async () => {
            const value: { self?: unknown } = {};
            value.self = value;
            return value;
          },
          inputSchema: { properties: { query: { type: 'string' } }, type: 'object' },
          type: 'function',
        },
        custom: {
          description: 'Generic tool',
          execute: async (args: unknown) => ({ content: [{ text: JSON.stringify(args), type: 'text' }] }),
          inputSchema: { properties: { query: { type: 'string' } }, required: ['query'], type: 'object' },
          type: 'function',
        },
        codesearch: {
          execute: async () => 'searched',
          inputSchema: { type: 'object' },
          type: 'function',
        },
        invalid: 'bad',
        missing_execute: {
          inputSchema: { properties: { query: { type: 'string' } }, type: 'object' },
          type: 'function',
        },
        oc_websearch: {
          inputSchema: { type: 'object' },
          type: 'function',
        },
        plain_string: {
          execute: async () => 'ok',
          inputSchema: { properties: { query: { type: 'string' } }, type: 'object' },
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

    expect(Object.keys(registeredTools).sort()).toEqual([
      'apply_patch',
      'circular_execute',
      'codesearch',
      'custom',
      'missing_execute',
      'oc_websearch',
      'plain_string',
      'question',
      'task',
      'throws_execute',
      'todowrite',
      'webfetch',
      'websearch',
    ]);
    await expect(registeredTools.missing_execute.handler({ a: 1 })).resolves.toEqual({
      content: [{ text: 'Tool "missing_execute" is visible to Claude but no provider-side executor was attached.', type: 'text' }],
      isError: true,
    });
    await expect(registeredTools.custom.handler({ a: 1 })).resolves.toEqual({
      content: [{ text: '{"a":1}', type: 'text' }],
    });
    await expect(registeredTools.apply_patch.handler({ patchText: 'diff' })).resolves.toEqual({
      content: [{ text: 'patched', type: 'text' }],
    });
    await expect(registeredTools.codesearch.handler({ query: 'q' })).resolves.toEqual({
      content: [{ text: 'searched', type: 'text' }],
    });
    await expect(registeredTools.plain_string.handler({ a: 1 })).resolves.toEqual({
      content: [{ text: 'ok', type: 'text' }],
    });
    await expect(registeredTools.question.handler({ questions: [] })).resolves.toEqual({
      content: [{ text: 'Tool "question" is visible to Claude but no provider-side executor was attached.', type: 'text' }],
      isError: true,
    });
    await expect(registeredTools.task.handler({ description: 'x', prompt: 'y', subagent_type: 'general' })).resolves.toEqual({
      content: [{ text: 'Tool "task" is visible to Claude but no provider-side executor was attached.', type: 'text' }],
      isError: true,
    });
    await expect(registeredTools.todowrite.handler({ todos: [] })).resolves.toEqual({
      content: [{ text: 'Tool "todowrite" is visible to Claude but no provider-side executor was attached.', type: 'text' }],
      isError: true,
    });
    await expect(registeredTools.webfetch.handler({ format: 'markdown', url: 'https://example.com' })).resolves.toEqual({
      content: [{ text: 'Tool "webfetch" is visible to Claude but no provider-side executor was attached.', type: 'text' }],
      isError: true,
    });
    await expect(registeredTools.websearch.handler({ query: 'hello' })).resolves.toEqual({
      content: [{ text: 'Tool "websearch" is visible to Claude but no provider-side executor was attached.', type: 'text' }],
      isError: true,
    });
    await expect(registeredTools.oc_websearch.handler({ query: 'hello' })).resolves.toEqual({
      content: [{ text: 'Tool "oc_websearch" is visible to Claude but no provider-side executor was attached.', type: 'text' }],
      isError: true,
    });
    await expect(registeredTools.circular_execute.handler({ a: 1 })).resolves.toEqual({
      content: [{ text: '[object Object]', type: 'text' }],
    });
    await expect(registeredTools.throws_execute.handler({ a: 1 })).resolves.toEqual({
      content: [{ text: 'boom', type: 'text' }],
      isError: true,
    });
  });

  it('supports array tool inputs and skips unbridgeable schemas', () => {
    const arrayBridge = buildBridge({
      bridgeTools: ['custom'],
      prompt: [],
      tools: [
        { inputSchema: { properties: { query: { type: 'string' } }, type: 'object' }, name: 'custom', type: 'function' },
        { name: 'bad', type: 'provider-defined' } as unknown,
      ],
    });
    const invalidBridge = buildBridge({
      bridgeTools: ['custom'],
      prompt: [],
      tools: { custom: { inputSchema: { type: 'null' }, type: 'function' }, invalid: 'bad' },
    });
    const unknownBridge = buildBridge({
      prompt: [],
      tools: 'bad',
    });

    expect(arrayBridge.bridgedToolNames).toEqual(['custom']);
    expect(invalidBridge.bridgedToolNames).toEqual([]);
    expect(invalidBridge.allowedTools).toEqual([]);
    expect(unknownBridge.bridgedToolNames).toEqual([]);
  });
});
