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
    expect(prompt).toContain('Transcript markers');
    expect(prompt).toContain('first non-whitespace character of your response must be <');
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
    expect(prompt).toContain('Never call `todowrite` unless the user explicitly asks');
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
  it('buffers inline tool-call syntax and emits it as plain text at block end', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    expect(processTextBuffer({ id: 'text-inline', type: 'text-start' }, streamState, textState)).toEqual([]);
    expect(
      processTextBuffer(
        {
          delta: 'Before <tool_call>{"name":"bash","arguments":{"command":"ls"}}</tool_call> After',
          id: 'text-inline',
          type: 'text-delta',
        },
        streamState,
        textState,
      ),
    ).toEqual([
      { id: 'text-inline', type: 'text-start' },
      { delta: 'Before <tool_call>{"name":"bash","arguments":{"command":"ls"}}</tool_call> After', id: 'text-inline', type: 'text-delta' },
    ] satisfies LanguageModelV2StreamPart[]);
    expect(processTextBuffer({ id: 'text-inline', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'text-inline', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('parses a direct tool call after the text block closes', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-direct', type: 'text-start' }, streamState, textState);
    expect(
      processTextBuffer(
        { delta: '<tool_call>{"name":"read","filePath":"README.md"}</tool_call>', id: 'text-direct', type: 'text-delta' },
        streamState,
        textState,
      ),
    ).toEqual([]);
    expect(processTextBuffer({ id: 'text-direct', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'read', type: 'tool-input-start' },
      { delta: '{"filePath":"README.md"}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{"filePath":"README.md"}', toolCallId: 'tool-call-1', toolName: 'read', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('streams a multiline preamble before parsing the tool call', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-preamble', type: 'text-start' }, streamState, textState);
    expect(
      processTextBuffer(
        {
          delta:
            '프로젝트 구조를 먼저 살펴보겠습니다.\n\n<tool_call>{"name":"task","arguments":{"description":"코드베이스 구조 파악","prompt":"Analyze the repository","subagent_type":"explore"}}</tool_call>',
          id: 'text-preamble',
          type: 'text-delta',
        },
        streamState,
        textState,
      ),
    ).toEqual([
      { id: 'text-preamble', type: 'text-start' },
      { delta: '프로젝트 구조를 먼저 살펴보겠습니다.\n\n', id: 'text-preamble', type: 'text-delta' },
      { id: 'text-preamble', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);

    expect(processTextBuffer({ id: 'text-preamble', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'task', type: 'tool-input-start' },
      {
        delta: '{"description":"코드베이스 구조 파악","prompt":"Analyze the repository","subagent_type":"explore"}',
        id: 'tool-call-1',
        type: 'tool-input-delta',
      },
      { id: 'tool-call-1', type: 'tool-input-end' },
      {
        input: '{"description":"코드베이스 구조 파악","prompt":"Analyze the repository","subagent_type":"explore"}',
        toolCallId: 'tool-call-1',
        toolName: 'task',
        type: 'tool-call',
      },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('keeps only the first valid tool call when multiple calls are emitted', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-multi', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta:
          '<tool_call>{"name":"task","arguments":{"description":"코드베이스 구조 파악","prompt":"Analyze the repository","subagent_type":"explore"}}</tool_call>' +
          '<tool_call>{"name":"todowrite","arguments":{"todos":[{"content":"코드베이스 구조 파악","status":"in_progress","priority":"medium"}]}}</tool_call>',
        id: 'text-multi',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    expect(processTextBuffer({ id: 'text-multi', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'task', type: 'tool-input-start' },
      {
        delta: '{"description":"코드베이스 구조 파악","prompt":"Analyze the repository","subagent_type":"explore"}',
        id: 'tool-call-1',
        type: 'tool-input-delta',
      },
      { id: 'tool-call-1', type: 'tool-input-end' },
      {
        input: '{"description":"코드베이스 구조 파악","prompt":"Analyze the repository","subagent_type":"explore"}',
        toolCallId: 'tool-call-1',
        toolName: 'task',
        type: 'tool-call',
      },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('emits plain text at block end when no tool call exists', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    expect(processTextBuffer({ id: 'text-plain', type: 'text-start' }, streamState, textState)).toEqual([]);
    expect(processTextBuffer({ delta: 'hello world', id: 'text-plain', type: 'text-delta' }, streamState, textState)).toEqual([
      { id: 'text-plain', type: 'text-start' },
      { delta: 'hello world', id: 'text-plain', type: 'text-delta' },
    ] satisfies LanguageModelV2StreamPart[]);
    expect(processTextBuffer({ id: 'text-plain', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'text-plain', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('continues streaming plain text without repeating text-start', () => {
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
    expect(processTextBuffer({ id: 'text-repeat', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'text-repeat', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('buffers an eligible partial opener and closes text when the tool call starts', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-partial-tool', type: 'text-start' }, streamState, textState);

    expect(
      processTextBuffer({ delta: '먼저 확인하겠습니다.\n\n<', id: 'text-partial-tool', type: 'text-delta' }, streamState, textState),
    ).toEqual([
      { id: 'text-partial-tool', type: 'text-start' },
      { delta: '먼저 확인하겠습니다.\n\n', id: 'text-partial-tool', type: 'text-delta' },
    ] satisfies LanguageModelV2StreamPart[]);
    expect(
      processTextBuffer(
        { delta: 'tool_call>{"name":"bash","arguments":{"command":"pwd"}}</tool_call>', id: 'text-partial-tool', type: 'text-delta' },
        streamState,
        textState,
      ),
    ).toEqual([{ id: 'text-partial-tool', type: 'text-end' }] satisfies LanguageModelV2StreamPart[]);
    expect(processTextBuffer({ id: 'text-partial-tool', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'bash', type: 'tool-input-start' },
      { delta: '{"command":"pwd"}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{"command":"pwd"}', toolCallId: 'tool-call-1', toolName: 'bash', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('falls back to plain text for malformed tool payloads', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-malformed', type: 'text-start' }, streamState, textState);
    processTextBuffer({ delta: '<tool_call>not-json</tool_call>', id: 'text-malformed', type: 'text-delta' }, streamState, textState);

    expect(processTextBuffer({ id: 'text-malformed', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'text-malformed', type: 'text-start' },
      { delta: '<tool_call>not-json</tool_call>', id: 'text-malformed', type: 'text-delta' },
      { id: 'text-malformed', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('parses legacy tool_use payloads and keeps only the first call', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-legacy', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta:
          '<tool_use><name>todowrite</name><arguments>{"todos":[{"content":"Write tests","status":"pending","priority":"high"}]}</arguments></tool_use>' +
          '<function_call><function_name>read</function_name><parameter name="filePath">README.md</parameter></invoke>',
        id: 'text-legacy',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    expect(processTextBuffer({ id: 'text-legacy', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'todowrite', type: 'tool-input-start' },
      {
        delta: '{"todos":[{"content":"Write tests","status":"pending","priority":"high"}]}',
        id: 'tool-call-1',
        type: 'tool-input-delta',
      },
      { id: 'tool-call-1', type: 'tool-input-end' },
      {
        input: '{"todos":[{"content":"Write tests","status":"pending","priority":"high"}]}',
        toolCallId: 'tool-call-1',
        toolName: 'todowrite',
        type: 'tool-call',
      },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('passes through non-text parts and flushes orphan text on end', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    expect(
      processTextBuffer(
        { id: 'noop', type: 'reasoning-start' } satisfies Extract<LanguageModelV2StreamPart, { type: 'reasoning-start' }>,
        streamState,
        textState,
      ),
    ).toEqual([{ id: 'noop', type: 'reasoning-start' }]);

    expect(processTextBuffer({ delta: 'orphan', id: 'missing', type: 'text-delta' }, streamState, textState)).toEqual([
      { id: 'missing', type: 'text-start' },
      { delta: 'orphan', id: 'missing', type: 'text-delta' },
    ] satisfies LanguageModelV2StreamPart[]);
    expect(processTextBuffer({ id: 'missing', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'missing', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('returns empty output for empty text buffers', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    expect(processTextBuffer({ id: 'text-empty', type: 'text-start' }, streamState, textState)).toEqual([]);
    expect(processTextBuffer({ delta: '', id: 'text-empty', type: 'text-delta' }, streamState, textState)).toEqual([]);
    expect(processTextBuffer({ id: 'text-empty', type: 'text-end' }, streamState, textState)).toEqual([]);
  });

  it('treats non-object json arguments as empty objects', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-non-object', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: '<tool_use><name>bash</name><arguments>1</arguments></tool_use>',
        id: 'text-non-object',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    expect(processTextBuffer({ id: 'text-non-object', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'bash', type: 'tool-input-start' },
      { delta: '{}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{}', toolCallId: 'tool-call-1', toolName: 'bash', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });
});
