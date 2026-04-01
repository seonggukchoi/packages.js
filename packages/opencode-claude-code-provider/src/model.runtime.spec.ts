/* eslint-disable @typescript-eslint/naming-convention */

import { EventEmitter } from 'node:events';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const spawnMock = vi.fn();
const createInterfaceMock = vi.fn();

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}));

vi.mock('node:readline', () => ({
  createInterface: createInterfaceMock,
}));

describe('ClaudeCodeLanguageModel runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws from doGenerate', async () => {
    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');

    await expect(model.doGenerate()).rejects.toThrow('only supports the streaming path');
  });

  it('streams plain text responses and resumes matching sessions', async () => {
    const { child, interfaceHandle } = createMockChild({
      lines: [
        JSON.stringify({ session_id: 'sess_plain', subtype: 'init', type: 'system' }),
        '',
        JSON.stringify({ event: { content_block: { type: 'text' }, index: 0, type: 'content_block_start' }, type: 'stream_event' }),
        JSON.stringify({
          event: { delta: { text: 'hello', type: 'text_delta' }, index: 0, type: 'content_block_delta' },
          type: 'stream_event',
        }),
        JSON.stringify({ event: { index: 0, type: 'content_block_stop' }, type: 'stream_event' }),
        JSON.stringify({ subtype: 'success', type: 'result', usage: { input_tokens: 1, output_tokens: 1 } }),
      ],
    });
    spawnMock.mockReturnValue(child);
    createInterfaceMock.mockReturnValue(interfaceHandle);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const abortController = new AbortController();
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');
    const result = await model.doStream({
      abortSignal: abortController.signal,
      prompt: [
        {
          content: [{ text: 'done', type: 'text' }],
          providerMetadata: {
            'claude-code': {
              modelId: 'claude-haiku-4-5',
              sessionId: 'sess_resume',
            },
          },
          role: 'assistant',
        },
        { content: [{ text: 'continue', type: 'text' }], role: 'user' },
      ] as never,
      tools: [],
    });

    abortController.abort();

    const parts = await readAllParts(result.stream);

    expect(result.request.body).toMatchObject({
      model: 'claude-haiku-4-5',
      resume: 'sess_resume',
    });
    expect(result.request.body.args).toContain('--verbose');
    expect(result.request.body.args).toContain('--input-format');
    expect(result.request.body.args).toContain('text');
    expect(result.request.body.args).toContain('--resume');
    expect(result.request.body.args).toContain('sess_resume');
    expect(spawnMock).toHaveBeenCalledWith(
      expect.any(String),
      result.request.body.args,
      expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
    );
    expect(parts).toEqual([
      { type: 'stream-start', warnings: [] },
      { id: 'text-0', type: 'text-start' },
      { delta: 'hello', id: 'text-0', type: 'text-delta' },
      { id: 'text-0', type: 'text-end' },
      {
        finishReason: { unified: 'other', raw: undefined },
        providerMetadata: {
          anthropic: {},
          'claude-code': {
            modelId: 'claude-haiku-4-5',
            sessionId: 'sess_plain',
          },
        },
        type: 'finish',
        usage: {
          inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 1, text: undefined, reasoning: undefined },
        },
      },
    ]);
    expect(child.kill).toHaveBeenCalled();
    if (!child.stdin) {
      throw new Error('Expected stdin to be available in the mock child process.');
    }

    expect(child.stdin.end).toHaveBeenCalledWith('continue');
    expect(createInterfaceMock).toHaveBeenCalledWith({ input: child.stdout });
  });

  it('preserves anthropic cache metadata in finish parts', async () => {
    const { child, interfaceHandle } = createMockChild({
      lines: [
        JSON.stringify({ session_id: 'sess_cache', subtype: 'init', type: 'system' }),
        JSON.stringify({
          event: {
            message: {
              usage: {
                cache_creation_input_tokens: 11,
                cache_read_input_tokens: 7,
                input_tokens: 5,
              },
            },
            type: 'message_start',
          },
          type: 'stream_event',
        }),
        JSON.stringify({ subtype: 'success', type: 'result', usage: { output_tokens: 3 } }),
      ],
    });
    spawnMock.mockReturnValue(child);
    createInterfaceMock.mockReturnValue(interfaceHandle);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');
    const result = await model.doStream({ prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }], tools: [] });
    const parts = await readAllParts(result.stream);

    expect(parts[parts.length - 1]).toEqual({
      finishReason: { unified: 'other', raw: undefined },
      providerMetadata: {
        anthropic: {
          cacheCreationInputTokens: 11,
        },
        'claude-code': {
          modelId: 'claude-haiku-4-5',
          sessionId: 'sess_cache',
        },
      },
      type: 'finish',
      usage: {
        inputTokens: { total: 23, noCache: 5, cacheRead: 7, cacheWrite: 11 },
        outputTokens: { total: 3, text: undefined, reasoning: undefined },
      },
    });
  });

  it('omits resume for prompts with tool results and emits tool stream parts', async () => {
    const { child, interfaceHandle } = createMockChild({
      lines: [
        JSON.stringify({ session_id: 'sess_tool', subtype: 'init', type: 'system' }),
        JSON.stringify({ event: { content_block: { type: 'text' }, index: 0, type: 'content_block_start' }, type: 'stream_event' }),
        JSON.stringify({
          event: {
            delta: { text: '<tool_call>{"name":"bash","arguments":{"command":"ls"}}</tool_call>', type: 'text_delta' },
            index: 0,
            type: 'content_block_delta',
          },
          type: 'stream_event',
        }),
        JSON.stringify({ event: { index: 0, type: 'content_block_stop' }, type: 'stream_event' }),
        JSON.stringify({ stop_reason: 'end_turn', subtype: 'success', type: 'result' }),
      ],
    });
    spawnMock.mockReturnValue(child);
    createInterfaceMock.mockReturnValue(interfaceHandle);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');
    const result = await model.doStream({
      prompt: [
        {
          content: [{ output: { ok: true }, toolCallId: '1', toolName: 'bash', type: 'tool-result' }],
          role: 'tool',
        },
      ] as never,
      tools: [
        {
          description: 'Run shell commands.',
          inputSchema: { properties: { command: { type: 'string' } }, required: ['command'], type: 'object' },
          name: 'bash',
          type: 'function',
        },
      ],
    });

    const parts = await readAllParts(result.stream);

    expect(result.request.body.args).not.toContain('--resume');
    expect(result.request.body.args).toContain('--verbose');
    expect(result.request.body.system).toContain('When a tool is required');
    expect(parts).toEqual([
      { type: 'stream-start', warnings: [] },
      { id: 'tool-call-1', toolName: 'bash', type: 'tool-input-start' },
      { delta: '{"command":"ls"}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{"command":"ls"}', toolCallId: 'tool-call-1', toolName: 'bash', type: 'tool-call' },
      {
        finishReason: { unified: 'tool-calls', raw: undefined },
        providerMetadata: {
          anthropic: {},
          'claude-code': {
            modelId: 'claude-haiku-4-5',
            sessionId: 'sess_tool',
          },
        },
        type: 'finish',
        usage: {
          inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: undefined, text: undefined, reasoning: undefined },
        },
      },
    ]);
  });

  it('converts native Claude tool_use blocks into OpenCode tool calls and stops the CLI stream', async () => {
    const { child, interfaceHandle } = createMockChild({
      lines: [
        JSON.stringify({ session_id: 'sess_native_tool', subtype: 'init', type: 'system' }),
        JSON.stringify({ event: { content_block: { type: 'thinking' }, index: 0, type: 'content_block_start' }, type: 'stream_event' }),
        JSON.stringify({
          event: { delta: { thinking: 'using tool', type: 'thinking_delta' }, index: 0, type: 'content_block_delta' },
          type: 'stream_event',
        }),
        JSON.stringify({ event: { index: 0, type: 'content_block_stop' }, type: 'stream_event' }),
        JSON.stringify({
          event: {
            content_block: { id: 'toolu_1', input: {}, name: 'read', type: 'tool_use' },
            index: 1,
            type: 'content_block_start',
          },
          type: 'stream_event',
        }),
        JSON.stringify({
          event: { delta: { partial_json: '{"filePath":"README.md"}', type: 'input_json_delta' }, index: 1, type: 'content_block_delta' },
          type: 'stream_event',
        }),
        JSON.stringify({ event: { index: 1, type: 'content_block_stop' }, type: 'stream_event' }),
        JSON.stringify({
          event: { content_block: { type: 'text' }, index: 2, type: 'content_block_start' },
          type: 'stream_event',
        }),
        JSON.stringify({
          event: { delta: { text: 'should not be emitted', type: 'text_delta' }, index: 2, type: 'content_block_delta' },
          type: 'stream_event',
        }),
      ],
    });
    spawnMock.mockReturnValue(child);
    createInterfaceMock.mockReturnValue(interfaceHandle);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');
    const result = await model.doStream({
      prompt: [{ content: [{ text: 'use read', type: 'text' }], role: 'user' }] as never,
      tools: [
        {
          description: 'Read a file.',
          inputSchema: { properties: { filePath: { type: 'string' } }, required: ['filePath'], type: 'object' },
          name: 'read',
          type: 'function',
        },
      ],
    });

    const parts = await readAllParts(result.stream);

    expect(parts).toEqual([
      { type: 'stream-start', warnings: [] },
      { id: 'reasoning-0', type: 'reasoning-start' },
      { delta: 'using tool', id: 'reasoning-0', type: 'reasoning-delta' },
      { id: 'reasoning-0', type: 'reasoning-end' },
      { id: 'tool-call-1', toolName: 'read', type: 'tool-input-start' },
      { delta: '{"filePath":"README.md"}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{"filePath":"README.md"}', toolCallId: 'tool-call-1', toolName: 'read', type: 'tool-call' },
      {
        finishReason: { unified: 'tool-calls', raw: undefined },
        providerMetadata: {
          anthropic: {},
          'claude-code': {
            modelId: 'claude-haiku-4-5',
            sessionId: 'sess_native_tool',
          },
        },
        type: 'finish',
        usage: {
          inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: undefined, text: undefined, reasoning: undefined },
        },
      },
    ]);
  });

  it('resumes using explicit sessionId option when conversation history exists', async () => {
    const { child, interfaceHandle } = createMockChild({
      lines: [
        JSON.stringify({ session_id: 'sess_explicit', subtype: 'init', type: 'system' }),
        JSON.stringify({ event: { content_block: { type: 'text' }, index: 0, type: 'content_block_start' }, type: 'stream_event' }),
        JSON.stringify({
          event: { delta: { text: 'world', type: 'text_delta' }, index: 0, type: 'content_block_delta' },
          type: 'stream_event',
        }),
        JSON.stringify({ event: { index: 0, type: 'content_block_stop' }, type: 'stream_event' }),
        JSON.stringify({ subtype: 'success', type: 'result', usage: { input_tokens: 2, output_tokens: 1 } }),
      ],
    });
    spawnMock.mockReturnValueOnce(child);
    createInterfaceMock.mockReturnValueOnce(interfaceHandle);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');

    const result = await model.doStream({
      prompt: [
        { content: [{ text: 'hello', type: 'text' }], role: 'user' },
        { content: [{ text: 'hi!', type: 'text' }], role: 'assistant' },
        { content: [{ text: 'what can you do?', type: 'text' }], role: 'user' },
      ] as never,
      providerOptions: { 'claude-code': { sessionId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' } },
      tools: [],
    });
    await readAllParts(result.stream);

    expect(result.request.body.args).toContain('--resume');
    expect(result.request.body.resume).toBe('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');
  });

  it('uses --session-id for first call when sessionId option is provided without history', async () => {
    const { child, interfaceHandle } = createMockChild({
      lines: [
        JSON.stringify({ session_id: 'sess_new', subtype: 'init', type: 'system' }),
        JSON.stringify({ subtype: 'success', type: 'result', usage: { input_tokens: 1, output_tokens: 1 } }),
      ],
    });
    spawnMock.mockReturnValueOnce(child);
    createInterfaceMock.mockReturnValueOnce(interfaceHandle);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');

    const result = await model.doStream({
      prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }],
      providerOptions: { 'claude-code': { sessionId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' } },
      tools: [],
    });
    await readAllParts(result.stream);

    expect(result.request.body.args).not.toContain('--resume');
    expect(result.request.body.args).toContain('--session-id');
  });

  it('does not resume without sessionId option or prompt metadata', async () => {
    const { child, interfaceHandle } = createMockChild({
      lines: [
        JSON.stringify({ session_id: 'sess_ignored', subtype: 'init', type: 'system' }),
        JSON.stringify({ subtype: 'success', type: 'result', usage: { input_tokens: 1, output_tokens: 1 } }),
      ],
    });
    spawnMock.mockReturnValueOnce(child);
    createInterfaceMock.mockReturnValueOnce(interfaceHandle);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');

    const result = await model.doStream({
      prompt: [
        { content: [{ text: 'hello', type: 'text' }], role: 'user' },
        { content: [{ text: 'hi!', type: 'text' }], role: 'assistant' },
        { content: [{ text: 'what now?', type: 'text' }], role: 'user' },
      ] as never,
      tools: [],
    });
    await readAllParts(result.stream);

    expect(result.request.body.args).not.toContain('--resume');
    expect(result.request.body.args).not.toContain('--session-id');
  });

  it('resumes session for assistant messages that include tool results', async () => {
    const { child, interfaceHandle } = createMockChild({ lines: [] });
    spawnMock.mockReturnValue(child);
    createInterfaceMock.mockReturnValue(interfaceHandle);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');
    const result = await model.doStream({
      prompt: [
        {
          content: [
            { text: 'done', type: 'text' },
            { output: { ok: true }, toolCallId: 'tool-1', toolName: 'bash', type: 'tool-result' },
          ],
          providerMetadata: {
            'claude-code': {
              modelId: 'claude-haiku-4-5',
              sessionId: 'sess_assistant_tool_result',
            },
          },
          role: 'assistant',
        },
        { content: [{ text: 'continue', type: 'text' }], role: 'user' },
      ] as never,
      tools: [],
    });

    await readAllParts(result.stream);

    expect(result.request.body.args).toContain('--resume');
    expect(result.request.body.resume).toBe('sess_assistant_tool_result');
  });

  it('emits an error finish when stdout is unavailable', async () => {
    const { child } = createMockChild({ lines: [] });
    delete child.stdout;
    spawnMock.mockReturnValue(child);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');
    const result = await model.doStream({ prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }], tools: [] });
    const parts = await readAllParts(result.stream);

    expect(parts[1]).toMatchObject({ type: 'error' });
    expect(parts[2]).toMatchObject({ finishReason: { unified: 'error', raw: undefined }, type: 'finish' });
  });

  it('emits an error finish when stdin is unavailable', async () => {
    const { child, interfaceHandle } = createMockChild({ lines: [] });
    delete child.stdin;
    spawnMock.mockReturnValue(child);
    createInterfaceMock.mockReturnValue(interfaceHandle);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');
    const result = await model.doStream({ prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }], tools: [] });
    const parts = await readAllParts(result.stream);

    expect(parts.some((part) => isErrorPart(part) && String(part.error).includes('stdin is not available'))).toBe(true);
    expect(parts.some((part) => isFinishPart(part) && part.finishReason.unified === 'error')).toBe(true);
  });

  it('emits an error finish when stdin emits an error while writing the prompt', async () => {
    const { child, interfaceHandle } = createMockChild({ lines: [] });

    if (!child.stdin) {
      throw new Error('Expected stdin to be available in the mock child process.');
    }

    child.stdin.end = vi.fn((chunk?: string) => {
      if (typeof chunk === 'string') {
        child.stdin?.writes.push(chunk);
      }

      child.stdin?.emit('error', new Error('stdin write failed'));
      return child.stdin;
    });

    spawnMock.mockReturnValue(child);
    createInterfaceMock.mockReturnValue(interfaceHandle);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');
    const result = await model.doStream({ prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }], tools: [] });
    const parts = await readAllParts(result.stream);

    expect(parts.some((part) => isErrorPart(part) && String(part.error).includes('stdin write failed'))).toBe(true);
    expect(parts.some((part) => isFinishPart(part) && part.finishReason.unified === 'error')).toBe(true);
  });

  it('emits an error finish when stdin.end throws synchronously', async () => {
    const { child, interfaceHandle } = createMockChild({ lines: [] });

    if (!child.stdin) {
      throw new Error('Expected stdin to be available in the mock child process.');
    }

    child.stdin.end = vi.fn(() => {
      throw new Error('stdin end threw');
    });

    spawnMock.mockReturnValue(child);
    createInterfaceMock.mockReturnValue(interfaceHandle);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');
    const result = await model.doStream({ prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }], tools: [] });
    const parts = await readAllParts(result.stream);

    expect(parts.some((part) => isErrorPart(part) && String(part.error).includes('stdin end threw'))).toBe(true);
    expect(parts.some((part) => isFinishPart(part) && part.finishReason.unified === 'error')).toBe(true);
  });

  it('cancels the stream by killing the child process', async () => {
    const { child, interfaceHandle } = createMockChild({ lines: [] });
    spawnMock.mockReturnValue(child);
    createInterfaceMock.mockReturnValue(interfaceHandle);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');
    const result = await model.doStream({ prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }], tools: [] });

    await result.stream.cancel();

    expect(child.kill).toHaveBeenCalled();
  });

  it('emits an error finish for invalid cli output and non-zero exits', async () => {
    const invalid = createMockChild({ exitCode: 1, lines: ['[]'], stderr: 'parse failed' });
    spawnMock.mockReturnValueOnce(invalid.child);
    createInterfaceMock.mockReturnValueOnce(invalid.interfaceHandle);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');
    const invalidResult = await model.doStream({ prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }], tools: [] });
    const invalidParts = await readAllParts(invalidResult.stream);

    expect(invalidParts.some((part) => isErrorPart(part))).toBe(true);
    expect(invalidParts.some((part) => isFinishPart(part) && part.finishReason.unified === 'error')).toBe(true);

    const failed = createMockChild({ exitCode: 1, lines: [], stderr: 'broken' });
    spawnMock.mockReturnValueOnce(failed.child);
    createInterfaceMock.mockReturnValueOnce(failed.interfaceHandle);

    const failedResult = await model.doStream({ prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }], tools: [] });
    const failedParts = await readAllParts(failedResult.stream);

    expect(failedParts.some((part) => isErrorPart(part))).toBe(true);
    expect(failedParts.some((part) => isFinishPart(part) && part.finishReason.unified === 'error')).toBe(true);

    const signalOnly = createMockChild({ exitCode: 1, lines: [], signal: 'SIGTERM' });
    spawnMock.mockReturnValueOnce(signalOnly.child);
    createInterfaceMock.mockReturnValueOnce(signalOnly.interfaceHandle);

    const signalResult = await model.doStream({ prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }], tools: [] });
    const signalParts = await readAllParts(signalResult.stream);

    expect(signalParts.some((part) => isErrorPart(part) && String(part.error).includes('signal: SIGTERM'))).toBe(true);

    const unknownCode = createMockChild({ exitCode: undefined, lines: [] });
    spawnMock.mockReturnValueOnce(unknownCode.child);
    createInterfaceMock.mockReturnValueOnce(unknownCode.interfaceHandle);

    const unknownResult = await model.doStream({ prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }], tools: [] });
    const unknownParts = await readAllParts(unknownResult.stream);

    expect(unknownParts.some((part) => isErrorPart(part) && String(part.error).includes('code unknown'))).toBe(true);
  });

  it('falls back to a new session when resume fails', async () => {
    // First spawn: resume attempt that fails with exit code 1
    const failed = createMockChild({ exitCode: 1, lines: [], stderr: 'session not found' });
    // Second spawn: fallback new session that succeeds
    const success = createMockChild({
      lines: [
        JSON.stringify({ session_id: 'sess_fallback', subtype: 'init', type: 'system' }),
        JSON.stringify({ event: { content_block: { type: 'text' }, index: 0, type: 'content_block_start' }, type: 'stream_event' }),
        JSON.stringify({
          event: { delta: { text: 'recovered', type: 'text_delta' }, index: 0, type: 'content_block_delta' },
          type: 'stream_event',
        }),
        JSON.stringify({ event: { index: 0, type: 'content_block_stop' }, type: 'stream_event' }),
        JSON.stringify({ subtype: 'success', type: 'result', usage: { input_tokens: 1, output_tokens: 1 } }),
      ],
    });

    spawnMock.mockReturnValueOnce(failed.child).mockReturnValueOnce(success.child);
    createInterfaceMock.mockReturnValueOnce(failed.interfaceHandle).mockReturnValueOnce(success.interfaceHandle);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');
    const result = await model.doStream({
      prompt: [
        { content: [{ text: 'hello', type: 'text' }], role: 'user' },
        { content: [{ text: 'hi!', type: 'text' }], role: 'assistant' },
        { content: [{ text: 'continue', type: 'text' }], role: 'user' },
      ] as never,
      providerOptions: { 'claude-code': { sessionId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' } },
      tools: [],
    });

    const parts = await readAllParts(result.stream);

    // spawn should have been called twice: first resume attempt, then fallback
    expect(spawnMock).toHaveBeenCalledTimes(2);

    // First call should have --resume
    const firstCallArgs = spawnMock.mock.calls[0]![1] as string[];
    expect(firstCallArgs).toContain('--resume');

    // Second call (fallback) should NOT have --resume but should have --session-id
    const secondCallArgs = spawnMock.mock.calls[1]![1] as string[];
    expect(secondCallArgs).not.toContain('--resume');
    expect(secondCallArgs).toContain('--session-id');

    // The first child should have been killed during fallback
    expect(failed.child.kill).toHaveBeenCalled();

    // Stream should have successful output from the fallback session
    expect(parts).toEqual([
      { type: 'stream-start', warnings: [] },
      { id: 'text-0', type: 'text-start' },
      { delta: 'recovered', id: 'text-0', type: 'text-delta' },
      { id: 'text-0', type: 'text-end' },
      {
        finishReason: { unified: 'other', raw: undefined },
        providerMetadata: {
          anthropic: {},
          'claude-code': {
            modelId: 'claude-haiku-4-5',
            sessionId: 'sess_fallback',
          },
        },
        type: 'finish',
        usage: {
          inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 1, text: undefined, reasoning: undefined },
        },
      },
    ]);
  });

  it('emits an error finish when the child process errors before close', async () => {
    const { child, interfaceHandle } = createErrorMockChild('spawn failed');
    spawnMock.mockReturnValue(child);
    createInterfaceMock.mockReturnValue(interfaceHandle);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');
    const result = await model.doStream({ prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }], tools: [] });
    const parts = await readAllParts(result.stream);

    expect(parts.some((part) => isErrorPart(part) && String(part.error).includes('spawn failed'))).toBe(true);
    expect(parts.some((part) => isFinishPart(part) && part.finishReason.unified === 'error')).toBe(true);
  });
});

