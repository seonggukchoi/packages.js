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
    expect(result.request.body.args).toContain('--resume');
    expect(result.request.body.args).toContain('sess_resume');
    expect(parts).toEqual([
      { type: 'stream-start', warnings: [] },
      { id: 'text-0', type: 'text-start' },
      { delta: 'hello', id: 'text-0', type: 'text-delta' },
      { id: 'text-0', type: 'text-end' },
      {
        finishReason: 'unknown',
        providerMetadata: {
          'claude-code': {
            modelId: 'claude-haiku-4-5',
            sessionId: 'sess_plain',
          },
        },
        type: 'finish',
        usage: {
          cachedInputTokens: undefined,
          inputTokens: 1,
          outputTokens: 1,
          reasoningTokens: undefined,
          totalTokens: 2,
        },
      },
    ]);
    expect(child.kill).toHaveBeenCalled();
    expect(createInterfaceMock).toHaveBeenCalledWith({ input: child.stdout });
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
    expect(result.request.body.system).toContain('When a tool is required');
    expect(parts).toEqual([
      { type: 'stream-start', warnings: [] },
      { id: 'tool-call-1', toolName: 'bash', type: 'tool-input-start' },
      { delta: '{"command":"ls"}', id: 'tool-call-1', type: 'tool-input-delta' },
      { id: 'tool-call-1', type: 'tool-input-end' },
      { input: '{"command":"ls"}', toolCallId: 'tool-call-1', toolName: 'bash', type: 'tool-call' },
      {
        finishReason: 'tool-calls',
        providerMetadata: {
          'claude-code': {
            modelId: 'claude-haiku-4-5',
            sessionId: 'sess_tool',
          },
        },
        type: 'finish',
        usage: {
          cachedInputTokens: undefined,
          inputTokens: undefined,
          outputTokens: undefined,
          reasoningTokens: undefined,
          totalTokens: undefined,
        },
      },
    ]);
  });

  it('emits an error finish when stdout is unavailable', async () => {
    const child = new EventEmitter() as MockChild;
    child.kill = vi.fn();
    child.stderr = new EventEmitter();
    spawnMock.mockReturnValue(child);

    const { ClaudeCodeLanguageModel } = await import('./model.js');
    const model = new ClaudeCodeLanguageModel('claude-haiku-4-5');
    const result = await model.doStream({ prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }], tools: [] });
    const parts = await readAllParts(result.stream);

    expect(parts[1]).toMatchObject({ type: 'error' });
    expect(parts[2]).toMatchObject({ finishReason: 'error', type: 'finish' });
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
    expect(invalidParts.some((part) => isFinishPart(part) && part.finishReason === 'error')).toBe(true);

    const failed = createMockChild({ exitCode: 1, lines: [], stderr: 'broken' });
    spawnMock.mockReturnValueOnce(failed.child);
    createInterfaceMock.mockReturnValueOnce(failed.interfaceHandle);

    const failedResult = await model.doStream({ prompt: [{ content: [{ text: 'hello', type: 'text' }], role: 'user' }], tools: [] });
    const failedParts = await readAllParts(failedResult.stream);

    expect(failedParts.some((part) => isErrorPart(part))).toBe(true);
    expect(failedParts.some((part) => isFinishPart(part) && part.finishReason === 'error')).toBe(true);

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
});

type MockChild = EventEmitter & {
  kill: ReturnType<typeof vi.fn>;
  stderr: EventEmitter;
  stdout?: object;
};

function createMockChild(options: { exitCode?: number; lines: string[]; signal?: string | null; stderr?: string }): {
  child: MockChild;
  interfaceHandle: MockInterface;
} {
  const child = new EventEmitter() as MockChild;
  child.kill = vi.fn();
  child.stderr = new EventEmitter();
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

type MockInterface = {
  [Symbol.asyncIterator]: () => AsyncIterator<string>;
  close: ReturnType<typeof vi.fn>;
};

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

function isFinishPart(part: unknown): part is { finishReason: string; type: 'finish' } {
  return typeof part === 'object' && part !== null && 'type' in part && part.type === 'finish';
}
