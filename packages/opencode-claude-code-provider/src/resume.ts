import { isRecord } from './types.js';

import type { LanguageModelV2Prompt } from '@ai-sdk/provider';

type PromptMessageWithMetadata = LanguageModelV2Prompt[number] & {
  providerMetadata?: Record<string, Record<string, unknown>>;
};

export function getResume(prompt: LanguageModelV2Prompt, modelId: string): string | undefined {
  for (let index = prompt.length - 1; index >= 0; index -= 1) {
    const message = prompt[index] as PromptMessageWithMetadata;
    const metadata = message.providerMetadata?.['claude-code'];

    if (!isRecord(metadata)) {
      continue;
    }

    const sessionId = typeof metadata.sessionId === 'string' ? metadata.sessionId : undefined;
    const previousModelId = typeof metadata.modelId === 'string' ? metadata.modelId : undefined;

    if (!sessionId) {
      continue;
    }

    if (previousModelId && previousModelId !== modelId) {
      return undefined;
    }

    return sessionId;
  }

  return undefined;
}