type MockChild = EventEmitter & {
  kill: ReturnType<typeof vi.fn>;
  stderr: EventEmitter;
  stdin?: MockStdin;
  stdout?: object;
};

function createMockChild(options: { exitCode?: number; lines: string[]; signal?: string | null; stderr?: string }): {
  child: MockChild;
  interfaceHandle: MockInterface;
} {
  const child = new EventEmitter() as MockChild;
  child.kill = vi.fn();
  child.stderr = new EventEmitter();
  child.stdin = createMockStdin();
  child.stdout = {};

  const interfaceHandle: MockInterface = {
    async *[Symbol.asyncIterator]() {
      for (const line of options.lines) {
        yield line;
      }

      if (options.stderr) {
        child.stderr.emit('data', Buffer.from(options.stderr));
      }

      child.emit('close', 'exitCode' in options ? options.exitCode : 0, options.signal ?? null);
    },
    close: vi.fn(),
  };

  return { child, interfaceHandle };
}

function createErrorMockChild(message: string): { child: MockChild; interfaceHandle: MockInterface } {
  const child = new EventEmitter() as MockChild;
  child.kill = vi.fn();
  child.stderr = new EventEmitter();
  child.stdin = createMockStdin();
  child.stdout = {};

  const interfaceHandle: MockInterface = {
    [Symbol.asyncIterator]() {
      let done = false;

      return {
        async next() {
          if (!done) {
            done = true;
            await Promise.resolve();
            child.emit('error', new Error(message));
          }

          return { done: true, value: undefined };
        },
      };
    },
    close: vi.fn(),
  };

  return { child, interfaceHandle };
}

