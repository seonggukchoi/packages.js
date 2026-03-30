import type { LanguageModelV2FunctionTool, LanguageModelV2Prompt } from '@ai-sdk/provider';

export const DEFAULT_MAX_TURNS = 1;
export const DEFAULT_EXECUTABLE_PATH = 'claude';

export type ProviderMetadataValue = {
  cacheCreationInputTokens?: number;
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
  env?: Record<string, string>;
  pathToClaudeCodeExecutable?: string;
};

export type NormalizedClaudeCodeOptions = {
  env: Record<string, string>;
  pathToClaudeCodeExecutable: string;
};

export function normalizeProviderOptions(
  rawOptions: Record<string, unknown> | undefined,
  defaults: ClaudeCodeProviderOptions,
): NormalizedClaudeCodeOptions {
  const raw = rawOptions ?? {};
  const rawEnv = getStringRecord(raw.env);

  return {
    env: {
      ...getProcessEnv(),
      ...(defaults.env ?? {}),
      ...(rawEnv ?? {}),
    },
    pathToClaudeCodeExecutable: getString(raw.pathToClaudeCodeExecutable) ?? defaults.pathToClaudeCodeExecutable ?? DEFAULT_EXECUTABLE_PATH,
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

function getProcessEnv(): Record<string, string> {
  return Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}
