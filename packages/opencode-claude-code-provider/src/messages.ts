import { isRecord } from './types.js';

import type { LanguageModelV2FinishReason, LanguageModelV2StreamPart, LanguageModelV2Usage } from '@ai-sdk/provider';
import type { SDKAssistantMessage, SDKMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';

type BlockState =
  | {
      id: string;
      index: number;
      kind: 'reasoning';
    }
  | {
      id: string;
      index: number;
      kind: 'text';
    }
  | {
      id: string;
      input: Record<string, unknown>;
      index: number;
      inputText: string;
      kind: 'tool';
      toolName: string;
    };

export type StreamState = {
  blocks: Map<number, BlockState>;
  emittedToolCallIds: Set<string>;
  finishReason: LanguageModelV2FinishReason;
  pendingToolResults: Map<string, ProviderToolResultPart>;
  sessionId?: string;
  toolCallIds: Set<string>;
  toolNames: Map<string, string>;
  toolResultIds: Set<string>;
  usage: LanguageModelV2Usage;
};

type OpenCodeToolCallPart = Omit<Extract<LanguageModelV2StreamPart, { type: 'tool-call' }>, 'input'> & {
  input: Record<string, unknown>;
};

type ProviderToolResultPart = Extract<LanguageModelV2StreamPart, { type: 'tool-result' }> & {
  result: unknown;
};

const TOOL_INPUT_STRING_COMPAT = Symbol('toolInputStringCompat');
const CANONICAL_TOOL_NAME_MAP = new Map(
  Object.entries({
    ApplyPatch: 'apply_patch',
    Bash: 'bash',
    Codesearch: 'codesearch',
    Edit: 'edit',
    Glob: 'glob',
    Grep: 'grep',
    Read: 'read',
    Task: 'task',
    TodoWrite: 'todowrite',
    WebFetch: 'webfetch',
    WebSearch: 'websearch',
    Write: 'write',
  }),
);

const TOOL_INPUT_BLOCK_TYPES = new Set(['tool_use', 'server_tool_use', 'mcp_tool_use']);
const TOOL_RESULT_BLOCK_TYPES = new Set([
  'bash_code_execution_tool_result',
  'code_execution_tool_result',
  'compaction',
  'container_upload',
  'mcp_tool_result',
  'text_editor_code_execution_tool_result',
  'tool_search_tool_result',
  'web_fetch_tool_result',
  'web_search_tool_result',
]);

export function createStreamState(): StreamState {
  return {
    blocks: new Map(),
    emittedToolCallIds: new Set(),
    finishReason: 'unknown',
    pendingToolResults: new Map(),
    toolCallIds: new Set(),
    toolNames: new Map(),
    toolResultIds: new Set(),
    usage: {
      inputTokens: undefined,
      outputTokens: undefined,
      totalTokens: undefined,
    },
  };
}

export function mapSdkMessage(message: SDKMessage, state: StreamState): LanguageModelV2StreamPart[] {
  if (message.type === 'system' && message.subtype === 'init') {
    state.sessionId = message.session_id;
    return [];
  }

  if (message.type === 'stream_event') {
    return mapStreamEvent(message.event, state);
  }

  if (message.type === 'assistant') {
    return mapAssistantMessage(message, state);
  }

  if (message.type === 'user') {
    return mapToolResultMessage(message, state);
  }

  if (message.type === 'result') {
    state.finishReason = mapFinishReason(message);
    state.usage = mergeUsage(state.usage, mapUsageRecord(getRecord(message.usage)));
  }

  return [];
}

function mapAssistantMessage(message: SDKAssistantMessage, state: StreamState): LanguageModelV2StreamPart[] {
  const assistantMessage = getRecord(message.message);

  if (!assistantMessage) {
    return [];
  }

  state.usage = mergeUsage(state.usage, mapUsageRecord(getRecord(assistantMessage.usage)));

  if (!Array.isArray(assistantMessage.content)) {
    return [];
  }

  const parts: LanguageModelV2StreamPart[] = [];
  const pendingToolCallIds: string[] = [];
  let fallbackToolIndex = 0;

  for (const item of assistantMessage.content) {
    const block = getRecord(item);

    if (!block) {
      continue;
    }

    const blockType = getString(block.type);

    if (!blockType) {
      continue;
    }

    if (TOOL_INPUT_BLOCK_TYPES.has(blockType)) {
      const id = getToolLinkId(block) ?? `tool-${state.toolCallIds.size + fallbackToolIndex}`;
      fallbackToolIndex += 1;

      if (state.toolCallIds.has(id)) {
        pendingToolCallIds.push(id);
        continue;
      }

      const toolName = normalizeToolName(getString(block.name) ?? state.toolNames.get(id) ?? 'unknown');
      const input = getToolInput(block.input);
      const inputText = serializeToolInput(input, { omitEmpty: true });

      state.toolCallIds.add(id);
      state.toolNames.set(id, toolName);
      pendingToolCallIds.push(id);

      parts.push({
        id,
        providerExecuted: true,
        toolName,
        type: 'tool-input-start',
      });

      if (inputText.length > 0) {
        parts.push({ delta: inputText, id, type: 'tool-input-delta' });
      }

      parts.push({ id, type: 'tool-input-end' });
      parts.push(...createToolCallSequence({ input, providerExecuted: true, toolCallId: id, toolName }, state));

      continue;
    }

    if (TOOL_RESULT_BLOCK_TYPES.has(blockType)) {
      const toolCallId = getToolLinkId(block) ?? pendingToolCallIds.shift();

      if (!toolCallId || state.toolResultIds.has(toolCallId)) {
        continue;
      }

      state.toolResultIds.add(toolCallId);

      const toolName = normalizeToolName(state.toolNames.get(toolCallId) ?? blockType);

      const resultPart = createToolResultPart({
        ...(isAssistantToolResultError(block) ? { isError: true } : {}),
        providerExecuted: true,
        result: getAssistantToolResult(blockType, block, toolName),
        toolCallId,
        toolName,
      });

      if (!state.emittedToolCallIds.has(toolCallId) && state.toolCallIds.has(toolCallId)) {
        state.pendingToolResults.set(toolCallId, resultPart);
      } else {
        parts.push(resultPart as unknown as LanguageModelV2StreamPart);
      }
    }
  }

  return parts;
}

function mapStreamEvent(event: unknown, state: StreamState): LanguageModelV2StreamPart[] {
  if (!isRecord(event)) {
    return [];
  }

  const eventType = getString(event.type);
  const index = getNumber(event.index) ?? 0;

  if (eventType === 'content_block_start') {
    return onContentBlockStart(event, index, state);
  }

  if (eventType === 'content_block_delta') {
    return onContentBlockDelta(event, index, state);
  }

  if (eventType === 'content_block_stop') {
    return onContentBlockStop(index, state);
  }

  return [];
}

function onContentBlockStart(event: Record<string, unknown>, index: number, state: StreamState): LanguageModelV2StreamPart[] {
  const block = getRecord(event.content_block) ?? getRecord(event.block);

  if (!block) {
    return [];
  }

  const blockType = getString(block.type);

  if (blockType === 'text') {
    const id = `text-${index}`;
    state.blocks.set(index, { id, index, kind: 'text' });
    return [{ id, type: 'text-start' }];
  }

  if (blockType === 'thinking' || blockType === 'redacted_thinking') {
    const id = `reasoning-${index}`;
    state.blocks.set(index, { id, index, kind: 'reasoning' });
    return [{ id, type: 'reasoning-start' }];
  }

  if (blockType && TOOL_INPUT_BLOCK_TYPES.has(blockType)) {
    const id = getString(block.id) ?? `tool-${index}`;
    const toolName = normalizeToolName(getString(block.name) ?? 'unknown');
    const input = getToolInput(block.input);
    const initialInput = serializeToolInput(input, { omitEmpty: true });

    state.blocks.set(index, { id, index, input, inputText: '', kind: 'tool', toolName });
    state.toolCallIds.add(id);
    state.toolNames.set(id, toolName);

    const parts: LanguageModelV2StreamPart[] = [
      {
        id,
        providerExecuted: true,
        toolName,
        type: 'tool-input-start',
      },
    ];

    if (initialInput.length > 0) {
      parts.push({ delta: initialInput, id, type: 'tool-input-delta' });
    }

    return parts;
  }

  return [];
}

function onContentBlockDelta(event: Record<string, unknown>, index: number, state: StreamState): LanguageModelV2StreamPart[] {
  const block = state.blocks.get(index);
  const delta = getRecord(event.delta);

  if (!block || !delta) {
    return [];
  }

  const deltaType = getString(delta.type);

  if (block.kind === 'text' && deltaType === 'text_delta') {
    const text = getString(delta.text) ?? '';
    return text.length > 0 ? [{ delta: text, id: block.id, type: 'text-delta' }] : [];
  }

  if (block.kind === 'reasoning' && (deltaType === 'thinking_delta' || deltaType === 'text_delta')) {
    const text = getString(delta.thinking) ?? getString(delta.text) ?? '';
    return text.length > 0 ? [{ delta: text, id: block.id, type: 'reasoning-delta' }] : [];
  }

  if (block.kind === 'tool') {
    const chunk = getString(delta.partial_json) ?? getString(delta.text) ?? '';

    if (chunk.length === 0) {
      return [];
    }

    block.inputText += chunk;

    return [{ delta: chunk, id: block.id, type: 'tool-input-delta' }];
  }

  return [];
}

function onContentBlockStop(index: number, state: StreamState): LanguageModelV2StreamPart[] {
  const block = state.blocks.get(index);

  if (!block) {
    return [];
  }

  state.blocks.delete(index);

  if (block.kind === 'text') {
    return [{ id: block.id, type: 'text-end' }];
  }

  if (block.kind === 'reasoning') {
    return [{ id: block.id, type: 'reasoning-end' }];
  }

  return [
    { id: block.id, type: 'tool-input-end' },
    ...createToolCallSequence(
      {
        input: block.inputText.length > 0 ? getToolInput(block.inputText, block.input) : block.input,
        providerExecuted: true,
        toolCallId: block.id,
        toolName: block.toolName,
      },
      state,
    ),
  ];
}

function mapToolResultMessage(message: Extract<SDKMessage, { type: 'user' }>, state: StreamState): LanguageModelV2StreamPart[] {
  if (!message.parent_tool_use_id || message.tool_use_result === undefined) {
    return [];
  }

  if (state.toolResultIds.has(message.parent_tool_use_id)) {
    return [];
  }

  state.toolResultIds.add(message.parent_tool_use_id);

  const toolName = normalizeToolName(state.toolNames.get(message.parent_tool_use_id) ?? 'unknown');
  const resultPart = createToolResultPart({
    providerExecuted: true,
    result: message.tool_use_result,
    toolCallId: message.parent_tool_use_id,
    toolName,
  });

  if (!state.emittedToolCallIds.has(message.parent_tool_use_id) && state.toolCallIds.has(message.parent_tool_use_id)) {
    state.pendingToolResults.set(message.parent_tool_use_id, resultPart);
    return [];
  }

  return [resultPart as unknown as LanguageModelV2StreamPart];
}

function mapFinishReason(message: SDKResultMessage): LanguageModelV2FinishReason {
  if (message.subtype !== 'success') {
    return 'error';
  }

  if (message.stop_reason === 'tool_use') {
    return 'tool-calls';
  }

  if (message.stop_reason === 'max_tokens') {
    return 'length';
  }

  if (message.stop_reason === 'end_turn' || message.stop_reason === 'pause_turn' || message.stop_reason === 'stop_sequence') {
    return 'stop';
  }

  return 'unknown';
}

function mapUsageRecord(usage: Record<string, unknown> | undefined): LanguageModelV2Usage {
  const inputTokens = getNumber(usage?.input_tokens);
  const outputTokens = getNumber(usage?.output_tokens);

  return {
    cachedInputTokens: getNumber(usage?.cache_read_input_tokens),
    inputTokens,
    outputTokens,
    reasoningTokens: getNumber(usage?.thinking_tokens),
    totalTokens: getNumber(usage?.total_tokens) ?? sumNumbers(inputTokens, outputTokens),
  };
}

function mergeUsage(current: LanguageModelV2Usage, next: LanguageModelV2Usage): LanguageModelV2Usage {
  return {
    cachedInputTokens: next.cachedInputTokens ?? current.cachedInputTokens,
    inputTokens: next.inputTokens ?? current.inputTokens,
    outputTokens: next.outputTokens ?? current.outputTokens,
    reasoningTokens: next.reasoningTokens ?? current.reasoningTokens,
    totalTokens: next.totalTokens ?? current.totalTokens,
  };
}

function sumNumbers(...values: Array<number | undefined>): number | undefined {
  const next = values.filter((value): value is number => typeof value === 'number');

  if (next.length === 0) {
    return undefined;
  }

  return next.reduce((total, value) => total + value, 0);
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function getToolLinkId(block: Record<string, unknown>): string | undefined {
  return (
    getString(block.tool_use_id) ??
    getString(block.toolUseId) ??
    getString(block.server_tool_use_id) ??
    getString(block.serverToolUseId) ??
    getString(block.tool_call_id) ??
    getString(block.toolCallId) ??
    getString(block.id)
  );
}

function normalizeToolName(toolName: string): string {
  return CANONICAL_TOOL_NAME_MAP.get(toolName) ?? toolName;
}

function getAssistantToolResult(blockType: string, block: Record<string, unknown>, toolName: string): unknown {
  const rawResult = getAssistantToolRawResult(block);

  return {
    metadata: getAssistantToolMetadata(blockType, rawResult),
    output: getAssistantToolOutput(blockType, rawResult),
    title: toolName,
  };
}

function isAssistantToolResultError(block: Record<string, unknown>): boolean {
  if (typeof block.is_error === 'boolean') {
    return block.is_error;
  }

  return typeof block.error_code === 'string';
}

function getAssistantToolRawResult(block: Record<string, unknown>): unknown {
  if (block.content !== undefined) {
    return block.content;
  }

  if (block.result !== undefined) {
    return block.result;
  }

  if (block.error !== undefined) {
    return { error: block.error };
  }

  return block;
}

function getAssistantToolMetadata(blockType: string, rawResult: unknown): Record<string, unknown> {
  const metadata: Record<string, unknown> = { blockType };
  const record = getRecord(rawResult);
  const returnCode = getNumber(record?.return_code);
  const errorCode = getString(record?.error_code) ?? getString(getRecord(record?.error)?.code);

  if (returnCode !== undefined) {
    metadata.returnCode = returnCode;
  }

  if (errorCode) {
    metadata.errorCode = errorCode;
  }

  return metadata;
}

function getAssistantToolOutput(blockType: string, rawResult: unknown): string {
  const record = getRecord(rawResult);

  if (blockType === 'bash_code_execution_tool_result') {
    const stdout = getString(record?.stdout);
    const stderr = getString(record?.stderr);
    const returnCode = getNumber(record?.return_code);
    const errorCode = getString(record?.error_code) ?? getString(getRecord(record?.error)?.code);

    if (returnCode === 0 && stdout) {
      return stdout;
    }

    if (stderr) {
      return stderr;
    }

    if (stdout) {
      return stdout;
    }

    if (errorCode) {
      return `Tool error: ${errorCode}`;
    }
  }

  const text =
    getString(rawResult) ??
    getString(record?.text) ??
    getString(record?.output) ??
    getString(record?.stdout) ??
    getString(record?.stderr) ??
    getString(record?.message) ??
    getString(getRecord(record?.error)?.message) ??
    getString(getRecord(record?.error)?.code);

  return text ?? safeJsonStringify(rawResult);
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}

function getToolInput(value: unknown, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  if (typeof value === 'string') {
    return asToolInputRecord(parseToolInput(value) ?? fallback);
  }

  if (!isRecord(value)) {
    return asToolInputRecord(fallback);
  }

  return asToolInputRecord(parseToolInput(safeJsonStringify(value)) ?? fallback);
}

function parseToolInput(value: string): Record<string, unknown> | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function serializeToolInput(value: Record<string, unknown>, options?: { omitEmpty?: boolean }): string {
  if (options?.omitEmpty && Object.keys(value).length === 0) {
    return '';
  }

  return safeJsonStringify(value);
}

function createToolCallPart(part: Omit<OpenCodeToolCallPart, 'type'>): LanguageModelV2StreamPart {
  return {
    ...part,
    type: 'tool-call',
  } as unknown as LanguageModelV2StreamPart;
}

function createToolCallSequence(part: Omit<OpenCodeToolCallPart, 'type'>, state: StreamState): LanguageModelV2StreamPart[] {
  state.emittedToolCallIds.add(part.toolCallId);

  const parts: LanguageModelV2StreamPart[] = [createToolCallPart(part)];
  const pendingResult = state.pendingToolResults.get(part.toolCallId);

  if (pendingResult) {
    state.pendingToolResults.delete(part.toolCallId);
    parts.push(pendingResult as unknown as LanguageModelV2StreamPart);
  }

  return parts;
}

function createToolResultPart(part: Omit<ProviderToolResultPart, 'type'>): ProviderToolResultPart {
  return {
    ...part,
    type: 'tool-result',
  };
}

function asToolInputRecord(value: Record<string, unknown>): Record<string, unknown> {
  const candidate = value as Record<string | symbol, unknown>;

  if (candidate[TOOL_INPUT_STRING_COMPAT] === true) {
    return value;
  }

  const serialize = () => safeJsonStringify(value);
  const toolInput = value as Record<string, unknown> & {
    [TOOL_INPUT_STRING_COMPAT]?: true;
    toString?: () => string;
    trim?: () => string;
    valueOf?: () => string;
    [Symbol.toPrimitive]?: () => string;
  };

  Object.defineProperties(toolInput, {
    [Symbol.toPrimitive]: {
      configurable: true,
      enumerable: false,
      value: () => serialize(),
      writable: false,
    },
    [TOOL_INPUT_STRING_COMPAT]: {
      configurable: true,
      enumerable: false,
      value: true,
      writable: false,
    },
    toString: {
      configurable: true,
      enumerable: false,
      value: () => serialize(),
      writable: false,
    },
    trim: {
      configurable: true,
      enumerable: false,
      value: () => serialize().trim(),
      writable: false,
    },
    valueOf: {
      configurable: true,
      enumerable: false,
      value: () => serialize(),
      writable: false,
    },
  });

  return toolInput;
}
