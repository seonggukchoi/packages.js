import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type {
  LanguageModelV2FilePart,
  LanguageModelV2Prompt,
  LanguageModelV2ReasoningPart,
  LanguageModelV2TextPart,
  LanguageModelV2ToolCallPart,
  LanguageModelV2ToolResultPart,
} from '@ai-sdk/provider';

export function getSystem(prompt: LanguageModelV2Prompt): string {
  return prompt
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .filter((content) => content.length > 0)
    .join('\n\n')
    .trim();
}

export function buildPrompt(prompt: LanguageModelV2Prompt, options: { resumeSessionId?: string } = {}): string {
  if (options.resumeSessionId) {
    return getLatestUserText(prompt) ?? serializeConversation(prompt.slice(-1));
  }

  const sections: string[] = [];
  const system = getSystem(prompt);

  if (system) {
    sections.push(['System instructions:', system].join('\n'));
  }

  const conversation = serializeConversation(prompt.filter((message) => message.role !== 'system'));

  if (conversation) {
    sections.push(['Conversation:', conversation].join('\n'));
  }

  return sections.join('\n\n').trim();
}

export function getLatestUserText(prompt: LanguageModelV2Prompt): string | undefined {
  for (let index = prompt.length - 1; index >= 0; index -= 1) {
    const message = prompt[index];

    if (message.role !== 'user') {
      continue;
    }

    const text = message.content
      .map((part) => serializeUserPart(part))
      .filter((value) => value.length > 0)
      .join('\n')
      .trim();

    if (text) {
      return text;
    }
  }

  return undefined;
}

export async function loadClaudeMd(options: { cwd: string; explicitPath?: string; loadClaudeMd?: boolean }): Promise<string | undefined> {
  if (!options.loadClaudeMd) {
    return undefined;
  }

  const filePath = options.explicitPath ?? join(options.cwd, 'CLAUDE.md');

  try {
    await access(filePath);
    const content = await readFile(filePath, 'utf8');
    const trimmed = content.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

function serializeConversation(prompt: LanguageModelV2Prompt): string {
  return prompt
    .map((message) => {
      if (message.role === 'system') {
        return '';
      }

      if (message.role === 'user') {
        return ['User:', ...message.content.map((part) => serializeUserPart(part)).filter(Boolean)].join('\n');
      }

      if (message.role === 'assistant') {
        return ['Assistant:', ...message.content.map((part) => serializeAssistantPart(part)).filter(Boolean)].join('\n');
      }

      return ['Tool:', ...message.content.map((part) => serializeToolResultPart(part)).filter(Boolean)].join('\n');
    })
    .filter((section) => section.length > 0)
    .join('\n\n')
    .trim();
}

function serializeUserPart(part: LanguageModelV2TextPart | LanguageModelV2FilePart): string {
  if (part.type === 'text') {
    return part.text;
  }

  return formatFilePart(part);
}

function serializeAssistantPart(
  part:
    | LanguageModelV2TextPart
    | LanguageModelV2FilePart
    | LanguageModelV2ReasoningPart
    | LanguageModelV2ToolCallPart
    | LanguageModelV2ToolResultPart,
): string {
  if (part.type === 'text') {
    return part.text;
  }

  if (part.type === 'reasoning') {
    return '';
  }

  if (part.type === 'tool-call') {
    return `[tool-call:${part.toolName}] ${safeJsonStringify(normalizeToolInput(part.input))}`;
  }

  if (part.type === 'tool-result') {
    return serializeToolResultPart(part);
  }

  return formatFilePart(part);
}

function serializeToolResultPart(part: LanguageModelV2ToolResultPart): string {
  return `[tool-result:${part.toolName}] ${safeJsonStringify(part.output)}`;
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizeToolInput(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function formatFilePart(part: LanguageModelV2FilePart): string {
  const fileName = part.filename ? ` filename=${part.filename}` : '';
  const dataInfo = describeFileData(part.data);

  return `[file mediaType=${part.mediaType}${fileName}${dataInfo ? ` ${dataInfo}` : ''}]`;
}

function describeFileData(data: LanguageModelV2FilePart['data']): string {
  if (data instanceof Uint8Array) {
    return `bytes=${data.byteLength}`;
  }

  if (data instanceof URL) {
    return `url=${data.toString()}`;
  }

  if (typeof data === 'string') {
    return `stringLength=${data.length}`;
  }

  return '';
}
