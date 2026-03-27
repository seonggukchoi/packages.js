import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

import { createStreamState, mapCliMessage } from './messages.js';
import { buildPrompt, getSystem, loadClaudeMd } from './prompt.js';
import { getResume } from './resume.js';
import { isRecord, normalizeProviderOptions } from './types.js';

import type { ClaudeCodeProviderOptions, ProviderMetadataValue } from './types.js';
import type { LanguageModelV2, LanguageModelV2CallOptions, LanguageModelV2StreamPart } from '@ai-sdk/provider';

type ToolPromptDefinition = {
  description?: string;
  inputSchema: Record<string, unknown>;
  name: string;
};

export type ToolCallTextState = {
  buffers: Map<string, string>;
};

export class ClaudeCodeLanguageModel implements LanguageModelV2 {
  public readonly modelId: string;
  public readonly provider = 'claude-code';
  public readonly specificationVersion = 'v2' as const;
  public readonly supportedUrls: Record<string, RegExp[]> = {};
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
    const resumeSessionId = shouldResumeSession(options.prompt) ? getResume(options.prompt, this.modelId) : undefined;
    const prompt = buildPrompt(options.prompt, { resumeSessionId });
    const claudeMd = await loadClaudeMd({
      cwd: normalizedOptions.cwd,
      explicitPath: normalizedOptions.claudeMdPath,
      loadClaudeMd: normalizedOptions.loadClaudeMd,
    });
    const toolSystemPrompt = buildToolSystemPrompt(options.tools);
    const system = [getSystem(options.prompt), claudeMd, toolSystemPrompt].filter((value): value is string => Boolean(value)).join('\n\n');
    const cliArgs = buildCliArgs({
      maxTurns: normalizedOptions.maxTurns,
      model: this.modelId,
      resumeSessionId,
      system,
    });
    const streamState = createStreamState();
    const textState = createToolCallTextState();
    const currentModelId = this.modelId;
    let child: ReturnType<typeof spawn> | undefined;

    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      async start(controller) {
        controller.enqueue({ type: 'stream-start', warnings: [] });

        try {
          child = spawn(normalizedOptions.pathToClaudeCodeExecutable, [...cliArgs, prompt], {
            cwd: normalizedOptions.cwd,
            env: normalizedOptions.env,
            stdio: ['ignore', 'pipe', 'pipe'],
          });

          options.abortSignal?.addEventListener('abort', () => {
            child?.kill();
          });

          await streamCliProcess({ child, controller, streamState, textState });

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

export function buildToolSystemPrompt(tools: unknown): string | undefined {
  const definitions = sortToolDefinitions(resolveToolDefinitions(tools));

  if (definitions.length === 0) {
    return undefined;
  }

  const selectionRules = buildToolSelectionRules(definitions);

  const serializedTools = definitions
    .map((tool) => {
      const sections = [`- ${tool.name}`];

      if (tool.description) {
        sections.push(`  description: ${tool.description}`);
      }

      sections.push(`  parameters: ${safeJsonStringify(tool.inputSchema)}`);

      return sections.join('\n');
    })
    .join('\n');

  return [
    'You may use tools provided by the client.',
    'When a tool is required, output exactly one tool call wrapped in <tool_call> and </tool_call>.',
    'Inside the tag, output strict JSON with the shape {"name":"tool_name","arguments":{}}.',
    'Do not include any prose before or after the tool call.',
    'Do not use <function_calls>, <function_call>, <tool_use>, XML parameters, markdown fences, or natural-language explanations.',
    'After emitting a tool call, stop immediately.',
    'Never hallucinate tool execution or tool results.',
    'Call at most one tool per response.',
    ...(selectionRules.length > 0 ? ['Tool selection rules:', ...selectionRules] : []),
    'Available tools:',
    serializedTools,
  ].join('\n');
}

export function createToolCallTextState(): ToolCallTextState {
  return {
    buffers: new Map(),
  };
}

export function processTextBuffer(
  part: LanguageModelV2StreamPart,
  streamState: ReturnType<typeof createStreamState>,
  textState: ToolCallTextState,
): LanguageModelV2StreamPart[] {
  if (part.type === 'text-start') {
    textState.buffers.set(part.id, '');
    return [];
  }

  if (part.type === 'text-delta') {
    const current = textState.buffers.get(part.id) ?? '';
    textState.buffers.set(part.id, current + part.delta);
    return [];
  }

  if (part.type === 'text-end') {
    const current = textState.buffers.get(part.id) ?? '';
    const next = consumeTextBuffer(current, streamState);

    textState.buffers.delete(part.id);

    if (next.hasToolCalls) {
      return next.parts;
    }

    if (next.text.length === 0) {
      return [];
    }

    return [
      { id: part.id, type: 'text-start' },
      { delta: next.text, id: part.id, type: 'text-delta' },
      { id: part.id, type: 'text-end' },
    ];
  }

  return [part];
}

function buildCliArgs(options: { maxTurns: number; model: string; resumeSessionId?: string; system?: string }): string[] {
  return [
    '-p',
    '--tools',
    '',
    '--output-format',
    'stream-json',
    '--include-partial-messages',
    '--max-turns',
    String(options.maxTurns),
    '--model',
    options.model,
    '--dangerously-skip-permissions',
    ...(options.system ? ['--system-prompt', options.system] : []),
    ...(options.resumeSessionId ? ['--resume', options.resumeSessionId] : []),
  ];
}

function shouldResumeSession(prompt: LanguageModelV2CallOptions['prompt']): boolean {
  return !prompt.some((message) => {
    if (message.role === 'tool') {
      return true;
    }

    if (message.role !== 'assistant') {
      return false;
    }

    return message.content.some((part) => part.type === 'tool-result');
  });
}

function buildProviderMetadata(modelId: string, sessionId: string | undefined) {
  const providerName = 'claude-code';

  return {
    [providerName]: {
      modelId,
      ...(sessionId ? ({ sessionId } satisfies ProviderMetadataValue) : {}),
    },
  };
}

async function streamCliProcess(options: {
  child: ReturnType<typeof spawn>;
  controller: ReadableStreamDefaultController<LanguageModelV2StreamPart>;
  streamState: ReturnType<typeof createStreamState>;
  textState: ToolCallTextState;
}): Promise<void> {
  const { child, controller, streamState, textState } = options;
  const pendingParts: LanguageModelV2StreamPart[] = [];
  const stderrChunks: string[] = [];

  child.stderr?.on('data', (chunk) => {
    stderrChunks.push(chunk.toString());
  });

  const exitPromise = new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const stderr = stderrChunks.join('').trim();
      const details =
        stderr.length > 0 ? stderr : `Claude CLI exited with code ${code ?? 'unknown'}${signal ? ` (signal: ${signal})` : ''}.`;

      reject(new Error(details));
    });
  });

  if (!child.stdout) {
    throw new Error('Claude CLI stdout is not available.');
  }

  const reader = createInterface({ input: child.stdout });

  try {
    for await (const line of reader) {
      if (line.trim().length === 0) {
        continue;
      }

      const message = parseCliMessage(line);
      const parts = mapCliMessage(message, streamState);

      for (const part of parts) {
        for (const processedPart of processTextBuffer(part, streamState, textState)) {
          pendingParts.push(processedPart);
        }
      }
    }

    await exitPromise;
    for (const part of finalizeStreamParts(pendingParts)) {
      controller.enqueue(part);
    }
  } finally {
    reader.close();
  }
}

