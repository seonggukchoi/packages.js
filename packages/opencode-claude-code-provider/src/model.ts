import { spawn } from 'node:child_process';

import { buildCliArgs, streamCliProcess, writePromptToCliProcess } from './cli.js';
import { createStreamState, toLanguageModelUsage, toV3FinishReason } from './messages.js';
import { buildPrompt, getSystem } from './prompt.js';
import { getResume } from './resume.js';
import { createToolCallTextState } from './tool-call-parser.js';
import { buildToolSystemPrompt } from './tool-prompt.js';
import { DEFAULT_MAX_TURNS, normalizeProviderOptions } from './types.js';

import type { ClaudeCodeProviderOptions, ProviderMetadataValue } from './types.js';
import type { LanguageModelV3, LanguageModelV3CallOptions, LanguageModelV3StreamPart } from '@ai-sdk/provider';

export class ClaudeCodeLanguageModel implements LanguageModelV3 {
  public readonly modelId: string;
  public readonly provider = 'claude-code';
  public readonly specificationVersion = 'v3' as const;
  public readonly supportedUrls: Record<string, RegExp[]> = {};
  private readonly defaults: ClaudeCodeProviderOptions;

  constructor(modelId: string, defaults: ClaudeCodeProviderOptions = {}) {
    this.modelId = modelId;
    this.defaults = defaults;
  }

  public async doGenerate(): Promise<never> {
    throw new Error('Claude Code provider only supports the streaming path. Use doStream() instead.');
  }

  public async doStream(options: LanguageModelV3CallOptions) {
    const normalizedOptions = normalizeProviderOptions(
      (options.providerOptions?.['claude-code'] ?? undefined) as Record<string, unknown> | undefined,
      this.defaults,
    );
    const cwd = process.cwd();
    // V3Prompt and V2Prompt are structurally identical at runtime; cast to satisfy internal helpers.
    const promptMessages = options.prompt as unknown as import('@ai-sdk/provider').LanguageModelV2Prompt;
    const hasConversationHistory = promptMessages.some((message) => message.role === 'assistant');
    const sessionId = normalizedOptions.sessionId;
    const resumeSessionId = (hasConversationHistory ? sessionId : undefined) ?? getResume(promptMessages, this.modelId);

    const prompt = buildPrompt(promptMessages, { resumeSessionId });
    const toolSystemPrompt = buildToolSystemPrompt(options.tools);
    const system = [getSystem(promptMessages), toolSystemPrompt].filter((value): value is string => Boolean(value)).join('\n\n');
    const cliArgs = buildCliArgs({
      effort: normalizedOptions.effort,
      maxTurns: DEFAULT_MAX_TURNS,
      model: this.modelId,
      resumeSessionId,
      sessionId,
      system,
    });
    const currentModelId = this.modelId;
    let child: ReturnType<typeof spawn> | undefined;

    const stream = new ReadableStream<LanguageModelV3StreamPart>({
      async start(controller) {
        controller.enqueue({ type: 'stream-start', warnings: [] });

        let streamState = createStreamState();
        let textState = createToolCallTextState();

        try {
          try {
            child = spawn(normalizedOptions.pathToClaudeCodeExecutable, cliArgs, {
              cwd,
              env: normalizedOptions.env,
              stdio: ['pipe', 'pipe', 'pipe'],
            });

            options.abortSignal?.addEventListener('abort', () => {
              child?.kill();
            });

            await Promise.all([
              streamCliProcess({ child, controller, logFile: normalizedOptions.logFile, streamState, textState }),
              writePromptToCliProcess(child, prompt),
            ]);
          } catch (resumeError) {
            if (!resumeSessionId) {
              throw resumeError;
            }

            // Resume failed (e.g. session does not exist); fall back to a new session.
            child?.kill();
            streamState = createStreamState();
            textState = createToolCallTextState();

            const fallbackArgs = buildCliArgs({
              effort: normalizedOptions.effort,
              maxTurns: DEFAULT_MAX_TURNS,
              model: currentModelId,
              sessionId,
              system,
            });
            const fallbackPrompt = buildPrompt(promptMessages, {});

            child = spawn(normalizedOptions.pathToClaudeCodeExecutable, fallbackArgs, {
              cwd,
              env: normalizedOptions.env,
              stdio: ['pipe', 'pipe', 'pipe'],
            });

            /* v8 ignore start */
            options.abortSignal?.addEventListener('abort', () => {
              child?.kill();
            });
            /* v8 ignore stop */

            await Promise.all([
              streamCliProcess({ child, controller, logFile: normalizedOptions.logFile, streamState, textState }),
              writePromptToCliProcess(child, fallbackPrompt),
            ]);
          }

          controller.enqueue({
            finishReason: toV3FinishReason(streamState.finishReason),
            providerMetadata: buildProviderMetadata(
              currentModelId,
              streamState.sessionId,
              streamState.usage.cacheCreationInputTokens,
              streamState.costUsd,
            ),
            type: 'finish',
            usage: toLanguageModelUsage(streamState.usage),
          });
        } catch (error) {
          controller.enqueue({ error, type: 'error' });
          controller.enqueue({
            finishReason: toV3FinishReason('error'),
            providerMetadata: buildProviderMetadata(
              currentModelId,
              streamState.sessionId,
              streamState.usage.cacheCreationInputTokens,
              streamState.costUsd,
            ),
            type: 'finish',
            usage: toLanguageModelUsage(streamState.usage),
          });
        } finally {
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

function buildProviderMetadata(
  modelId: string,
  sessionId: string | undefined,
  cacheCreationInputTokens: number | undefined,
  costUsd: number | undefined,
) {
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
      ...(typeof costUsd === 'number' ? { costUsd } : {}),
    },
  };
}
