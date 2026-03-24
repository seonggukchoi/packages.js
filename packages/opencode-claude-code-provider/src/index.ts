import { ClaudeCodeLanguageModel } from './model.js';

import type { ClaudeCodeProviderOptions } from './types.js';
import type { LanguageModelV2 } from '@ai-sdk/provider';

export type { ClaudeCodeProviderOptions, NormalizedClaudeCodeOptions, OpenCodeToolLike } from './types.js';

export { ClaudeCodeLanguageModel } from './model.js';
export { buildBridge, NATIVE_TOOL_NAME_MAP } from './bridge.js';
export { buildPrompt, getSystem, loadClaudeMd } from './prompt.js';
export { mapSdkMessage, createStreamState } from './messages.js';
export { getResume } from './resume.js';
export { toAgentMcp } from './mcp.js';
export { jsonSchemaToZod, jsonSchemaToZodObjectShape } from './schema.js';

export function createClaudeCode(options: ClaudeCodeProviderOptions = {}) {
  const make = (modelId: string): LanguageModelV2 => new ClaudeCodeLanguageModel(modelId, options);

  return {
    languageModel: make,
    chat: make,
    responses: make,
  };
}
