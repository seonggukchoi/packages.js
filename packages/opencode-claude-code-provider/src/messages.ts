import { isRecord } from './types.js';

import type { LanguageModelV2FinishReason, LanguageModelV2StreamPart, LanguageModelV2Usage } from '@ai-sdk/provider';

type StreamUsage = LanguageModelV2Usage & {
  cacheCreationInputTokens?: number;
};

type BlockState =
  | {
      id: string;
      kind: 'reasoning';
    }
  | {
      id: string;
      kind: 'text';
    }
  | {
      id: string;
      input: string;
      kind: 'tool';
      name: string;
    };

export type CliMessage = Record<string, unknown>;

export type StreamState = {
  blocks: Map<number, BlockState>;
  finishReason: LanguageModelV2FinishReason;
  sessionId?: string;
  stopReason?: string;
  toolCallCounter: number;
  usage: StreamUsage;
};

export function createStreamState(): StreamState {
  return {
    blocks: new Map(),
    finishReason: 'unknown',
    toolCallCounter: 0,
    usage: {
      cacheCreationInputTokens: undefined,
      inputTokens: undefined,
      outputTokens: undefined,
      totalTokens: undefined,
    },
  };
}

export function toLanguageModelUsage(usage: StreamUsage): LanguageModelV2Usage {
  return {
    cachedInputTokens: usage.cachedInputTokens,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    reasoningTokens: usage.reasoningTokens,
    totalTokens: usage.totalTokens,
  };
}

export function mapCliMessage(message: CliMessage, state: StreamState): LanguageModelV2StreamPart[] {
  captureSessionId(message, state);

  const messageType = getString(message.type);

  if (messageType === 'system') {
    return [];
  }

  if (messageType === 'stream_event') {
    return mapStreamEvent(getRecord(message.event), state);
  }

  if (messageType === 'assistant') {
    const assistantMessage = getRecord(message.message);
    state.usage = mergeUsage(state.usage, mapUsageRecord(getRecord(assistantMessage?.usage)));
    return mapAssistantToolUse(assistantMessage, state);
  }

  if (messageType === 'result') {
    const resultStopReason = getString(message.stop_reason);

    if (resultStopReason) {
      state.stopReason = resultStopReason;
    }

    state.finishReason = mapFinishReason(message, state.stopReason, state.toolCallCounter > 0);
    state.usage = mergeUsage(state.usage, mapUsageRecord(getRecord(message.usage)));
    return [];
  }

  return [];
}

function mapStreamEvent(event: Record<string, unknown> | undefined, state: StreamState): LanguageModelV2StreamPart[] {
  if (!event) {
    return [];
  }

  const eventType = getString(event.type);
  const index = getNumber(event.index) ?? 0;

  if (eventType === 'message_start') {
    const message = getRecord(event.message);
    state.usage = mergeUsage(state.usage, mapUsageRecord(getRecord(message?.usage)));
    return [];
  }

  if (eventType === 'content_block_start') {
    return onContentBlockStart(event, index, state);
  }

  if (eventType === 'content_block_delta') {
    return onContentBlockDelta(event, index, state);
  }

  if (eventType === 'content_block_stop') {
    return onContentBlockStop(index, state);
  }

  if (eventType === 'message_delta') {
    const delta = getRecord(event.delta);
    const stopReason = getString(delta?.stop_reason);

    if (stopReason) {
      state.stopReason = stopReason;
    }

    state.usage = mergeUsage(state.usage, mapUsageRecord(getRecord(event.usage)));
    return [];
  }

  return [];
}

function onContentBlockStart(event: Record<string, unknown>, index: number, state: StreamState): LanguageModelV2StreamPart[] {
  const block = getRecord(event.content_block) ?? getRecord(event.block);
  const blockType = getString(block?.type);

  if (blockType === 'text') {
    const id = `text-${index}`;
    state.blocks.set(index, { id, kind: 'text' });
    return [{ id, type: 'text-start' }];
  }

  if (blockType === 'thinking' || blockType === 'redacted_thinking') {
    const id = `reasoning-${index}`;
    state.blocks.set(index, { id, kind: 'reasoning' });
    return [{ id, type: 'reasoning-start' }];
  }

  if (blockType === 'tool_use') {
    const name = getString(block?.name);

    if (!name) {
      return [];
    }

    state.toolCallCounter += 1;
    const id = `tool-call-${state.toolCallCounter}`;
    state.blocks.set(index, { id, input: '', kind: 'tool', name });
    return [{ id, toolName: name, type: 'tool-input-start' }];
  }

  return [];
}

