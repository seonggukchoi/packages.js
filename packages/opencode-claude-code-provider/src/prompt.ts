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
    return buildResumePrompt(prompt);
  }

  const sections: string[] = [];
  const system = getSystem(prompt);

  if (system) {
    sections.push(['System instructions:', system].join('\n'));
  }

  const conversation = serializeConversation(prompt.filter((message) => message.role !== 'system'));

  if (conversation) {
    sections.push(['Conversation transcript (context only - do not repeat or continue it):', conversation].join('\n'));
  }

  sections.push(
    [
      'Response instructions:',
      "Respond with the assistant's next message only.",
      'Do not repeat transcript headers, tool narration, or tool results unless the user explicitly asks for the raw transcript.',
    ].join('\n'),
  );

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

function buildResumePrompt(prompt: LanguageModelV2Prompt): string {
  const resumeMessages = collectMessagesForResume(prompt);
  const hasToolResults = resumeMessages.some(
    (message) => message.role === 'tool' || (message.role === 'assistant' && message.content.some((part) => part.type === 'tool-result')),
  );

  if (hasToolResults) {
    return serializeConversation(resumeMessages);
  }

  return getLatestUserText(prompt) ?? serializeConversation(prompt.slice(-1));
}

function collectMessagesForResume(prompt: LanguageModelV2Prompt): LanguageModelV2Prompt {
  const messages: LanguageModelV2Prompt = [];

  for (let index = prompt.length - 1; index >= 0; index -= 1) {
    const message = prompt[index];

    if (message.role === 'system') {
      continue;
    }

    if (message.role === 'tool' || message.role === 'user') {
      messages.unshift(message);
      continue;
    }

    if (message.role === 'assistant') {
      const hasToolResult = message.content.some((part) => part.type === 'tool-result');

      if (hasToolResult) {
        messages.unshift(message);
        continue;
      }

      break;
    }
  }

  return messages;
}

function serializeConversation(prompt: LanguageModelV2Prompt): string {
  return prompt
    .map((message) => serializeMessage(message))
    .filter((section) => section.length > 0)
    .join('\n\n')
    .trim();
}

function serializeMessage(message: LanguageModelV2Prompt[number]): string {
  if (message.role === 'system') {
    return '';
  }

  if (message.role === 'user') {
    return ['User:', ...message.content.map((part) => serializeUserPart(part)).filter(Boolean)].join('\n');
  }

  if (message.role === 'assistant') {
    return ['Assistant:', ...message.content.map((part) => serializeAssistantPart(part)).filter(Boolean)].join('\n');
  }

  return ['External tool results:', ...message.content.map((part) => serializeToolResultPart(part)).filter(Boolean)].join('\n');
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
    return `Assistant used the ${part.toolName} tool with input: ${safeJsonStringify(normalizeToolInput(part.input))}`;
  }

  if (part.type === 'tool-result') {
    return serializeToolResultPart(part);
  }

  return formatFilePart(part);
}

function serializeToolResultPart(part: LanguageModelV2ToolResultPart): string {
  return `The ${part.toolName} tool returned: ${safeJsonStringify(part.output)}`;
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
