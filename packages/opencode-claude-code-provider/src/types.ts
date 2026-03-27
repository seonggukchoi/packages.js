import type { LanguageModelV2FunctionTool, LanguageModelV2Prompt } from '@ai-sdk/provider';

export const DEFAULT_MAX_TURNS = 1;
export const DEFAULT_EXECUTABLE_PATH = 'claude';
export const DEFAULT_PERMISSION_MODE = 'bypassPermissions' as const;

export type ClaudeCodeEffort = 'low' | 'medium' | 'high' | 'max';
export type ClaudeCodePermissionMode = 'acceptEdits' | 'bypassPermissions' | 'default' | 'dontAsk' | 'plan';

export type ProviderMetadataValue = {
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
  claudeMdPath?: string;
  cwd?: string;
  env?: Record<string, string>;
  effort?: ClaudeCodeEffort;
  loadClaudeMd?: boolean;
  maxTurns?: number;
  pathToClaudeCodeExecutable?: string;
  permissionMode?: ClaudeCodePermissionMode;
};

export type NormalizedClaudeCodeOptions = {
  claudeMdPath?: string;
  cwd: string;
  env: Record<string, string>;
  effort?: ClaudeCodeEffort;
  loadClaudeMd: boolean;
  maxTurns: number;
  pathToClaudeCodeExecutable: string;
  permissionMode: ClaudeCodePermissionMode;
};

export function normalizeProviderOptions(
  rawOptions: Record<string, unknown> | undefined,
  defaults: ClaudeCodeProviderOptions,
): NormalizedClaudeCodeOptions {
  const raw = rawOptions ?? {};
  const rawEnv = getStringRecord(raw.env);

  return {
    claudeMdPath: getString(raw.claudeMdPath) ?? defaults.claudeMdPath,
    cwd: getString(raw.cwd) ?? defaults.cwd ?? process.cwd(),
    env: {
      ...getProcessEnv(),
      ...(defaults.env ?? {}),
      ...(rawEnv ?? {}),
    },
    effort: getEffort(raw.effort) ?? defaults.effort,
    loadClaudeMd: getBoolean(raw.loadClaudeMd) ?? defaults.loadClaudeMd ?? false,
    maxTurns: getNumber(raw.maxTurns) ?? defaults.maxTurns ?? DEFAULT_MAX_TURNS,
    pathToClaudeCodeExecutable: getString(raw.pathToClaudeCodeExecutable) ?? defaults.pathToClaudeCodeExecutable ?? DEFAULT_EXECUTABLE_PATH,
    permissionMode: getPermissionMode(raw.permissionMode) ?? defaults.permissionMode ?? DEFAULT_PERMISSION_MODE,
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
  return typeof value === 'object' && value !== null;
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

function getEffort(value: unknown): ClaudeCodeEffort | undefined {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'max') {
    return value;
  }

  return undefined;
}

function getPermissionMode(value: unknown): ClaudeCodePermissionMode | undefined {
  if (value === 'acceptEdits' || value === 'bypassPermissions' || value === 'default' || value === 'dontAsk' || value === 'plan') {
    return value;
  }

  return undefined;
}

function getProcessEnv(): Record<string, string> {
  return Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}
