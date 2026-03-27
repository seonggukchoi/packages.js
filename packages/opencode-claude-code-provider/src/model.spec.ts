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

  it('adds selection guidance for question and webfetch tools and ignores incomplete schemas', () => {
    const prompt = buildToolSystemPrompt([
      {
        inputSchema: { type: 'object' },
        name: 'question',
        type: 'function' as const,
      },
      {
        inputSchema: { type: 'object' },
        name: 'webfetch',
        type: 'function' as const,
      },
      {
        name: 'broken',
        type: 'function' as const,
      },
      {
        description: 'Circular schema.',
        inputSchema: (() => {
          const schema: { self?: unknown } = {};
          schema.self = schema;
          return schema as Record<string, unknown>;
        })(),
        name: 'circular',
        type: 'function' as const,
      },
    ]);

    expect(prompt).toContain('`question` is only for necessary clarification');
    expect(prompt).toContain('`webfetch` is for fetching content from a URL');
    expect(prompt).not.toContain('- broken');
    expect(prompt).toContain('parameters: {}');
  });

  it('uses parameter schemas and alphabetical order for unknown tools', () => {
    const prompt = buildToolSystemPrompt([
      {
        name: 'zeta',
        parameters: { type: 'object' },
        type: 'function' as const,
      },
      {
        name: 'alpha',
        parameters: { type: 'object' },
        type: 'function' as const,
      },
    ]);

    expect(prompt?.indexOf('- alpha')).toBeLessThan(prompt?.indexOf('- zeta') ?? 0);
  });

  it('returns undefined when no callable tools exist', () => {
    expect(buildToolSystemPrompt(undefined)).toBeUndefined();
    expect(buildToolSystemPrompt([{ name: 'search', type: 'provider-defined' }])).toBeUndefined();
  });
});