type MockInterface = {
  [Symbol.asyncIterator]: () => AsyncIterator<string>;
  close: ReturnType<typeof vi.fn>;
};

type MockStdin = EventEmitter & {
  end: ReturnType<typeof vi.fn>;
  writes: string[];
};

function createMockStdin(): MockStdin {
  const stdin = new EventEmitter() as MockStdin;
  stdin.writes = [];
  stdin.end = vi.fn((chunk?: string) => {
    if (typeof chunk === 'string') {
      stdin.writes.push(chunk);
    }

    stdin.emit('finish');
    return stdin;
  });

  return stdin;
}

async function readAllParts(stream: ReadableStream<unknown>): Promise<unknown[]> {
  const reader = stream.getReader();
  const parts: unknown[] = [];

  while (true) {
    const chunk = await reader.read();

    if (chunk.done) {
      return parts;
    }

    parts.push(chunk.value);
  }
}

function isErrorPart(part: unknown): part is { error: unknown; type: 'error' } {
  return typeof part === 'object' && part !== null && 'type' in part && part.type === 'error';
}

function isFinishPart(part: unknown): part is { finishReason: { unified: string; raw: unknown }; type: 'finish' } {
  return typeof part === 'object' && part !== null && 'type' in part && part.type === 'finish';
}