function finalizeStreamParts(parts: LanguageModelV2StreamPart[]): LanguageModelV2StreamPart[] {
  if (!parts.some((part) => part.type === 'tool-call')) {
    return parts;
  }

  return parts.filter((part) => part.type !== 'text-start' && part.type !== 'text-delta' && part.type !== 'text-end');
}

function consumeTextBuffer(
  buffer: string,
  streamState: ReturnType<typeof createStreamState>,
): {
  hasToolCalls: boolean;
  parts: LanguageModelV2StreamPart[];
  text: string;
} {
  const toolCalls = extractToolCallParts(buffer, streamState);

  if (toolCalls.length > 0) {
    return {
      hasToolCalls: true,
      parts: toolCalls,
      text: '',
    };
  }

  return {
    hasToolCalls: false,
    parts: [],
    text: buffer,
  };
}

function parseToolCallPayload(rawToolCall: string): { arguments: Record<string, unknown>; name: string } | undefined {
  try {
    const parsed = JSON.parse(rawToolCall);

    if (!isRecord(parsed) || typeof parsed.name !== 'string' || parsed.name.length === 0) {
      return undefined;
    }

    const explicitArguments = normalizeToolArguments(parsed.arguments);

    if (explicitArguments) {
      return {
        arguments: explicitArguments,
        name: parsed.name,
      };
    }

    const restEntries = Object.entries(parsed).filter(([key]) => key !== 'arguments' && key !== 'name');

    return {
      arguments: Object.fromEntries(restEntries),
      name: parsed.name,
    };
  } catch {
    return undefined;
  }
}

