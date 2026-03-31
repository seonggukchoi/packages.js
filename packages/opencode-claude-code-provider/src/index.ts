import { ClaudeCodeLanguageModel } from './model.js';

import type { ClaudeCodeProviderOptions } from './types.js';
import type { LanguageModelV3 } from '@ai-sdk/provider';

export type { ClaudeCodeProviderOptions } from './types.js';

export function createClaudeCode(options: ClaudeCodeProviderOptions = {}) {
  const cache = new Map<string, LanguageModelV3>();
  const make = (modelId: string): LanguageModelV3 => {
    const cached = cache.get(modelId);

    if (cached) {
      return cached;
    }

    const model = new ClaudeCodeLanguageModel(modelId, options);

    cache.set(modelId, model);

    return model;
  };

  return {
    languageModel: make,
    chat: make,
    responses: make,
  };
}
