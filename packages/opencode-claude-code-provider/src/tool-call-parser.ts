import { deepParseStringifiedJsonValues, normalizeToolArguments } from './tool-argument-normalizer.js';
import { isRecord } from './types.js';

import type { StreamState } from './messages.js';
import type { LanguageModelV3StreamPart } from '@ai-sdk/provider';

type ParserMode = 'buffering' | 'idle';

export type ToolCallTextState = {
  buffers: Map<string, string>;
  emittedTextStart: Set<string>;
  insideCodeFence: boolean;
  mode: ParserMode;
  trailingBackticks: number;
};

export function createToolCallTextState(): ToolCallTextState {
  return {
    buffers: new Map(),
    emittedTextStart: new Set(),
    insideCodeFence: false,
    mode: 'idle',
    trailingBackticks: 0,
  };
}

const TAG_OPENER = '<tool_call';
const OPEN_TAG = TAG_OPENER + '>';
const CLOSE_TAG = '</' + TAG_OPENER.slice(1) + '>';
const MAX_PARTIAL_TAG_LENGTH = TAG_OPENER.length;

export function processTextBuffer(
  part: LanguageModelV3StreamPart,
  streamState: StreamState,
  textState: ToolCallTextState,
): LanguageModelV3StreamPart[] {
  if (part.type === 'text-start') {
    textState.buffers.set(part.id, '');
    return [];
  }

  if (part.type === 'text-delta') {
    return textState.mode === 'buffering' ? handleBufferingDelta(part, streamState, textState) : handleIdleDelta(part, textState);
  }

  if (part.type === 'text-end') {
    return handleTextEnd(part, streamState, textState);
  }

  if (part.type === 'tool-call') {
    return [normalizeToolCallPart(part)];
  }

  return [part];
}

