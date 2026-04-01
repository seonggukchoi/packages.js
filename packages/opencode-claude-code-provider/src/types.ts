import { createHash } from 'node:crypto';

import type { LanguageModelV2FunctionTool, LanguageModelV2Prompt } from '@ai-sdk/provider';

export const DEFAULT_MAX_TURNS = 1;
export const DEFAULT_EXECUTABLE_PATH = 'claude';

export type ClaudeCodeEffort = 'low' | 'medium' | 'high' | 'max';

export type ProviderMetadataValue = {
  cacheCreationInputTokens?: number;
  costUsd?: number;
  modelId?: string;
  sessionId?: string;
};

export type ToolExecuteContext = {
  abortSignal?: AbortSignal;
  messages: LanguageModelV2Prompt;
  toolCallId: string;
};

export type OpenCodeToolLike = LanguageModelV2FunctionTool & {
  execute?: (args: unknown, context: ToolExecuteContext) => Promise<unknown>;
};

export type ClaudeCodeProviderOptions = {
  effort?: ClaudeCodeEffort;
  env?: Record<string, string>;
  logFile?: string;
  pathToClaudeCodeExecutable?: string;
  sessionId?: string;
};

export type NormalizedClaudeCodeOptions = {
  effort?: ClaudeCodeEffort;
  env: Record<string, string>;
  logFile?: string;
  pathToClaudeCodeExecutable: string;
  sessionId?: string;
};

export function normalizeProviderOptions(
  rawOptions: Record<string, unknown> | undefined,
  defaults: ClaudeCodeProviderOptions,
): NormalizedClaudeCodeOptions {
  const raw = rawOptions ?? {};
  const rawEnv = getStringRecord(raw.env);

  return {
    effort: getEffort(raw.effort) ?? defaults.effort,
    env: {
      ...getProcessEnv(),
      ...(defaults.env ?? {}),
      ...(rawEnv ?? {}),
    },
    logFile: getString(raw.logFile) ?? defaults.logFile,
    pathToClaudeCodeExecutable: getString(raw.pathToClaudeCodeExecutable) ?? defaults.pathToClaudeCodeExecutable ?? DEFAULT_EXECUTABLE_PATH,
    sessionId: getSessionId(raw.sessionId) ?? defaults.sessionId,
  };
}

export function getString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return undefined;
}

export function getBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  return undefined;
}

export function getNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return undefined;
}

export function getStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const next = value.filter((item): item is string => typeof item === 'string' && item.length > 0);

  return next.length > 0 ? next : [];
}

export function getRecord<T>(value: unknown): Record<string, T> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return value as Record<string, T>;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((item) => typeof item === 'string');
}

function getStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isStringRecord(value)) {
    return undefined;
  }

  return value;
}

const UUID_PATTERN = /^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

// RFC 4122 UUID v5 namespace for this provider
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function toSessionUuid(value: string): string {
  if (UUID_PATTERN.test(value)) {
    return value;
  }

  const namespaceBytes = Buffer.from(NAMESPACE.replaceAll('-', ''), 'hex');
  const hash = createHash('sha1').update(namespaceBytes).update(value).digest();

  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = hash.subarray(0, 16).toString('hex');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function getSessionId(value: unknown): string | undefined {
  const raw = getString(value);

  if (!raw) {
    return undefined;
  }

  return toSessionUuid(raw);
}

function getEffort(value: unknown): ClaudeCodeEffort | undefined {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'max') {
    return value;
  }

  return undefined;
}

function getProcessEnv(): Record<string, string> {
  return Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}
