import { describe, expect, it } from 'vitest';

import { createStreamState } from './messages.js';
import { buildToolSystemPrompt, createToolCallTextState, processTextBuffer } from './model.js';

import type { LanguageModelV2StreamPart } from '@ai-sdk/provider';

describe('buildToolSystemPrompt', () => {
  it('serializes function tools from arrays and object maps', () => {
    const prompt = buildToolSystemPrompt([
      {
        description: 'Run shell commands.',
        inputSchema: {
          properties: {
            command: { type: 'string' },
          },
          required: ['command'],
          type: 'object',
        },
        name: 'bash',
        type: 'function' as const,
      },
      {
        name: 'ignored-provider-tool',
        type: 'provider-defined' as const,
      },
    ]);

    const mappedPrompt = buildToolSystemPrompt({
      read: {
        description: 'Read a file.',
        inputSchema: {
          properties: {
            filePath: { type: 'string' },
          },
          required: ['filePath'],
          type: 'object',
        },
        type: 'function' as const,
      },
    });

    expect(prompt).toContain('<tool_call>');
    expect(prompt).toContain('bash');
    expect(prompt).toContain('Run shell commands.');
    expect(prompt).toContain('"command"');
    expect(prompt).toContain('Tool selection rules:');
    expect(prompt).toContain('use `todowrite` instead of `task`');
    expect(mappedPrompt).toContain('read');
    expect(mappedPrompt).toContain('Read a file.');
  });

  it('sorts known tools so explicit task-list tools appear first', () => {
    const prompt = buildToolSystemPrompt([
      {
        inputSchema: { type: 'object' },
        name: 'task',
        type: 'function' as const,
      },
      {
        inputSchema: { type: 'object' },
        name: 'todowrite',
        type: 'function' as const,
      },
    ]);

    expect(prompt?.indexOf('- todowrite')).toBeLessThan(prompt?.indexOf('- task') ?? 0);
    expect(prompt).toContain('Do not use `task` for TODO lists');
  });

  it('returns undefined when no callable tools exist', () => {
    expect(buildToolSystemPrompt(undefined)).toBeUndefined();
    expect(buildToolSystemPrompt([{ name: 'search', type: 'provider-defined' }])).toBeUndefined();
  });
});

describe('processTextBuffer', () => {
  it('suppresses surrounding text when a tool-call tag is present', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    const startParts = processTextBuffer({ id: 'text-0', type: 'text-start' }, streamState, textState);
    const deltaParts = processTextBuffer(
      {
        delta: 'Before <tool_call>{"name":"bash","arguments":{"command":"ls"}}</tool_call> After',
        id: 'text-0',
        type: 'text-delta',
      },
      streamState,
      textState,
    );
    const endParts = processTextBuffer({ id: 'text-0', type: 'text-end' }, streamState, textState);

    expect(startParts).toEqual([]);
    expect(deltaParts).toEqual([]);
    expect(endParts).toEqual([
      {
        id: 'tool-call-1',
        toolName: 'bash',
        type: 'tool-input-start',
      },
      {
        delta: '{"command":"ls"}',
        id: 'tool-call-1',
        type: 'tool-input-delta',
      },
      {
        id: 'tool-call-1',
        type: 'tool-input-end',
      },
      {
        input: '{"command":"ls"}',
        toolCallId: 'tool-call-1',
        toolName: 'bash',
        type: 'tool-call',
      },
    ] satisfies LanguageModelV2StreamPart[]);
    expect(streamState.toolCallCounter).toBe(1);
  });

  it('supports flat tool payloads and partial tag buffering', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-1', type: 'text-start' }, streamState, textState);

    const firstDelta = processTextBuffer(
      {
        delta: '<tool_call>{"name":"read",',
        id: 'text-1',
        type: 'text-delta',
      },
      streamState,
      textState,
    );
    const secondDelta = processTextBuffer(
      {
        delta: '"filePath":"README.md"}</tool_call>',
        id: 'text-1',
        type: 'text-delta',
      },
      streamState,
      textState,
    );
    const endParts = processTextBuffer({ id: 'text-1', type: 'text-end' }, streamState, textState);

    expect(firstDelta).toEqual([]);
    expect(secondDelta).toEqual([]);
    expect(endParts).toEqual([
      {
        id: 'tool-call-1',
        toolName: 'read',
        type: 'tool-input-start',
      },
      {
        delta: '{"filePath":"README.md"}',
        id: 'tool-call-1',
        type: 'tool-input-delta',
      },
      {
        id: 'tool-call-1',
        type: 'tool-input-end',
      },
      {
        input: '{"filePath":"README.md"}',
        toolCallId: 'tool-call-1',
        toolName: 'read',
        type: 'tool-call',
      },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('parses legacy tool_use and function_call formats', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-2', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta:
          '<tool_use><name>todowrite</name><arguments>{"todos":[{"content":"Write tests","status":"pending","priority":"high"}]}</arguments></tool_use>' +
          '<function_call><function_name>read</function_name><parameter name="filePath">README.md</parameter></invoke>',
        id: 'text-2',
        type: 'text-delta',
      },
      streamState,
      textState,
    );
    const endParts = processTextBuffer({ id: 'text-2', type: 'text-end' }, streamState, textState);

    expect(endParts).toEqual([
      {
        id: 'tool-call-1',
        toolName: 'todowrite',
        type: 'tool-input-start',
      },
      {
        delta: '{"todos":[{"content":"Write tests","status":"pending","priority":"high"}]}',
        id: 'tool-call-1',
        type: 'tool-input-delta',
      },
      {
        id: 'tool-call-1',
        type: 'tool-input-end',
      },
      {
        input: '{"todos":[{"content":"Write tests","status":"pending","priority":"high"}]}',
        toolCallId: 'tool-call-1',
        toolName: 'todowrite',
        type: 'tool-call',
      },
      {
        id: 'tool-call-2',
        toolName: 'read',
        type: 'tool-input-start',
      },
      {
        delta: '{"filePath":"README.md"}',
        id: 'tool-call-2',
        type: 'tool-input-delta',
      },
      {
        id: 'tool-call-2',
        type: 'tool-input-end',
      },
      {
        input: '{"filePath":"README.md"}',
        toolCallId: 'tool-call-2',
        toolName: 'read',
        type: 'tool-call',
      },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('keeps plain text responses when no tool call exists', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    const startParts = processTextBuffer({ id: 'text-3', type: 'text-start' }, streamState, textState);
    const deltaParts = processTextBuffer({ delta: 'hello world', id: 'text-3', type: 'text-delta' }, streamState, textState);
    const endParts = processTextBuffer({ id: 'text-3', type: 'text-end' }, streamState, textState);

    expect(startParts).toEqual([]);
    expect(deltaParts).toEqual([]);
    expect(endParts).toEqual([
      { id: 'text-3', type: 'text-start' },
      { delta: 'hello world', id: 'text-3', type: 'text-delta' },
      { id: 'text-3', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });
});
