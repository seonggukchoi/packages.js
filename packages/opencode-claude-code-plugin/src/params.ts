import { normalizeClaudeCodeEffort } from './effort.js';

type ChatParamsInput = {
  model: {
    providerID: string;
  };
};

type ChatParamsOutput = {
  options: Record<string, unknown>;
};

type NormalizeChatParamsOptions = {
  cwd: string;
};

export function normalizeChatParams(input: ChatParamsInput, output: ChatParamsOutput, defaults: NormalizeChatParamsOptions): void {
  if (input.model?.providerID !== 'claude-code') {
    return;
  }

  output.options = {
    ...output.options,
    claudeMdPath: normalizeString(output.options.claudeMdPath),
    cwd: normalizeString(output.options.cwd) ?? defaults.cwd,
    effort: normalizeClaudeCodeEffort(output.options.effort),
    env: normalizeRecord(output.options.env) ?? {},
    loadClaudeMd: normalizeBoolean(output.options.loadClaudeMd) ?? false,
    maxTurns: normalizeNumber(output.options.maxTurns) ?? 1,
    pathToClaudeCodeExecutable: normalizeString(output.options.pathToClaudeCodeExecutable) ?? 'claude',
    permissionMode: normalizePermissionMode(output.options.permissionMode),
  };
}

function normalizeBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function normalizeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeRecord(value: unknown): Record<string, string> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string');

  return Object.fromEntries(entries);
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function normalizePermissionMode(value: unknown): string | undefined {
  return value === 'acceptEdits' || value === 'bypassPermissions' || value === 'default' || value === 'dontAsk' || value === 'plan'
    ? value
    : undefined;
}
