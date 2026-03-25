import { query } from '@anthropic-ai/claude-agent-sdk';

import { buildBridge } from './bridge.js';
import { toAgentMcp } from './mcp.js';
import { createStreamState, mapSdkMessage } from './messages.js';
import { buildPrompt, getSystem, loadClaudeMd } from './prompt.js';
import { getResume } from './resume.js';
import { normalizeProviderOptions } from './types.js';

import type { ClaudeCodeProviderOptions } from './types.js';
import type { LanguageModelV2, LanguageModelV2CallOptions, LanguageModelV2StreamPart } from '@ai-sdk/provider';

export class ClaudeCodeLanguageModel implements LanguageModelV2 {
  public readonly modelId: string;
  public readonly provider = 'claude-code';
  public readonly specificationVersion = 'v2' as const;
  public readonly supportedUrls: Record<string, RegExp[]> = {};
  private readonly defaults: ClaudeCodeProviderOptions;

  constructor(modelId: string, defaults: ClaudeCodeProviderOptions = {}) {
    this.modelId = modelId;
    this.defaults = {
      ...defaults,
      queryRunner: defaults.queryRunner ?? query,
    };
  }

  public async doGenerate(): Promise<never> {
    throw new Error('Claude Code provider only supports the streaming path. Use doStream() instead.');
  }

  public async doStream(options: LanguageModelV2CallOptions) {
    const normalizedOptions = normalizeProviderOptions(
      (options.providerOptions?.['claude-code'] ?? undefined) as Record<string, unknown> | undefined,
      this.defaults,
    );

    const bridge = buildBridge({
      abortSignal: options.abortSignal,
      bridgeTools: normalizedOptions.bridgeTools,
      nativeTools: normalizedOptions.nativeTools,
      prompt: options.prompt,
      toolPreference: normalizedOptions.toolPreference,
      tools: options.tools,
    });
    const opencodeMcp = normalizedOptions.bridgeOpenCodeMcp ? toAgentMcp(normalizedOptions.openCodeMcp) : { servers: {}, warnings: [] };
    const resumeSessionId = getResume(options.prompt, this.modelId);
    const prompt = buildPrompt(options.prompt, { resumeSessionId });
    const claudeMd = await loadClaudeMd({
      cwd: normalizedOptions.cwd,
      explicitPath: normalizedOptions.claudeMdPath,
      loadClaudeMd: normalizedOptions.loadClaudeMd,
    });
    const system = [getSystem(options.prompt), claudeMd].filter((value): value is string => Boolean(value)).join('\n\n');
    const warnings = [...bridge.warnings, ...opencodeMcp.warnings].map((message) => ({ message, type: 'other' as const }));
    const streamState = createStreamState();
    const abortController = new AbortController();
    const currentModelId = this.modelId;

    options.abortSignal?.addEventListener('abort', () => {
      abortController.abort(options.abortSignal?.reason);
    });

    const permissionMode = resolvePermissionMode(normalizedOptions.permissionMode, bridge.nativeTools.length > 0);

    const run = normalizedOptions.queryRunner({
      options: {
        abortController,
        allowedTools: bridge.allowedTools,
        cwd: normalizedOptions.cwd,
        env: normalizedOptions.env,
        includePartialMessages: true,
        maxTurns: normalizedOptions.maxTurns,
        mcpServers: {
          ...opencodeMcp.servers,
          ...normalizedOptions.mcpServers,
          ...bridge.mcpServers,
        },
        model: this.modelId,
        pathToClaudeCodeExecutable: normalizedOptions.pathToClaudeCodeExecutable,
        ...(bridge.permissionPromptToolName ? { permissionPromptToolName: bridge.permissionPromptToolName } : {}),
        ...(permissionMode === 'bypassPermissions' ? { allowDangerouslySkipPermissions: true } : {}),
        permissionMode,
        resume: resumeSessionId,
        systemPrompt: system
          ? {
              append: system,
              preset: 'claude_code' as const,
              type: 'preset' as const,
            }
          : {
              preset: 'claude_code' as const,
              type: 'preset' as const,
            },
        tools: bridge.nativeTools,
      },
      prompt,
    });

    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      async start(controller) {
        controller.enqueue({ type: 'stream-start', warnings });

        try {
          for await (const message of run) {
            const parts = mapSdkMessage(message, streamState);

            for (const part of parts) {
              controller.enqueue(part);
            }
          }

          controller.enqueue({
            finishReason: streamState.finishReason,
            providerMetadata: buildProviderMetadata(currentModelId, streamState.sessionId),
            type: 'finish',
            usage: streamState.usage,
          });
        } catch (error) {
          controller.enqueue({ error, type: 'error' });
          controller.enqueue({
            finishReason: 'error',
            providerMetadata: buildProviderMetadata(currentModelId, streamState.sessionId),
            type: 'finish',
            usage: streamState.usage,
          });
        } finally {
          run.close();
          controller.close();
        }
      },
      cancel() {
        abortController.abort();
        run.close();
      },
    });

    return {
      request: {
        body: {
          allowedTools: bridge.allowedTools,
          model: this.modelId,
          permissionMode,
          prompt,
          resume: resumeSessionId,
          system,
          tools: bridge.nativeTools,
        },
      },
      response: {
        headers: {},
      },
      stream,
    };
  }
}

function buildProviderMetadata(modelId: string, sessionId: string | undefined) {
  return {
    'claude-code': {
      modelId,
      ...(sessionId ? { sessionId } : {}),
    },
  };
}

function resolvePermissionMode(explicitPermissionMode: ClaudeCodeProviderOptions['permissionMode'], hasNativeTools: boolean) {
  if (explicitPermissionMode) {
    return explicitPermissionMode;
  }

  return hasNativeTools ? 'default' : 'bypassPermissions';
}
