import type { LanguageModelV2FunctionTool, LanguageModelV2Prompt } from '@ai-sdk/provider';
import type { McpServerConfig, Options, SDKMessage } from '@anthropic-ai/claude-agent-sdk';

export const DEFAULT_NATIVE_TOOLS = ['bash', 'read', 'write', 'edit', 'glob', 'grep'] as const;
export const DEFAULT_BRIDGE_TOOLS = [
  'question',
  'task',
  'todowrite',
  'webfetch',
  'websearch',
  'oc_websearch',
  'oc_apply_patch',
  'oc_codesearch',
] as const;
export const DEFAULT_MAX_TURNS = 12;
export const DEFAULT_EXECUTABLE_PATH = 'claude';

export type ClaudeCodeEffort = 'low' | 'medium' | 'high' | 'max';

export type OpenCodeLocalMcpConfig = {
  enabled?: boolean;
  type: 'local';
  command: string[];
  environment?: Record<string, string>;
};

export type OpenCodeRemoteMcpConfig = {
  enabled?: boolean;
  type: 'remote';
  url: string;
  headers?: Record<string, string>;
  oauth?: Record<string, string> | boolean;
  transport?: 'http' | 'sse';
};

export type OpenCodeMcpConfig = Record<string, OpenCodeLocalMcpConfig | OpenCodeRemoteMcpConfig>;

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

export type QueryLike = AsyncIterable<SDKMessage> & {
  close(): void;
};

export type QueryRunner = (input: { options?: Options; prompt: string }) => QueryLike;

export type ClaudeCodeProviderOptions = {
  bridgeOpenCodeMcp?: boolean;
  bridgeTools?: string[];
  claudeMdPath?: string;
  cwd?: string;
  env?: Record<string, string>;
  effort?: ClaudeCodeEffort;
  loadClaudeMd?: boolean;
  maxTurns?: number;
  mcpServers?: Record<string, McpServerConfig>;
  nativeTools?: string[];
  openCodeMcp?: OpenCodeMcpConfig;
  pathToClaudeCodeExecutable?: string;
  queryRunner?: QueryRunner;
  settingSources?: string[];
};

export type NormalizedClaudeCodeOptions = {
  bridgeOpenCodeMcp: boolean;
  bridgeTools: string[];
  claudeMdPath?: string;
  cwd: string;
  env: Record<string, string>;
  effort?: ClaudeCodeEffort;
  loadClaudeMd: boolean;
  maxTurns: number;
  mcpServers: Record<string, McpServerConfig>;
  nativeTools: string[];
  openCodeMcp?: OpenCodeMcpConfig;
  pathToClaudeCodeExecutable: string;
  queryRunner?: QueryRunner;
  settingSources: string[];
};

export type BridgeContext = {
  abortSignal?: AbortSignal;
  bridgeTools?: string[];
  nativeTools?: string[];
  prompt: LanguageModelV2Prompt;
  tools: unknown;
};

export function normalizeProviderOptions(
  rawOptions: Record<string, unknown> | undefined,
  defaults: ClaudeCodeProviderOptions,
): NormalizedClaudeCodeOptions {
  const raw = rawOptions ?? {};
  const rawEnv = isStringRecord(raw.env) ? raw.env : undefined;

  return {
    bridgeOpenCodeMcp: getBoolean(raw.bridgeOpenCodeMcp) ?? defaults.bridgeOpenCodeMcp ?? false,
    bridgeTools: getStringArray(raw.bridgeTools) ?? defaults.bridgeTools ?? [...DEFAULT_BRIDGE_TOOLS],
    claudeMdPath: getString(raw.claudeMdPath) ?? defaults.claudeMdPath,
    cwd: getString(raw.cwd) ?? defaults.cwd ?? process.cwd(),
    env: {
      ...(defaults.env ?? {}),
      ...(rawEnv ?? {}),
    },
    effort: getEffort(raw.effort) ?? defaults.effort,
    loadClaudeMd: getBoolean(raw.loadClaudeMd) ?? defaults.loadClaudeMd ?? false,
    maxTurns: getNumber(raw.maxTurns) ?? defaults.maxTurns ?? DEFAULT_MAX_TURNS,
    mcpServers: getRecord<McpServerConfig>(raw.mcpServers) ?? defaults.mcpServers ?? {},
    nativeTools: getStringArray(raw.nativeTools) ?? defaults.nativeTools ?? [...DEFAULT_NATIVE_TOOLS],
    openCodeMcp: getRecord<OpenCodeLocalMcpConfig | OpenCodeRemoteMcpConfig>(raw.openCodeMcp) ?? defaults.openCodeMcp,
    pathToClaudeCodeExecutable: getString(raw.pathToClaudeCodeExecutable) ?? defaults.pathToClaudeCodeExecutable ?? DEFAULT_EXECUTABLE_PATH,
    queryRunner: defaults.queryRunner,
    settingSources: getStringArray(raw.settingSources) ?? defaults.settingSources ?? [],
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

function getEffort(value: unknown): ClaudeCodeEffort | undefined {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'max') {
    return value;
  }

  return undefined;
}