function handleIdleDelta(
  part: Extract<LanguageModelV3StreamPart, { type: 'text-delta' }>,
  textState: ToolCallTextState,
): LanguageModelV3StreamPart[] {
  const current = textState.buffers.get(part.id) ?? '';
  const combined = current + part.delta;
  const tagIndex = findTagOpenerIndex(combined);

  if (tagIndex >= 0 && isEligibleToolCallPrefix(combined.slice(0, tagIndex))) {
    if (wouldBeInsideCodeFence(combined.slice(0, tagIndex), textState)) {
      textState.buffers.set(part.id, '');
      return createTextDeltaParts(part.id, combined, textState);
    }

    textState.mode = 'buffering';
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

function handleBufferingDelta(
  part: Extract<LanguageModelV3StreamPart, { type: 'text-delta' }>,
  streamState: StreamState,
  textState: ToolCallTextState,
): LanguageModelV3StreamPart[] {
  const current = textState.buffers.get(part.id) ?? '';
  const combined = current + part.delta;
  const closeEnd = findLastClosingTagEnd(combined);

  if (closeEnd >= 0) {
    const afterClose = combined.slice(closeEnd);

    if (afterClose.trim().length > 0 && findTagOpenerIndex(afterClose) < 0 && findPartialTagSuffix(afterClose) === 0) {
      const toolCallText = combined.slice(0, closeEnd);
      const toolCallResult = consumeTextBuffer(toolCallText, streamState);

      if (toolCallResult.hasToolCalls) {
        textState.mode = 'idle';
        textState.buffers.delete(part.id);
        textState.emittedTextStart.delete(part.id);
        return toolCallResult.parts;
      }
    }
  }

  textState.buffers.set(part.id, combined);
  return [];
}

function handleTextEnd(
  part: Extract<LanguageModelV3StreamPart, { type: 'text-end' }>,
  streamState: StreamState,
  textState: ToolCallTextState,
): LanguageModelV3StreamPart[] {
  const current = textState.buffers.get(part.id) ?? '';
  textState.buffers.delete(part.id);
  const hadTextStart = textState.emittedTextStart.has(part.id);
  textState.emittedTextStart.delete(part.id);
  const wasBuffering = textState.mode === 'buffering';
  textState.mode = 'idle';

  if (wasBuffering) {
    const toolCallResult = consumeTextBuffer(current, streamState);

    if (toolCallResult.hasToolCalls) {
      return toolCallResult.parts;
    }
  }

  return flushRemainingBuffer(part.id, current, hadTextStart, textState);
}

function flushRemainingBuffer(
  partId: string,
  buffer: string,
  hadTextStart: boolean,
  textState: ToolCallTextState,
): LanguageModelV3StreamPart[] {
  if (buffer.length === 0) {
    return hadTextStart ? [{ id: partId, type: 'text-end' }] : [];
  }

  updateCodeFenceState(buffer, textState);

  const result: LanguageModelV3StreamPart[] = [];

  if (!hadTextStart) {
    result.push({ id: partId, type: 'text-start' });
  }

  result.push({ delta: buffer, id: partId, type: 'text-delta' });
  result.push({ id: partId, type: 'text-end' });
  return result;
}

function normalizeToolCallPart(
  part: Extract<LanguageModelV3StreamPart, { type: 'tool-call' }>,
): Extract<LanguageModelV3StreamPart, { type: 'tool-call' }> {
  const normalized = normalizeToolArguments(part.input);

  if (!normalized) {
    return part;
  }

  const input = safeJsonStringify(normalized);

  return input !== part.input ? { ...part, input } : part;
}

function createTextDeltaParts(partId: string, text: string, textState: ToolCallTextState): LanguageModelV3StreamPart[] {
  if (text.length === 0) {
    return [];
  }

  updateCodeFenceState(text, textState);

  const result: LanguageModelV3StreamPart[] = [];

  if (!textState.emittedTextStart.has(partId)) {
    textState.emittedTextStart.add(partId);
    result.push({ id: partId, type: 'text-start' });
  }

  result.push({ delta: text, id: partId, type: 'text-delta' });
  return result;
}

function updateCodeFenceState(text: string, state: ToolCallTextState): void {
  let backticks = state.trailingBackticks;

  for (const character of text) {
    if (character === '`') {
      backticks += 1;
    } else {
      if (backticks >= 3) {
        state.insideCodeFence = !state.insideCodeFence;
      }

      backticks = 0;
    }
  }

  state.trailingBackticks = backticks;
}

function wouldBeInsideCodeFence(text: string, state: ToolCallTextState): boolean {
  let backticks = state.trailingBackticks;
  let inside = state.insideCodeFence;

  for (const character of text) {
    if (character === '`') {
      backticks += 1;
    } else {
      if (backticks >= 3) {
        inside = !inside;
      }

      backticks = 0;
    }
  }

  if (backticks >= 3) {
    inside = !inside;
  }

  return inside;
}

function findTagOpenerIndex(text: string): number {
  return text.indexOf(TAG_OPENER);
}

function findPartialTagSuffix(text: string): number {
  const tailLength = Math.min(text.length, MAX_PARTIAL_TAG_LENGTH);

  for (let length = tailLength; length >= 1; length--) {
    const suffix = text.slice(text.length - length);

    if (TAG_OPENER.startsWith(suffix)) {
      return length;
    }
  }

  return 0;
}

function findLastClosingTagEnd(text: string): number {
  const index = text.lastIndexOf(CLOSE_TAG);

  return index >= 0 ? index + CLOSE_TAG.length : -1;
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
  parts: LanguageModelV3StreamPart[];
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

function extractToolCallParts(text: string, streamState: StreamState): LanguageModelV3StreamPart[] {
  const matches = collectAllToolCallMatches(text);

  if (matches.length === 0) {
    return [];
  }

  const firstMatch = matches[0];
  const leadingText = text.slice(0, firstMatch.index);
  const hasLeadingContext = leadingText.trim().length > 0;

  if (hasLeadingContext && !leadingText.includes('\n')) {
    return [];
  }

  return matches.flatMap((match) => createToolCallSequenceFromPayload(match.payload, streamState));
}

function collectAllToolCallMatches(
  text: string,
): Array<{ end: number; index: number; payload: { arguments: Record<string, unknown>; name: string } }> {
  const matches: Array<{ end: number; index: number; payload: { arguments: Record<string, unknown>; name: string } }> = [];
  let searchFrom = 0;

  while (searchFrom < text.length) {
    const tagStart = text.indexOf(OPEN_TAG, searchFrom);

    if (tagStart < 0) {
      break;
    }

    const contentStart = tagStart + OPEN_TAG.length;
    const jsonEnd = findJsonObjectEnd(text, contentStart);

    if (jsonEnd < 0) {
      searchFrom = contentStart;
      continue;
    }

    const jsonContent = text.slice(contentStart, jsonEnd).trim();
    const closeIndex = text.indexOf(CLOSE_TAG, jsonEnd);

    if (closeIndex < 0 || text.slice(jsonEnd, closeIndex).trim().length > 0) {
      searchFrom = contentStart;
      continue;
    }

    const matchEnd = closeIndex + CLOSE_TAG.length;
    const payload = parseToolCallPayload(jsonContent);

    if (payload) {
      matches.push({ end: matchEnd, index: tagStart, payload });
    }

    searchFrom = matchEnd;
  }

  return matches;
}

function findJsonObjectEnd(text: string, from: number): number {
  let position = from;

  while (position < text.length && /\s/u.test(text[position])) {
    position += 1;
  }

  if (position >= text.length || text[position] !== '{') {
    return -1;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = position; index < text.length; index += 1) {
    const character = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;

      if (depth === 0) {
        return index + 1;
      }
    }
  }

  return -1;
}

function createToolCallSequenceFromPayload(
  payload: { arguments: Record<string, unknown>; name: string } | undefined,
  streamState: StreamState,
): LanguageModelV3StreamPart[] {
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

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}
