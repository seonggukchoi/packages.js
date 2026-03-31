import { spawn } from 'node:child_process';

import { buildCliArgs, streamCliProcess, writePromptToCliProcess } from './cli.js';
import { createStreamState, toLanguageModelUsage } from './messages.js';
import { buildPrompt, getSystem } from './prompt.js';
import { getResume } from './resume.js';
import { createToolCallTextState } from './tool-call-parser.js';
import { buildToolSystemPrompt } from './tool-prompt.js';
import { DEFAULT_MAX_TURNS, normalizeProviderOptions } from './types.js';

import type { ClaudeCodeProviderOptions, ProviderMetadataValue } from './types.js';
import type { LanguageModelV2, LanguageModelV2CallOptions, LanguageModelV2StreamPart } from '@ai-sdk/provider';

export class ClaudeCodeLanguageModel implements LanguageModelV2 {
  public readonly modelId: string;
  public readonly provider = 'claude-code';
  public readonly specificationVersion = 'v2' as const;
  public readonly supportedUrls: Record<string, RegExp[]> = {};
  private activeSessionId: string | undefined;
  private readonly defaults: ClaudeCodeProviderOptions;

  constructor(modelId: string, defaults: ClaudeCodeProviderOptions = {}) {
    this.modelId = modelId;
    this.defaults = defaults;
  }

  public async doGenerate(): Promise<never> {
    throw new Error('Claude Code provider only supports the streaming path. Use doStream() instead.');
  }

  public async doStream(options: LanguageModelV2CallOptions) {
    const normalizedOptions = normalizeProviderOptions(
      (options.providerOptions?.['claude-code'] ?? undefined) as Record<string, unknown> | undefined,
      this.defaults,
    );
    const cwd = process.cwd();
    const hasConversationHistory = options.prompt.some((message) => message.role === 'assistant');
    const resumeSessionId = getResume(options.prompt, this.modelId) ?? (hasConversationHistory ? this.activeSessionId : undefined);

    if (!hasConversationHistory) {
      this.activeSessionId = undefined;
    }

    const prompt = buildPrompt(options.prompt, { resumeSessionId });

    if (prompt.length === 0) {
      return createStopResponse(this.modelId, this.activeSessionId);
    }

    const toolSystemPrompt = buildToolSystemPrompt(options.tools);
    const system = [getSystem(options.prompt), toolSystemPrompt].filter((value): value is string => Boolean(value)).join('\n\n');
    const cliArgs = buildCliArgs({
      effort: normalizedOptions.effort,
      maxTurns: DEFAULT_MAX_TURNS,
      model: this.modelId,
      resumeSessionId,
      system,
    });
    const streamState = createStreamState();
    const textState = createToolCallTextState();
    const currentModelId = this.modelId;
    const persistSessionId = (sessionId: string | undefined) => {
      if (sessionId) {
        this.activeSessionId = sessionId;
      }
    };
    let child: ReturnType<typeof spawn> | undefined;

    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      async start(controller) {
        controller.enqueue({ type: 'stream-start', warnings: [] });

        try {
          child = spawn(normalizedOptions.pathToClaudeCodeExecutable, cliArgs, {
            cwd,
            env: normalizedOptions.env,
            stdio: ['pipe', 'pipe', 'pipe'],
          });

          options.abortSignal?.addEventListener('abort', () => {
            child?.kill();
          });

          await Promise.all([streamCliProcess({ child, controller, streamState, textState }), writePromptToCliProcess(child, prompt)]);

          controller.enqueue({
            finishReason: streamState.finishReason,
            providerMetadata: buildProviderMetadata(currentModelId, streamState.sessionId, streamState.usage.cacheCreationInputTokens),
            type: 'finish',
            usage: toLanguageModelUsage(streamState.usage),
          });
        } catch (error) {
          controller.enqueue({ error, type: 'error' });
          controller.enqueue({
            finishReason: 'error',
            providerMetadata: buildProviderMetadata(currentModelId, streamState.sessionId, streamState.usage.cacheCreationInputTokens),
            type: 'finish',
            usage: toLanguageModelUsage(streamState.usage),
          });
        } finally {
          persistSessionId(streamState.sessionId);
          child?.kill();
          controller.close();
        }
      },
      cancel() {
        child?.kill();
      },
    });

    return {
      request: {
        body: {
          args: cliArgs,
          model: this.modelId,
          prompt,
          ...(resumeSessionId ? { resume: resumeSessionId } : {}),
          ...(system ? { system } : {}),
        },
      },
      response: {
        headers: {},
      },
      stream,
    };
  }
}

function createStopResponse(modelId: string, sessionId: string | undefined) {
  const metadata = buildProviderMetadata(modelId, sessionId, undefined);

  const stream = new ReadableStream<LanguageModelV2StreamPart>({
    start(controller) {
      controller.enqueue({ type: 'stream-start', warnings: [] });
      controller.enqueue({
        finishReason: 'stop',
        providerMetadata: metadata,
        type: 'finish',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      });
      controller.close();
    },
  });

  return {
    request: { body: { model: modelId, ...(sessionId ? { resume: sessionId } : {}) } },
    response: { headers: {} },
    stream,
  };
}

function buildProviderMetadata(modelId: string, sessionId: string | undefined, cacheCreationInputTokens: number | undefined) {
  const providerName = 'claude-code';

  return {
    anthropic: {
      ...(typeof cacheCreationInputTokens === 'number'
        ? {
            cacheCreationInputTokens,
          }
        : {}),
    },
    [providerName]: {
      modelId,
      ...(sessionId ? ({ sessionId } satisfies ProviderMetadataValue) : {}),
    },
  };
}