function extractToolCallParts(text: string, streamState: ReturnType<typeof createStreamState>): LanguageModelV2StreamPart[] {
  const matches = [
    ...collectToolCallMatches(text, /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g, (content) => parseToolCallPayload(content)),
    ...collectToolCallMatches(text, /<tool_use>\s*([\s\S]*?)\s*<\/tool_use>/g, (content) => parseToolUsePayload(content)),
    ...collectToolCallMatches(text, /<function_call>\s*([\s\S]*?)(?:<\/function_call>|<\/function_calls>|<\/invoke>)/g, (content) =>
      parseFunctionCallPayload(content),
    ),
  ].sort((left, right) => left.index - right.index);

  return matches.flatMap((match) => createToolCallSequenceFromPayload(match.payload, streamState));
}

function collectToolCallMatches(
  text: string,
  pattern: RegExp,
  parse: (content: string) => { arguments: Record<string, unknown>; name: string } | undefined,
): Array<{ index: number; payload: { arguments: Record<string, unknown>; name: string } }> {
  const matches: Array<{ index: number; payload: { arguments: Record<string, unknown>; name: string } }> = [];

  for (const match of text.matchAll(pattern)) {
    const content = match[1];
    const index = match.index ?? 0;
    const payload = parse(content);

    if (payload) {
      matches.push({ index, payload });
    }
  }

  return matches;
}

function createToolCallSequenceFromPayload(
  payload: { arguments: Record<string, unknown>; name: string } | undefined,
  streamState: ReturnType<typeof createStreamState>,
): LanguageModelV2StreamPart[] {
  if (!payload) {
    return [];
  }

  streamState.toolCallCounter += 1;
  const toolCallId = `tool-call-${streamState.toolCallCounter}`;
  const input = safeJsonStringify(payload.arguments);

  return [
    { id: toolCallId, toolName: payload.name, type: 'tool-input-start' },
    { delta: input, id: toolCallId, type: 'tool-input-delta' },
    { id: toolCallId, type: 'tool-input-end' },
    {
      input,
      toolCallId,
      toolName: payload.name,
      type: 'tool-call',
    },
  ];
}

function parseToolUsePayload(content: string): { arguments: Record<string, unknown>; name: string } | undefined {
  const name = getXmlTagValue(content, 'name');

  if (!name) {
    return undefined;
  }

  const argumentsText =
    getXmlTagValue(content, 'arguments') ?? getXmlTagValue(content, 'parameters') ?? getNamedParameterValue(content, 'arguments');

  const argumentsValue = normalizeToolArguments(argumentsText);

  return {
    arguments: argumentsValue ?? {},
    name,
  };
}

function parseFunctionCallPayload(content: string): { arguments: Record<string, unknown>; name: string } | undefined {
  const name = getXmlTagValue(content, 'function_name') ?? getXmlTagValue(content, 'name');

  if (!name) {
    return undefined;
  }

  const structuredArguments =
    normalizeToolArguments(getXmlTagValue(content, 'arguments')) ?? normalizeToolArguments(getXmlTagValue(content, 'parameters'));

  if (structuredArguments) {
    return {
      arguments: structuredArguments,
      name,
    };
  }

  const parameterMatches = [...content.matchAll(/<parameter\s+name="([^"]+)">([\s\S]*?)<\/parameter>/g)];

  if (parameterMatches.length === 0) {
    return {
      arguments: {},
      name,
    };
  }

  return {
    arguments: Object.fromEntries(parameterMatches.map((match) => [match[1], parseLooseValue(match[2])])),
    name,
  };
}