function onContentBlockDelta(event: Record<string, unknown>, index: number, state: StreamState): LanguageModelV2StreamPart[] {
  const block = state.blocks.get(index);
  const delta = getRecord(event.delta);
  const deltaType = getString(delta?.type);

  if (!block || !delta || !deltaType) {
    return [];
  }

  if (block.kind === 'text' && deltaType === 'text_delta') {
    const text = getString(delta.text) ?? '';
    return text.length > 0 ? [{ delta: text, id: block.id, type: 'text-delta' }] : [];
  }

  if (block.kind === 'reasoning' && (deltaType === 'thinking_delta' || deltaType === 'text_delta')) {
    const text = getString(delta.thinking) ?? getString(delta.text) ?? '';
    return text.length > 0 ? [{ delta: text, id: block.id, type: 'reasoning-delta' }] : [];
  }

  if (block.kind === 'tool' && deltaType === 'input_json_delta') {
    const text = getString(delta.partial_json) ?? '';
    block.input += text;
    return text.length > 0 ? [{ delta: text, id: block.id, type: 'tool-input-delta' }] : [];
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

  if (block.kind === 'tool') {
    return [
      { id: block.id, type: 'tool-input-end' },
      {
        input: block.input.length > 0 ? block.input : '{}',
        toolCallId: block.id,
        toolName: block.name,
        type: 'tool-call',
      },
    ];
  }

  return [{ id: block.id, type: 'reasoning-end' }];
}

function mapAssistantToolUse(message: Record<string, unknown> | undefined, state: StreamState): LanguageModelV2StreamPart[] {
  const content = Array.isArray(message?.content) ? message.content : [];
  const toolUse = content.find((part) => isRecord(part) && part.type === 'tool_use');

  if (!isRecord(toolUse) || typeof toolUse.name !== 'string' || toolUse.name.length === 0) {
    return [];
  }

  const input = isRecord(toolUse.input) ? safeJsonStringify(toolUse.input) : '{}';
  const existing = [...state.blocks.values()].find((block) => block.kind === 'tool' && block.name === toolUse.name);

  if (existing && existing.kind === 'tool') {
    existing.input = input;
    return [];
  }

  state.toolCallCounter += 1;
  const toolCallId = `tool-call-${state.toolCallCounter}`;

  return [
    { id: toolCallId, toolName: toolUse.name, type: 'tool-input-start' },
    { delta: input, id: toolCallId, type: 'tool-input-delta' },
    { id: toolCallId, type: 'tool-input-end' },
    {
      input,
      toolCallId,
      toolName: toolUse.name,
      type: 'tool-call',
    },
  ];
}

function mapFinishReason(
  message: Record<string, unknown>,
  fallbackStopReason: string | undefined,
  hasToolCalls: boolean,
): LanguageModelV2FinishReason {
  if (message.subtype !== 'success' || message.is_error === true) {
    return 'error';
  }

  const stopReason = getString(message.stop_reason) ?? fallbackStopReason;

  if (stopReason === 'max_tokens') {
    return 'length';
  }

  if (stopReason === 'tool_use' || hasToolCalls) {
    return 'tool-calls';
  }

  if (stopReason === 'end_turn' || stopReason === 'pause_turn' || stopReason === 'stop_sequence') {
    return 'stop';
  }

  if (stopReason) {
    return 'other';
  }

  return 'unknown';
}

function mapUsageRecord(usage: Record<string, unknown> | undefined): StreamUsage {
  const inputTokens = getNumber(usage?.input_tokens);
  const outputTokens = getNumber(usage?.output_tokens);

  return {
    cachedInputTokens: getNumber(usage?.cache_read_input_tokens),
    cacheCreationInputTokens: getNumber(usage?.cache_creation_input_tokens),
    inputTokens,
    outputTokens,
    reasoningTokens: getNumber(usage?.thinking_tokens),
    totalTokens: getNumber(usage?.total_tokens),
  };
}

function mergeUsage(current: StreamUsage, next: StreamUsage): StreamUsage {
  const cachedInputTokens = next.cachedInputTokens ?? current.cachedInputTokens;
  const cacheCreationInputTokens = next.cacheCreationInputTokens ?? current.cacheCreationInputTokens;
  const inputTokens = next.inputTokens ?? current.inputTokens;
  const outputTokens = next.outputTokens ?? current.outputTokens;

  return {
    cachedInputTokens,
    cacheCreationInputTokens,
    inputTokens,
    outputTokens,
    reasoningTokens: next.reasoningTokens ?? current.reasoningTokens,
    totalTokens:
      sumNumbers(inputTokens, outputTokens, cachedInputTokens, cacheCreationInputTokens) ?? next.totalTokens ?? current.totalTokens,
  };
}

function captureSessionId(message: Record<string, unknown>, state: StreamState): void {
  if (state.sessionId) {
    return;
  }

  const sessionId = getString(message.session_id);

  if (sessionId) {
    state.sessionId = sessionId;
  }
}

function sumNumbers(...values: Array<number | undefined>): number | undefined {
  const next = values.filter((value): value is number => typeof value === 'number');

  if (next.length === 0) {
    return undefined;
  }

  return next.reduce((total, value) => total + value, 0);
}

function safeJsonStringify(value: Record<string, unknown>): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
