import { isRecord } from './types.js';

import type { LanguageModelV2FinishReason, LanguageModelV2StreamPart, LanguageModelV2Usage } from '@ai-sdk/provider';
import type { SDKMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';

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
      index: number;
      inputText: string;
      kind: 'tool';
      toolName: string;
    };

export type StreamState = {
  blocks: Map<number, BlockState>;
  finishReason: LanguageModelV2FinishReason;
  sessionId?: string;
  toolNames: Map<string, string>;
  usage: LanguageModelV2Usage;
};

export function createStreamState(): StreamState {
  return {
    blocks: new Map(),
    finishReason: 'unknown',
    toolNames: new Map(),
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

  if (message.type === 'user') {
    return mapToolResultMessage(message, state);
  }

  if (message.type === 'result') {
    state.finishReason = mapFinishReason(message);
    state.usage = mapUsage(message);
  }

  return [];
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

  if (blockType === 'tool_use') {
    const id = getString(block.id) ?? `tool-${index}`;
    const toolName = getString(block.name) ?? 'unknown';
    const initialInput = block.input === undefined ? '' : safeJsonStringify(block.input);

    state.blocks.set(index, { id, index, inputText: initialInput, kind: 'tool', toolName });
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
    const text = getString(delta.text) ?? '';
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
    {
      input: block.inputText || '{}',
      providerExecuted: true,
      toolCallId: block.id,
      toolName: block.toolName,
      type: 'tool-call',
    },
  ];
}

function mapToolResultMessage(message: Extract<SDKMessage, { type: 'user' }>, state: StreamState): LanguageModelV2StreamPart[] {
  if (!message.parent_tool_use_id || message.tool_use_result === undefined) {
    return [];
  }

  const toolName = state.toolNames.get(message.parent_tool_use_id) ?? 'unknown';

  return [
    {
      providerExecuted: true,
      result: message.tool_use_result,
      toolCallId: message.parent_tool_use_id,
      toolName,
      type: 'tool-result',
    },
  ];
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

  if (message.stop_reason === 'end_turn' || message.stop_reason === 'stop_sequence') {
    return 'stop';
  }

  return 'unknown';
}

function mapUsage(message: SDKResultMessage): LanguageModelV2Usage {
  const usage = message.usage as Record<string, unknown>;
  const inputTokens = getNumber(usage.input_tokens);
  const outputTokens = getNumber(usage.output_tokens);

  return {
    cachedInputTokens: getNumber(usage.cache_read_input_tokens),
    inputTokens,
    outputTokens,
    reasoningTokens: getNumber(usage.thinking_tokens),
    totalTokens: getNumber(usage.total_tokens) ?? sumNumbers(inputTokens, outputTokens),
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

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}
