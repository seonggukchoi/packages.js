import { isRecord } from './types.js';

import type { StreamState } from './messages.js';
import type { LanguageModelV2StreamPart } from '@ai-sdk/provider';

export type ToolCallTextState = {
  buffers: Map<string, string>;
  emittedTextStart: Set<string>;
  foundToolCall: boolean;
};

export function createToolCallTextState(): ToolCallTextState {
  return {
    buffers: new Map(),
    emittedTextStart: new Set(),
    foundToolCall: false,
  };
}

const TAG_OPENERS = ['<tool_call', '<tool_use', '<function_call'] as const;
const MAX_PARTIAL_TAG_LENGTH = '<function_call'.length;

export function processTextBuffer(
  part: LanguageModelV2StreamPart,
  streamState: StreamState,
  textState: ToolCallTextState,
): LanguageModelV2StreamPart[] {
  if (part.type === 'text-start') {
    textState.buffers.set(part.id, '');
    return [];
  }

  if (part.type === 'text-delta') {
    if (textState.foundToolCall) {
      const current = textState.buffers.get(part.id) ?? '';
      textState.buffers.set(part.id, current + part.delta);
      return [];
    }

    const current = textState.buffers.get(part.id) ?? '';
    const combined = current + part.delta;
    const tagIndex = findTagOpenerIndex(combined);

    if (tagIndex >= 0 && isEligibleToolCallPrefix(combined.slice(0, tagIndex))) {
      textState.foundToolCall = true;
      textState.buffers.set(part.id, combined.slice(tagIndex));

      const safeText = combined.slice(0, tagIndex);
      const result = createTextDeltaParts(part.id, safeText, textState);

      if (textState.emittedTextStart.has(part.id)) {
        textState.emittedTextStart.delete(part.id);
        result.push({ id: part.id, type: 'text-end' });
      }

      return result;
    }

    const partialSuffix = findPartialTagSuffix(combined);

    if (partialSuffix > 0 && isEligibleToolCallPrefix(combined.slice(0, combined.length - partialSuffix))) {
      const safeText = combined.slice(0, combined.length - partialSuffix);
      textState.buffers.set(part.id, combined.slice(combined.length - partialSuffix));
      return createTextDeltaParts(part.id, safeText, textState);
    }

    textState.buffers.set(part.id, '');
    return createTextDeltaParts(part.id, combined, textState);
  }

  if (part.type === 'text-end') {
    const current = textState.buffers.get(part.id) ?? '';
    textState.buffers.delete(part.id);
    const hadTextStart = textState.emittedTextStart.has(part.id);
    textState.emittedTextStart.delete(part.id);

    if (textState.foundToolCall) {
      textState.foundToolCall = false;

      const toolCallResult = consumeTextBuffer(current, streamState);

      if (toolCallResult.hasToolCalls) {
        return toolCallResult.parts;
      }

      if (current.length === 0) {
        return hadTextStart ? [{ id: part.id, type: 'text-end' }] : [];
      }

      const result: LanguageModelV2StreamPart[] = [];

      if (!hadTextStart) {
        result.push({ id: part.id, type: 'text-start' });
      }

      result.push({ delta: current, id: part.id, type: 'text-delta' });
      result.push({ id: part.id, type: 'text-end' });
      return result;
    }

    textState.foundToolCall = false;

    if (current.length > 0) {
      const result: LanguageModelV2StreamPart[] = [];

      if (!hadTextStart) {
        result.push({ id: part.id, type: 'text-start' });
      }

      result.push({ delta: current, id: part.id, type: 'text-delta' });
      result.push({ id: part.id, type: 'text-end' });
      return result;
    }

    return hadTextStart ? [{ id: part.id, type: 'text-end' }] : [];
  }

  if (part.type === 'tool-call') {
    return [normalizeToolCallPart(part)];
  }

  return [part];
}

function normalizeToolCallPart(
  part: Extract<LanguageModelV2StreamPart, { type: 'tool-call' }>,
): Extract<LanguageModelV2StreamPart, { type: 'tool-call' }> {
  const normalized = normalizeToolArguments(part.input);

  if (!normalized) {
    return part;
  }

  const input = safeJsonStringify(normalized);

  return input !== part.input ? { ...part, input } : part;
}

function createTextDeltaParts(partId: string, text: string, textState: ToolCallTextState): LanguageModelV2StreamPart[] {
  if (text.length === 0) {
    return [];
  }

  const result: LanguageModelV2StreamPart[] = [];

  if (!textState.emittedTextStart.has(partId)) {
    textState.emittedTextStart.add(partId);
    result.push({ id: partId, type: 'text-start' });
  }

  result.push({ delta: text, id: partId, type: 'text-delta' });
  return result;
}