describe('processTextBuffer', () => {
  it('streams text before tool-call tag and buffers the tag itself', () => {
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
    expect(deltaParts).toEqual([
      { id: 'text-0', type: 'text-start' },
      { delta: 'Before ', id: 'text-0', type: 'text-delta' },
      { id: 'text-0', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
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

  it('keeps partial tag fragments out of streamed text until the full tool-call starts', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-split', type: 'text-start' }, streamState, textState);

    const firstDelta = processTextBuffer(
      {
        delta: 'General message. <',
        id: 'text-split',
        type: 'text-delta',
      },
      streamState,
      textState,
    );
    const secondDelta = processTextBuffer(
      {
        delta: 'tool_call>{"name":"bash","arguments":{"command":"pwd"}}</tool_call>',
        id: 'text-split',
        type: 'text-delta',
      },
      streamState,
      textState,
    );
    const endParts = processTextBuffer({ id: 'text-split', type: 'text-end' }, streamState, textState);

    expect(firstDelta).toEqual([
      { id: 'text-split', type: 'text-start' },
      { delta: 'General message. ', id: 'text-split', type: 'text-delta' },
    ] satisfies LanguageModelV2StreamPart[]);
    expect(secondDelta).toEqual([{ id: 'text-split', type: 'text-end' }] satisfies LanguageModelV2StreamPart[]);
    expect(endParts).toEqual([
      { id: 'tool-call-1', toolName: 'bash', type: 'tool-input-start' },
      { delta: '{"command":"pwd"}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{"command":"pwd"}', toolCallId: 'tool-call-1', toolName: 'bash', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('buffers lone partial tag fragments and flushes them as text when no tool call completes', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-partial', type: 'text-start' }, streamState, textState);

    expect(processTextBuffer({ delta: '<', id: 'text-partial', type: 'text-delta' }, streamState, textState)).toEqual([]);
    expect(processTextBuffer({ id: 'text-partial', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'text-partial', type: 'text-start' },
      { delta: '<', id: 'text-partial', type: 'text-delta' },
      { id: 'text-partial', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('ignores empty text deltas and closes previously streamed text when an empty tool-call buffer ends', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-empty-delta', type: 'text-start' }, streamState, textState);

    expect(processTextBuffer({ delta: '', id: 'text-empty-delta', type: 'text-delta' }, streamState, textState)).toEqual([]);

    textState.emittedTextStart.add('text-empty-tool');
    textState.foundToolCall = true;
    textState.buffers.set('text-empty-tool', '');

    expect(processTextBuffer({ id: 'text-empty-tool', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'text-empty-tool', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('continues streaming after text has already started without repeating text-start markers', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-repeat', type: 'text-start' }, streamState, textState);

    expect(processTextBuffer({ delta: 'hello', id: 'text-repeat', type: 'text-delta' }, streamState, textState)).toEqual([
      { id: 'text-repeat', type: 'text-start' },
      { delta: 'hello', id: 'text-repeat', type: 'text-delta' },
    ] satisfies LanguageModelV2StreamPart[]);
    expect(processTextBuffer({ delta: ' again', id: 'text-repeat', type: 'text-delta' }, streamState, textState)).toEqual([
      { delta: ' again', id: 'text-repeat', type: 'text-delta' },
    ] satisfies LanguageModelV2StreamPart[]);
    expect(processTextBuffer({ delta: ' trailing <', id: 'text-repeat', type: 'text-delta' }, streamState, textState)).toEqual([
      { delta: ' trailing ', id: 'text-repeat', type: 'text-delta' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('closes an existing text stream before a later tool-call opener appears', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-late-tool', type: 'text-start' }, streamState, textState);

    expect(processTextBuffer({ delta: 'hello', id: 'text-late-tool', type: 'text-delta' }, streamState, textState)).toEqual([
      { id: 'text-late-tool', type: 'text-start' },
      { delta: 'hello', id: 'text-late-tool', type: 'text-delta' },
    ] satisfies LanguageModelV2StreamPart[]);
    expect(
      processTextBuffer(
        {
          delta: ' world <tool_call>{"name":"bash","arguments":{"command":"ls"}}</tool_call>',
          id: 'text-late-tool',
          type: 'text-delta',
        },
        streamState,
        textState,
      ),
    ).toEqual([
      { delta: ' world ', id: 'text-late-tool', type: 'text-delta' },
      { id: 'text-late-tool', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('falls back to balanced text events for manual buffered edge states', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    textState.foundToolCall = true;
    expect(processTextBuffer({ delta: 'suffix', id: 'text-missing-tool-buffer', type: 'text-delta' }, streamState, textState)).toEqual([]);

    textState.foundToolCall = true;
    textState.buffers.set('text-found-no-start', 'not-a-tool');

    expect(processTextBuffer({ id: 'text-found-no-start', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'text-found-no-start', type: 'text-start' },
      { delta: 'not-a-tool', id: 'text-found-no-start', type: 'text-delta' },
      { id: 'text-found-no-start', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);

    textState.foundToolCall = true;
    expect(processTextBuffer({ id: 'text-found-empty', type: 'text-end' }, streamState, textState)).toEqual([]);

    textState.emittedTextStart.add('text-found-started');
    textState.foundToolCall = true;
    textState.buffers.set('text-found-started', 'not-a-tool');

    expect(processTextBuffer({ id: 'text-found-started', type: 'text-end' }, streamState, textState)).toEqual([
      { delta: 'not-a-tool', id: 'text-found-started', type: 'text-delta' },
      { id: 'text-found-started', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);

    textState.buffers.set('text-buffered-only', 'literal');
    expect(processTextBuffer({ id: 'text-buffered-only', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'text-buffered-only', type: 'text-start' },
      { delta: 'literal', id: 'text-buffered-only', type: 'text-delta' },
      { id: 'text-buffered-only', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);

    textState.emittedTextStart.add('text-buffered-started');
    textState.buffers.set('text-buffered-started', 'literal');
    expect(processTextBuffer({ id: 'text-buffered-started', type: 'text-end' }, streamState, textState)).toEqual([
      { delta: 'literal', id: 'text-buffered-started', type: 'text-delta' },
      { id: 'text-buffered-started', type: 'text-end' },
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
    expect(deltaParts).toEqual([
      { id: 'text-3', type: 'text-start' },
      { delta: 'hello world', id: 'text-3', type: 'text-delta' },
    ] satisfies LanguageModelV2StreamPart[]);
    expect(endParts).toEqual([{ id: 'text-3', type: 'text-end' }] satisfies LanguageModelV2StreamPart[]);
  });

  it('falls back to plain text for malformed tool payloads and unknown parts', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-4', type: 'text-start' }, streamState, textState);
    processTextBuffer({ delta: '<tool_call>not-json</tool_call>', id: 'text-4', type: 'text-delta' }, streamState, textState);

    expect(processTextBuffer({ id: 'text-4', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'text-4', type: 'text-start' },
      { delta: '<tool_call>not-json</tool_call>', id: 'text-4', type: 'text-delta' },
      { id: 'text-4', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);

    expect(
      processTextBuffer(
        { id: 'noop', type: 'reasoning-start' } satisfies Extract<LanguageModelV2StreamPart, { type: 'reasoning-start' }>,
        streamState,
        textState,
      ),
    ).toEqual([{ id: 'noop', type: 'reasoning-start' }]);

    processTextBuffer({ id: 'text-empty', type: 'text-start' }, streamState, textState);
    expect(processTextBuffer({ id: 'text-empty', type: 'text-end' }, streamState, textState)).toEqual([]);

    expect(processTextBuffer({ delta: 'orphan', id: 'missing', type: 'text-delta' }, streamState, textState)).toEqual([
      { id: 'missing', type: 'text-start' },
      { delta: 'orphan', id: 'missing', type: 'text-delta' },
    ] satisfies LanguageModelV2StreamPart[]);
    expect(processTextBuffer({ id: 'missing', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'missing', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);

    expect(processTextBuffer({ id: 'missing-empty', type: 'text-end' }, streamState, textState)).toEqual([]);
  });

  it('supports tool_use argument parameters and function calls without parameters', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-5', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta:
          '<tool_use><name>bash</name><parameter name="arguments">{"command":"pwd"}</parameter></tool_use>' +
          '<function_call><function_name>question</function_name></function_call>',
        id: 'text-5',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    expect(processTextBuffer({ id: 'text-5', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'bash', type: 'tool-input-start' },
      { delta: '{"command":"pwd"}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{"command":"pwd"}', toolCallId: 'tool-call-1', toolName: 'bash', type: 'tool-call' },
      { id: 'tool-call-2', toolName: 'question', type: 'tool-input-start' },
      { delta: '{}', id: 'tool-call-2', type: 'tool-input-delta' },
      { id: 'tool-call-2', type: 'tool-input-end' },
      { input: '{}', toolCallId: 'tool-call-2', toolName: 'question', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('handles missing names, empty parameter values, and structured function-call arguments', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-6', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta:
          '<tool_use><arguments>{</arguments></tool_use>' +
          '<function_call><arguments>{"filePath":"README.md"}</arguments></function_call>' +
          '<function_call><function_name>read</function_name><arguments>{"filePath":"README.md"}</arguments></function_call>' +
          '<function_call><function_name>read</function_name><parameter name="filePath">   </parameter></function_call>',
        id: 'text-6',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    expect(processTextBuffer({ id: 'text-6', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'read', type: 'tool-input-start' },
      { delta: '{"filePath":"README.md"}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{"filePath":"README.md"}', toolCallId: 'tool-call-1', toolName: 'read', type: 'tool-call' },
      { id: 'tool-call-2', toolName: 'read', type: 'tool-input-start' },
      { delta: '{"filePath":""}', id: 'tool-call-2', type: 'tool-input-delta' },
      { id: 'tool-call-2', type: 'tool-input-end' },
      { input: '{"filePath":""}', toolCallId: 'tool-call-2', toolName: 'read', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('treats non-object json arguments as empty objects', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-9', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: '<tool_use><name>bash</name><arguments>1</arguments></tool_use>',
        id: 'text-9',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    expect(processTextBuffer({ id: 'text-9', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'bash', type: 'tool-input-start' },
      { delta: '{}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{}', toolCallId: 'tool-call-1', toolName: 'bash', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('treats missing tool names and invalid argument json as plain text', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-7', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: '<tool_call>{"arguments":{"command":"ls"}}</tool_call>' + '<tool_use><name>bash</name><arguments>{</arguments></tool_use>',
        id: 'text-7',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    expect(processTextBuffer({ id: 'text-7', type: 'text-end' }, streamState, textState)).toEqual([
      {
        id: 'tool-call-1',
        toolName: 'bash',
        type: 'tool-input-start',
      },
      {
        delta: '{}',
        id: 'tool-call-1',
        type: 'tool-input-delta',
      },
      {
        id: 'tool-call-1',
        type: 'tool-input-end',
      },
      {
        input: '{}',
        toolCallId: 'tool-call-1',
        toolName: 'bash',
        type: 'tool-call',
      },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('ignores matched tool tags when parsing produces no payload object', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-8', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: '<tool_call>{"name":"bash","arguments":1}</tool_call>' + '<tool_call>{"arguments":{"command":"ls"}}</tool_call>',
        id: 'text-8',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    expect(processTextBuffer({ id: 'text-8', type: 'text-end' }, streamState, textState)).toEqual([
      {
        id: 'tool-call-1',
        toolName: 'bash',
        type: 'tool-input-start',
      },
      {
        delta: '{}',
        id: 'tool-call-1',
        type: 'tool-input-delta',
      },
      {
        id: 'tool-call-1',
        type: 'tool-input-end',
      },
      {
        input: '{}',
        toolCallId: 'tool-call-1',
        toolName: 'bash',
        type: 'tool-call',
      },
    ] satisfies LanguageModelV2StreamPart[]);
  });
});
