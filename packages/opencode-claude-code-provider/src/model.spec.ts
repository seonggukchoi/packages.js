import { describe, expect, it, vi } from 'vitest';

import { createStreamState } from './messages.js';
import { createToolCallTextState, processTextBuffer } from './tool-call-parser.js';
import { buildToolSystemPrompt } from './tool-prompt.js';

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

  it('extracts all valid tool calls when multiple calls are emitted', () => {
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
      { id: 'tool-call-2', toolName: 'todowrite', type: 'tool-input-start' },
      {
        delta: '{"todos":[{"content":"코드베이스 구조 파악","status":"in_progress","priority":"medium"}]}',
        id: 'tool-call-2',
        type: 'tool-input-delta',
      },
      { id: 'tool-call-2', type: 'tool-input-end' },
      {
        input: '{"todos":[{"content":"코드베이스 구조 파악","status":"in_progress","priority":"medium"}]}',
        toolCallId: 'tool-call-2',
        toolName: 'todowrite',
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

  it('continues buffering a tool call across multiple text deltas', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-fragmented-tool', type: 'text-start' }, streamState, textState);

    expect(
      processTextBuffer({ delta: '<tool_call>{"name":"bash",', id: 'text-fragmented-tool', type: 'text-delta' }, streamState, textState),
    ).toEqual([]);
    expect(
      processTextBuffer(
        { delta: '"arguments":{"command":"pwd"}}</tool_call>', id: 'text-fragmented-tool', type: 'text-delta' },
        streamState,
        textState,
      ),
    ).toEqual([]);
    expect(processTextBuffer({ id: 'text-fragmented-tool', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'bash', type: 'tool-input-start' },
      { delta: '{"command":"pwd"}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{"command":"pwd"}', toolCallId: 'tool-call-1', toolName: 'bash', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('starts buffering tool-call fragments even when no prior buffer exists', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    textState.mode = 'buffering';

    expect(
      processTextBuffer({ delta: '<tool_call>{"name":"bash"}', id: 'text-missing-fragment', type: 'text-delta' }, streamState, textState),
    ).toEqual([]);
  });

  it('flushes buffered partial openers as plain text when the block ends', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-partial-end', type: 'text-start' }, streamState, textState);

    expect(
      processTextBuffer({ delta: 'Planning first.\n\n<', id: 'text-partial-end', type: 'text-delta' }, streamState, textState),
    ).toEqual([
      { id: 'text-partial-end', type: 'text-start' },
      { delta: 'Planning first.\n\n', id: 'text-partial-end', type: 'text-delta' },
    ] satisfies LanguageModelV2StreamPart[]);
    expect(processTextBuffer({ id: 'text-partial-end', type: 'text-end' }, streamState, textState)).toEqual([
      { delta: '<', id: 'text-partial-end', type: 'text-delta' },
      { id: 'text-partial-end', type: 'text-end' },
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

  it('falls back to plain text for invalid structured tool payloads', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-invalid-structured', type: 'text-start' }, streamState, textState);
    processTextBuffer({ delta: '<tool_call>[]</tool_call>', id: 'text-invalid-structured', type: 'text-delta' }, streamState, textState);

    expect(processTextBuffer({ id: 'text-invalid-structured', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'text-invalid-structured', type: 'text-start' },
      { delta: '<tool_call>[]</tool_call>', id: 'text-invalid-structured', type: 'text-delta' },
      { id: 'text-invalid-structured', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('parses tool calls and discards trailing text after closing tag', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-trailing', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: '<tool_call>{"name":"bash","arguments":{"command":"ls"}}</tool_call> trailing text',
        id: 'text-trailing',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    expect(processTextBuffer({ id: 'text-trailing', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'bash', type: 'tool-input-start' },
      { delta: '{"command":"ls"}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{"command":"ls"}', toolCallId: 'tool-call-1', toolName: 'bash', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('emits tool calls when trailing text arrives in a separate delta after closing tag', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-close-detect', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: '<tool_call>{"name":"bash","arguments":{"command":"ls"}}</tool_call>',
        id: 'text-close-detect',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    expect(processTextBuffer({ delta: ' Done!', id: 'text-close-detect', type: 'text-delta' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'bash', type: 'tool-input-start' },
      { delta: '{"command":"ls"}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{"command":"ls"}', toolCallId: 'tool-call-1', toolName: 'bash', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('continues buffering when closing tag with trailing text has malformed payload', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-malformed-trail', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: '<tool_call>not-json</tool_call>',
        id: 'text-malformed-trail',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    expect(processTextBuffer({ delta: ' Done!', id: 'text-malformed-trail', type: 'text-delta' }, streamState, textState)).toEqual([]);

    expect(processTextBuffer({ id: 'text-malformed-trail', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'text-malformed-trail', type: 'text-start' },
      { delta: '<tool_call>not-json</tool_call> Done!', id: 'text-malformed-trail', type: 'text-delta' },
      { id: 'text-malformed-trail', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('handles closing tag split across deltas with trailing text', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-split-close', type: 'text-start' }, streamState, textState);
    expect(
      processTextBuffer(
        {
          delta: '<tool_call>{"name":"bash","arguments":{"command":"pwd"}}</tool_',
          id: 'text-split-close',
          type: 'text-delta',
        },
        streamState,
        textState,
      ),
    ).toEqual([]);

    expect(processTextBuffer({ delta: 'call> Done!', id: 'text-split-close', type: 'text-delta' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'bash', type: 'tool-input-start' },
      { delta: '{"command":"pwd"}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{"command":"pwd"}', toolCallId: 'tool-call-1', toolName: 'bash', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('falls back to plain text when a buffered tool call has inline leading context', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    textState.mode = 'buffering';
    textState.buffers.set('text-inline-leading', 'Before <tool_call>{"name":"bash","arguments":{"command":"ls"}}</tool_call>');

    expect(processTextBuffer({ id: 'text-inline-leading', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'text-inline-leading', type: 'text-start' },
      {
        delta: 'Before <tool_call>{"name":"bash","arguments":{"command":"ls"}}</tool_call>',
        id: 'text-inline-leading',
        type: 'text-delta',
      },
      { id: 'text-inline-leading', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('correctly parses tool calls whose arguments contain closing tag literals', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();
    const closeTag = '<' + '/tool_call>';
    const innerValue = 'expect(output).toContain(' + "'" + closeTag + "'" + ')';
    const payload = JSON.stringify({ name: 'edit', arguments: { newString: innerValue } });
    const fullText = '<tool_call>' + payload + closeTag;

    processTextBuffer({ id: 'text-nested-close', type: 'text-start' }, streamState, textState);
    processTextBuffer({ delta: fullText, id: 'text-nested-close', type: 'text-delta' }, streamState, textState);

    const result = processTextBuffer({ id: 'text-nested-close', type: 'text-end' }, streamState, textState);
    const toolCallPart = result.find((part) => part.type === 'tool-call');

    expect(toolCallPart).toBeDefined();
    expect(toolCallPart!.type).toBe('tool-call');
    expect((toolCallPart as { toolName: string }).toolName).toBe('edit');

    const parsedInput = JSON.parse((toolCallPart as { input: string }).input);
    expect(parsedInput.newString).toBe(innerValue);
  });

  it('skips tool call parsing inside code fences', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();
    const openTag = '<tool_' + 'call>';
    const closeTag = '</' + 'tool_call>';
    const fencedContent = '```\n' + openTag + '{"name":"bash","arguments":{"command":"pwd"}}' + closeTag + '\n```';

    processTextBuffer({ id: 'text-fenced', type: 'text-start' }, streamState, textState);
    processTextBuffer({ delta: fencedContent, id: 'text-fenced', type: 'text-delta' }, streamState, textState);

    const result = processTextBuffer({ id: 'text-fenced', type: 'text-end' }, streamState, textState);

    expect(result.every((part) => part.type !== 'tool-call')).toBe(true);
  });

  it('skips tool call parsing when code fence spans multiple deltas', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();
    const openTag = '<tool_' + 'call>';
    const closeTag = '</' + 'tool_call>';

    processTextBuffer({ id: 'text-multi-fence', type: 'text-start' }, streamState, textState);
    processTextBuffer({ delta: 'Example:\n```\n', id: 'text-multi-fence', type: 'text-delta' }, streamState, textState);
    processTextBuffer(
      { delta: openTag + '{"name":"bash","arguments":{"command":"ls"}}' + closeTag, id: 'text-multi-fence', type: 'text-delta' },
      streamState,
      textState,
    );
    processTextBuffer({ delta: '\n```\n', id: 'text-multi-fence', type: 'text-delta' }, streamState, textState);

    const result = processTextBuffer({ id: 'text-multi-fence', type: 'text-end' }, streamState, textState);

    expect(result.every((part) => part.type !== 'tool-call')).toBe(true);
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

  it('flushes buffered text on end when text-start was never emitted', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    textState.buffers.set('buffered-only', 'buffered text');

    expect(processTextBuffer({ id: 'buffered-only', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'buffered-only', type: 'text-start' },
      { delta: 'buffered text', id: 'buffered-only', type: 'text-delta' },
      { id: 'buffered-only', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('returns empty output for empty text buffers', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    expect(processTextBuffer({ id: 'text-empty', type: 'text-start' }, streamState, textState)).toEqual([]);
    expect(processTextBuffer({ delta: '', id: 'text-empty', type: 'text-delta' }, streamState, textState)).toEqual([]);
    expect(processTextBuffer({ id: 'text-empty', type: 'text-end' }, streamState, textState)).toEqual([]);
  });

  it('returns empty output when a text block ends without any buffered state', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    expect(processTextBuffer({ id: 'text-missing-end', type: 'text-end' }, streamState, textState)).toEqual([]);
  });

  it('closes an already opened text block when an empty tool buffer ends', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    textState.mode = 'buffering';
    textState.buffers.set('text-empty-tool', '');
    textState.emittedTextStart.add('text-empty-tool');

    expect(processTextBuffer({ id: 'text-empty-tool', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'text-empty-tool', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('returns empty output when an empty tool buffer ends without emitted text', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    textState.mode = 'buffering';
    textState.buffers.set('text-empty-tool-no-start', '');

    expect(processTextBuffer({ id: 'text-empty-tool-no-start', type: 'text-end' }, streamState, textState)).toEqual([]);
  });

  it('flushes malformed buffered tool text without reopening the text block', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    textState.mode = 'buffering';
    textState.buffers.set('text-malformed-open', '<tool_call>not-json</tool_call>');
    textState.emittedTextStart.add('text-malformed-open');

    expect(processTextBuffer({ id: 'text-malformed-open', type: 'text-end' }, streamState, textState)).toEqual([
      { delta: '<tool_call>not-json</tool_call>', id: 'text-malformed-open', type: 'text-delta' },
      { id: 'text-malformed-open', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('deep-parses stringified JSON array values in tool call arguments', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    const stringifiedTodos = JSON.stringify([{ content: 'Write tests', priority: 'high', status: 'pending' }]);
    const toolCallJson = JSON.stringify({
      arguments: { todos: stringifiedTodos },
      name: 'todowrite',
    });

    processTextBuffer({ id: 'text-stringified-array', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: `<tool_call>${toolCallJson}</tool_call>`,
        id: 'text-stringified-array',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    const expectedInput = '{"todos":[{"content":"Write tests","priority":"high","status":"pending"}]}';

    expect(processTextBuffer({ id: 'text-stringified-array', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'todowrite', type: 'tool-input-start' },
      { delta: expectedInput, id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: expectedInput, toolCallId: 'tool-call-1', toolName: 'todowrite', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('deep-parses stringified JSON object values in tool call arguments', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    const stringifiedConfig = JSON.stringify({ key: 'value', nested: true });
    const toolCallJson = JSON.stringify({
      arguments: { config: stringifiedConfig, name: 'test' },
      name: 'sometool',
    });

    processTextBuffer({ id: 'text-stringified-object', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: `<tool_call>${toolCallJson}</tool_call>`,
        id: 'text-stringified-object',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    const expectedInput = '{"config":{"key":"value","nested":true},"name":"test"}';

    expect(processTextBuffer({ id: 'text-stringified-object', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'sometool', type: 'tool-input-start' },
      { delta: expectedInput, id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: expectedInput, toolCallId: 'tool-call-1', toolName: 'sometool', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('does not deep-parse string values that are not valid JSON', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    const toolCallJson = JSON.stringify({
      arguments: { command: 'echo [hello world]', filePath: '/path/to/file' },
      name: 'bash',
    });

    processTextBuffer({ id: 'text-non-json-string', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: `<tool_call>${toolCallJson}</tool_call>`,
        id: 'text-non-json-string',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    const expectedInput = '{"command":"echo [hello world]","filePath":"/path/to/file"}';

    expect(processTextBuffer({ id: 'text-non-json-string', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'bash', type: 'tool-input-start' },
      { delta: expectedInput, id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: expectedInput, toolCallId: 'tool-call-1', toolName: 'bash', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('coerces stringified number values in tool call arguments', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    const toolCallJson = JSON.stringify({
      arguments: { command: 'pnpm test', timeout: '60000' },
      name: 'bash',
    });

    processTextBuffer({ id: 'text-number-coerce', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: `<tool_call>${toolCallJson}</tool_call>`,
        id: 'text-number-coerce',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    const expectedInput = '{"command":"pnpm test","timeout":60000}';

    expect(processTextBuffer({ id: 'text-number-coerce', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'bash', type: 'tool-input-start' },
      { delta: expectedInput, id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: expectedInput, toolCallId: 'tool-call-1', toolName: 'bash', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('coerces stringified boolean values in tool call arguments', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    const toolCallJson = JSON.stringify({
      arguments: { includeSpamTrash: 'false', verbose: 'true' },
      name: 'search',
    });

    processTextBuffer({ id: 'text-bool-coerce', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: `<tool_call>${toolCallJson}</tool_call>`,
        id: 'text-bool-coerce',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    const expectedInput = '{"includeSpamTrash":false,"verbose":true}';

    expect(processTextBuffer({ id: 'text-bool-coerce', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'search', type: 'tool-input-start' },
      { delta: expectedInput, id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: expectedInput, toolCallId: 'tool-call-1', toolName: 'search', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('coerces stringified null values in tool call arguments', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    const toolCallJson = JSON.stringify({
      arguments: { filter: 'null', query: 'test' },
      name: 'search',
    });

    processTextBuffer({ id: 'text-null-coerce', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: `<tool_call>${toolCallJson}</tool_call>`,
        id: 'text-null-coerce',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    const expectedInput = '{"filter":null,"query":"test"}';

    expect(processTextBuffer({ id: 'text-null-coerce', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'search', type: 'tool-input-start' },
      { delta: expectedInput, id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: expectedInput, toolCallId: 'tool-call-1', toolName: 'search', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('keeps malformed JSON-like strings as-is when they fail to parse', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    const toolCallJson = JSON.stringify({
      arguments: { data: '[not valid json]', name: 'test' },
      name: 'sometool',
    });

    processTextBuffer({ id: 'text-malformed-json', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: `<tool_call>${toolCallJson}</tool_call>`,
        id: 'text-malformed-json',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    const expectedInput = '{"data":"[not valid json]","name":"test"}';

    expect(processTextBuffer({ id: 'text-malformed-json', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'sometool', type: 'tool-input-start' },
      { delta: expectedInput, id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: expectedInput, toolCallId: 'tool-call-1', toolName: 'sometool', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('deep-parses rest-entries when arguments key is absent', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    const stringifiedTodos = JSON.stringify([{ content: 'Task 1', priority: 'high', status: 'pending' }]);
    const toolCallJson = JSON.stringify({
      name: 'todowrite',
      todos: stringifiedTodos,
    });

    processTextBuffer({ id: 'text-rest-entries', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: `<tool_call>${toolCallJson}</tool_call>`,
        id: 'text-rest-entries',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    const expectedInput = '{"todos":[{"content":"Task 1","priority":"high","status":"pending"}]}';

    expect(processTextBuffer({ id: 'text-rest-entries', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'tool-call-1', toolName: 'todowrite', type: 'tool-input-start' },
      { delta: expectedInput, id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: expectedInput, toolCallId: 'tool-call-1', toolName: 'todowrite', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('normalizes stringified array values in native tool-call stream parts', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    const stringifiedTodos = JSON.stringify([{ content: 'Task 1', priority: 'high', status: 'pending' }]);
    const input = JSON.stringify({ todos: stringifiedTodos });

    const result = processTextBuffer(
      {
        input,
        toolCallId: 'tool-call-1',
        toolName: 'todowrite',
        type: 'tool-call',
      },
      streamState,
      textState,
    );

    expect(result).toEqual([
      {
        input: '{"todos":[{"content":"Task 1","priority":"high","status":"pending"}]}',
        toolCallId: 'tool-call-1',
        toolName: 'todowrite',
        type: 'tool-call',
      },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('passes through native tool-call parts with correct types unchanged', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    const input = '{"command":"ls","timeout":5000}';

    const result = processTextBuffer(
      {
        input,
        toolCallId: 'tool-call-1',
        toolName: 'bash',
        type: 'tool-call',
      },
      streamState,
      textState,
    );

    expect(result).toEqual([
      {
        input,
        toolCallId: 'tool-call-1',
        toolName: 'bash',
        type: 'tool-call',
      },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('passes through native tool-call parts with unparseable input unchanged', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    const input = 'not-valid-json';

    const result = processTextBuffer(
      {
        input,
        toolCallId: 'tool-call-1',
        toolName: 'broken',
        type: 'tool-call',
      },
      streamState,
      textState,
    );

    expect(result).toEqual([
      {
        input,
        toolCallId: 'tool-call-1',
        toolName: 'broken',
        type: 'tool-call',
      },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('normalizes stringified boolean and number values in native tool-call stream parts', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    const input = JSON.stringify({ includeSpamTrash: 'false', maxResults: '20', q: 'test' });

    const result = processTextBuffer(
      {
        input,
        toolCallId: 'tool-call-1',
        toolName: 'search',
        type: 'tool-call',
      },
      streamState,
      textState,
    );

    expect(result).toEqual([
      {
        input: '{"includeSpamTrash":false,"maxResults":20,"q":"test"}',
        toolCallId: 'tool-call-1',
        toolName: 'search',
        type: 'tool-call',
      },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('falls back to empty JSON when stringify throws during tool-call normalization', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    vi.spyOn(JSON, 'stringify').mockImplementation(() => {
      throw new Error('stringify failure');
    });

    try {
      const result = processTextBuffer(
        {
          input: '{"key":"value"}',
          toolCallId: 'tool-call-1',
          toolName: 'test',
          type: 'tool-call',
        },
        streamState,
        textState,
      );

      expect(result).toEqual([
        {
          input: '{}',
          toolCallId: 'tool-call-1',
          toolName: 'test',
          type: 'tool-call',
        },
      ] satisfies LanguageModelV2StreamPart[]);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('skips tool call when garbage exists between JSON end and closing tag', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-garbage-between', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: '<tool_call>{"name":"bash","arguments":{"command":"ls"}}GARBAGE</tool_call>',
        id: 'text-garbage-between',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    const result = processTextBuffer({ id: 'text-garbage-between', type: 'text-end' }, streamState, textState);

    expect(result).toEqual([
      { id: 'text-garbage-between', type: 'text-start' },
      {
        delta: '<tool_call>{"name":"bash","arguments":{"command":"ls"}}GARBAGE</tool_call>',
        id: 'text-garbage-between',
        type: 'text-delta',
      },
      { id: 'text-garbage-between', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('parses tool call when whitespace exists before JSON object', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-ws-before-json', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: '<tool_call>  \n  {"name":"bash","arguments":{"command":"ls"}}</tool_call>',
        id: 'text-ws-before-json',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    const result = processTextBuffer({ id: 'text-ws-before-json', type: 'text-end' }, streamState, textState);

    expect(result).toEqual([
      { id: 'tool-call-1', toolName: 'bash', type: 'tool-input-start' },
      { delta: '{"command":"ls"}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{"command":"ls"}', toolCallId: 'tool-call-1', toolName: 'bash', type: 'tool-call' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('treats unclosed JSON object as plain text', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-unclosed-json', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: '<tool_call>{"name":"bash","arguments":{"command":"ls"}</tool_call>',
        id: 'text-unclosed-json',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    const result = processTextBuffer({ id: 'text-unclosed-json', type: 'text-end' }, streamState, textState);

    expect(result).toEqual([
      { id: 'text-unclosed-json', type: 'text-start' },
      {
        delta: '<tool_call>{"name":"bash","arguments":{"command":"ls"}</tool_call>',
        id: 'text-unclosed-json',
        type: 'text-delta',
      },
      { id: 'text-unclosed-json', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('skips tool call parsing when opener follows trailing backticks', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-trailing-backticks', type: 'text-start' }, streamState, textState);
    expect(
      processTextBuffer(
        {
          delta: '```<tool_call>{"name":"bash","arguments":{"command":"ls"}}</tool_call>',
          id: 'text-trailing-backticks',
          type: 'text-delta',
        },
        streamState,
        textState,
      ),
    ).toEqual([
      { id: 'text-trailing-backticks', type: 'text-start' },
      {
        delta: '```<tool_call>{"name":"bash","arguments":{"command":"ls"}}</tool_call>',
        id: 'text-trailing-backticks',
        type: 'text-delta',
      },
    ] satisfies LanguageModelV2StreamPart[]);

    const result = processTextBuffer({ id: 'text-trailing-backticks', type: 'text-end' }, streamState, textState);

    expect(result).toEqual([{ id: 'text-trailing-backticks', type: 'text-end' }] satisfies LanguageModelV2StreamPart[]);
  });

  it('skips tool call parsing when a prior delta ends with triple backticks', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-split-trailing-backticks', type: 'text-start' }, streamState, textState);

    expect(processTextBuffer({ delta: '```', id: 'text-split-trailing-backticks', type: 'text-delta' }, streamState, textState)).toEqual([
      { id: 'text-split-trailing-backticks', type: 'text-start' },
      { delta: '```', id: 'text-split-trailing-backticks', type: 'text-delta' },
    ] satisfies LanguageModelV2StreamPart[]);

    expect(
      processTextBuffer(
        {
          delta: '<tool_call>{"name":"bash","arguments":{"command":"ls"}}</tool_call>',
          id: 'text-split-trailing-backticks',
          type: 'text-delta',
        },
        streamState,
        textState,
      ),
    ).toEqual([
      {
        delta: '<tool_call>{"name":"bash","arguments":{"command":"ls"}}</tool_call>',
        id: 'text-split-trailing-backticks',
        type: 'text-delta',
      },
    ] satisfies LanguageModelV2StreamPart[]);

    expect(processTextBuffer({ id: 'text-split-trailing-backticks', type: 'text-end' }, streamState, textState)).toEqual([
      { id: 'text-split-trailing-backticks', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('falls back to plain text when parsed payload has no valid tool name', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-missing-name', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: '<tool_call>{"arguments":{"command":"ls"}}</tool_call>',
        id: 'text-missing-name',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    const result = processTextBuffer({ id: 'text-missing-name', type: 'text-end' }, streamState, textState);

    expect(result).toEqual([
      { id: 'text-missing-name', type: 'text-start' },
      { delta: '<tool_call>{"arguments":{"command":"ls"}}</tool_call>', id: 'text-missing-name', type: 'text-delta' },
      { id: 'text-missing-name', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });

  it('falls back to plain text when payload JSON parsing throws', () => {
    const streamState = createStreamState();
    const textState = createToolCallTextState();

    processTextBuffer({ id: 'text-invalid-json-object', type: 'text-start' }, streamState, textState);
    processTextBuffer(
      {
        delta: '<tool_call>{"name":"bash",}</tool_call>',
        id: 'text-invalid-json-object',
        type: 'text-delta',
      },
      streamState,
      textState,
    );

    const result = processTextBuffer({ id: 'text-invalid-json-object', type: 'text-end' }, streamState, textState);

    expect(result).toEqual([
      { id: 'text-invalid-json-object', type: 'text-start' },
      { delta: '<tool_call>{"name":"bash",}</tool_call>', id: 'text-invalid-json-object', type: 'text-delta' },
      { id: 'text-invalid-json-object', type: 'text-end' },
    ] satisfies LanguageModelV2StreamPart[]);
  });
});