function findTagOpenerIndex(text: string): number {
  let earliest = -1;

  for (const tag of TAG_OPENERS) {
    const index = text.indexOf(tag);

    if (index >= 0 && (earliest < 0 || index < earliest)) {
      earliest = index;
    }
  }

  return earliest;
}

function findPartialTagSuffix(text: string): number {
  const tailLength = Math.min(text.length, MAX_PARTIAL_TAG_LENGTH);

  for (let length = tailLength; length >= 1; length--) {
    const suffix = text.slice(text.length - length);

    for (const tag of TAG_OPENERS) {
      if (tag.startsWith(suffix)) {
        return length;
      }
    }
  }

  return 0;
}

function isEligibleToolCallPrefix(prefix: string): boolean {
  if (prefix.trim().length === 0) {
    return true;
  }

  return prefix.replace(/[\t ]+$/u, '').endsWith('\n');
}

function consumeTextBuffer(
  buffer: string,
  streamState: StreamState,
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
      arguments: deepParseStringifiedJsonValues(Object.fromEntries(restEntries)),
      name: parsed.name,
    };
  } catch {
    return undefined;
  }
}

function extractToolCallParts(text: string, streamState: StreamState): LanguageModelV2StreamPart[] {
  const matches = collectAllToolCallMatches(text);

  if (matches.length === 0) {
    return [];
  }

  const firstMatch = matches[0];
  const leadingText = text.slice(0, firstMatch.index);
  const lastMatch = matches[matches.length - 1] as (typeof matches)[number];
  const trailingText = text.slice(lastMatch.end);
  const hasLeadingContext = leadingText.trim().length > 0;

  if (trailingText.trim().length > 0) {
    return [];
  }

  if (hasLeadingContext && !leadingText.includes('\n')) {
    return [];
  }

  return matches.flatMap((match) => createToolCallSequenceFromPayload(match.payload, streamState));
}

function collectAllToolCallMatches(
  text: string,
): Array<{ end: number; index: number; payload: { arguments: Record<string, unknown>; name: string } }> {
  return [
    ...collectToolCallMatches(text, /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g, (content) => parseToolCallPayload(content)),
    ...collectToolCallMatches(text, /<tool_use>\s*([\s\S]*?)\s*<\/tool_use>/g, (content) => parseToolUsePayload(content)),
    ...collectToolCallMatches(text, /<function_call>\s*([\s\S]*?)(?:<\/function_call>|<\/function_calls>|<\/invoke>)/g, (content) =>
      parseFunctionCallPayload(content),
    ),
  ].sort((left, right) => left.index - right.index);
}

function collectToolCallMatches(
  text: string,
  pattern: RegExp,
  parse: (content: string) => { arguments: Record<string, unknown>; name: string } | undefined,
): Array<{ end: number; index: number; payload: { arguments: Record<string, unknown>; name: string } }> {
  const matches: Array<{ end: number; index: number; payload: { arguments: Record<string, unknown>; name: string } }> = [];

  for (const match of text.matchAll(pattern)) {
    const content = match[1];
    const index = /* v8 ignore next */ match.index ?? 0;
    const fullMatch = match[0];
    const payload = parse(content);

    if (payload) {
      matches.push({ end: index + fullMatch.length, index, payload });
    }
  }

  return matches;
}

function createToolCallSequenceFromPayload(
  payload: { arguments: Record<string, unknown>; name: string } | undefined,
  streamState: StreamState,
): LanguageModelV2StreamPart[] {
  /* v8 ignore start */
  if (!payload) {
    return [];
  }
  /* v8 ignore stop */

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

function normalizeToolArguments(value: unknown): Record<string, unknown> | undefined {
  if (isRecord(value)) {
    return deepParseStringifiedJsonValues(value);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? deepParseStringifiedJsonValues(parsed) : undefined;
  } catch {
    return undefined;
  }
}

function deepParseStringifiedJsonValues(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string') {
      const coerced = coerceStringValue(value);

      if (coerced !== undefined) {
        result[key] = coerced;
        continue;
      }
    }

    result[key] = value;
  }

  return result;
}

function coerceStringValue(value: string): unknown {
  const trimmed = value.trim();

  if (trimmed === 'true') {
    return true;
  }

  if (trimmed === 'false') {
    return false;
  }

  if (trimmed === 'null') {
    return null;
  }

  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return undefined;
    }
  }

  if (/^-?\d+(\.\d+)?$/u.test(trimmed) && trimmed.length <= 20) {
    return Number(trimmed);
  }

  return undefined;
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
