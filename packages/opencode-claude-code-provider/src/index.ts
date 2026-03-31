import { ClaudeCodeLanguageModel } from './model.js';

import type { ClaudeCodeProviderOptions } from './types.js';
import type { LanguageModelV3 } from '@ai-sdk/provider';

export type { ClaudeCodeProviderOptions } from './types.js';

export function createClaudeCode(options: ClaudeCodeProviderOptions = {}) {
  const make = (modelId: string): LanguageModelV3 => new ClaudeCodeLanguageModel(modelId, options);

  return {
    languageModel: make,
    chat: make,
    responses: make,
  };
}
