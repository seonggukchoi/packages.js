import { isRecord } from './types.js';

import type { LanguageModelV2Prompt } from '@ai-sdk/provider';

type PromptMessageWithMetadata = LanguageModelV2Prompt[number] & {
  providerMetadata?: Record<string, Record<string, unknown>>;
};

type ResumeMetadata = {
  modelId?: string;
  sessionId?: string;
};

export function getResume(prompt: LanguageModelV2Prompt, modelId: string): string | undefined {
  for (let index = prompt.length - 1; index >= 0; index -= 1) {
    const message = prompt[index] as PromptMessageWithMetadata;
    const metadata =
      readResumeMetadata(message.providerOptions?.['claude-code']) ??
      readResumeMetadata(message.providerMetadata?.['claude-code']) ??
      getAssistantPartResumeMetadata(message);

    const sessionId = metadata?.sessionId;
    const previousModelId = metadata?.modelId;

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

function getAssistantPartResumeMetadata(message: PromptMessageWithMetadata): ResumeMetadata | undefined {
  if (message.role !== 'assistant') {
    return undefined;
  }

  for (let index = message.content.length - 1; index >= 0; index -= 1) {
    const metadata = readResumeMetadata(message.content[index]?.providerOptions?.['claude-code']);

    if (metadata?.sessionId) {
      return metadata;
    }
  }

  return undefined;
}

function readResumeMetadata(value: unknown): ResumeMetadata | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    modelId: typeof value.modelId === 'string' ? value.modelId : undefined,
    sessionId: typeof value.sessionId === 'string' ? value.sessionId : undefined,
  };
}