function getNamedParameterValue(content: string, name: string): string | undefined {
  const pattern = new RegExp(`<parameter\\s+name="${escapeRegExp(name)}">([\\s\\S]*?)<\\/parameter>`);
  const match = content.match(pattern);

  return match?.[1]?.trim();
}

function getXmlTagValue(content: string, tagName: string): string | undefined {
  const pattern = new RegExp(`<${escapeRegExp(tagName)}>([\\s\\S]*?)(?:<\\/${escapeRegExp(tagName)}>|<\\/parameter>)`);
  const match = content.match(pattern);

  return match?.[1]?.trim();
}

function parseLooseValue(value: string): unknown {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return '';
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function normalizeToolArguments(value: unknown): Record<string, unknown> | undefined {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function resolveToolDefinitions(tools: unknown): ToolPromptDefinition[] {
  if (Array.isArray(tools)) {
    return tools.flatMap((tool) => toToolPromptDefinition(tool));
  }

  if (!isRecord(tools)) {
    return [];
  }

  return Object.entries(tools).flatMap(([key, value]) => toToolPromptDefinition(value, key));
}

function sortToolDefinitions(definitions: ToolPromptDefinition[]): ToolPromptDefinition[] {
  return [...definitions].sort(
    (left, right) => compareToolPriority(left.name) - compareToolPriority(right.name) || left.name.localeCompare(right.name),
  );
}

function compareToolPriority(name: string): number {
  const priority = TOOL_PRIORITY[name];

  return priority ?? Number.MAX_SAFE_INTEGER;
}

function buildToolSelectionRules(definitions: ToolPromptDefinition[]): string[] {
  const names = new Set(definitions.map((tool) => tool.name));
  const rules: string[] = [];

  rules.push('- If the user explicitly asks for a TODO list or task checklist, use `todowrite` instead of `task`.');
  rules.push('- If the user explicitly asks to run a shell command such as `ls`, use `bash`.');
  rules.push('- If the user explicitly asks to read a local file, use `read`.');

  if (names.has('todowrite')) {
    rules.push('- `todowrite` is for creating, updating, or managing the conversation task list. Prefer it for TODO/checklist requests.');
  }

  if (names.has('task')) {
    rules.push(
      '- `task` is only for delegating complex multistep work to a subagent. Do not use `task` for TODO lists, simple reads, or basic shell commands.',
    );
  }

  if (names.has('question')) {
    rules.push('- `question` is only for necessary clarification when you are blocked and cannot safely choose a reasonable default.');
  }

  if (names.has('webfetch')) {
    rules.push('- `webfetch` is for fetching content from a URL, not for local files or shell commands.');
  }

  return rules;
}

const TOOL_PRIORITY: Record<string, number> = {
  bash: 20,
  question: 50,
  read: 10,
  task: 70,
  todowrite: 0,
  webfetch: 30,
};

function toToolPromptDefinition(value: unknown, fallbackName?: string): ToolPromptDefinition[] {
  if (!isRecord(value) || value.type !== 'function') {
    return [];
  }

  const name = typeof value.name === 'string' && value.name.length > 0 ? value.name : fallbackName;
  const inputSchema = isRecord(value.inputSchema) ? value.inputSchema : isRecord(value.parameters) ? value.parameters : undefined;

  if (!name || !inputSchema) {
    return [];
  }

  return [
    {
      description: typeof value.description === 'string' ? value.description : undefined,
      inputSchema,
      name,
    },
  ];
}

function parseCliMessage(line: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(line);

    if (!isRecord(parsed)) {
      throw new Error('Claude CLI emitted a non-object JSON message.');
    }

    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse Claude CLI JSONL output: ${message}`);
  }
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
