import { isRecord } from './types.js';

export function normalizeToolArguments(value: unknown): Record<string, unknown> | undefined {
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

export function deepParseStringifiedJsonValues(record: Record<string, unknown>): Record<string, unknown> {
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

export function coerceStringValue(value: string): unknown {
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
