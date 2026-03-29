import { isRecord } from './types.js';

type ToolPromptDefinition = {
  description?: string;
  inputSchema: Record<string, unknown>;
  name: string;
};

export function buildToolSystemPrompt(tools: unknown): string | undefined {
  const definitions = sortToolDefinitions(resolveToolDefinitions(tools));

  if (definitions.length === 0) {
    return undefined;
  }

  const selectionRules = buildToolSelectionRules(definitions);

  const serializedTools = definitions
    .map((tool) => {
      const sections = [`- ${tool.name}`];

      if (tool.description) {
        sections.push(`  description: ${tool.description}`);
      }

      sections.push(`  parameters: ${safeJsonStringify(tool.inputSchema)}`);

      return sections.join('\n');
    })
    .join('\n');

  return [
    'You may use tools provided by the client.',
    'When a tool is required, wrap each tool call in <tool_call> and </tool_call>.',
    'Inside the tag, output strict JSON with the shape {"name":"tool_name","arguments":{}}.',
    'String and scalar parameters should be specified as is, while lists and objects should use JSON format.',
    'CRITICAL: Do NOT stringify JSON values. Array parameters must be actual JSON arrays, not strings containing JSON (use "items":[1,2,3] NOT "items":"[1,2,3]"). Number parameters must be actual JSON numbers, not strings (use "count":5 NOT "count":"5").',
    'If you decide to call a tool, the first non-whitespace character of your response must be < and the response must end immediately after the last </tool_call>.',
    'Do not include any prose before or after the tool call.',
    'Do not say that you will inspect, check, search, analyze, or look first before the tool call.',
    'Do not use <function_calls>, <function_call>, <tool_use>, XML parameters, markdown fences, or natural-language explanations.',
    'Transcript markers such as User:, Assistant:, Tool:, [tool-call:*], and [tool-result:*] are internal context. Never echo them unless the user explicitly asks for the raw transcript.',
    'After emitting tool call(s), stop immediately.',
    'Never hallucinate tool execution or tool results.',
    'You can call multiple tools in a single response. If you intend to call multiple tools and there are no dependencies between them, make all independent tool calls in parallel. Maximize use of parallel tool calls where possible to increase efficiency. However, if some tool calls depend on previous calls to inform dependent values, do NOT call these tools in parallel and instead call them sequentially. For instance, if one operation must complete before another starts, run these operations sequentially instead. Never use placeholders or guess missing parameters in tool calls.',
    'If you intend to call multiple tools in a single response, output each tool call wrapped in its own <tool_call> and </tool_call> tags, one after another with no text between them. For example, if you need to read two files, send a single message with two tool_call blocks:',
    '<tool_call>{"name":"read","arguments":{"filePath":"/path/to/file1.ts"}}</tool_call>',
    '<tool_call>{"name":"read","arguments":{"filePath":"/path/to/file2.ts"}}</tool_call>',
    ...(selectionRules.length > 0 ? ['Tool selection rules:', ...selectionRules] : []),
    'Available tools:',
    serializedTools,
  ].join('\n');
}

function resolveToolDefinitions(tools: unknown): ToolPromptDefinition[] {
  if (Array.isArray(tools)) {
    return tools.flatMap((tool) => toToolPromptDefinition(tool));
  }

  if (!isRecord(tools)) {
    return [];
  }

  return Object.entries(tools).flatMap(([key, value]) => toToolPromptDefinition(value, key));
}

function sortToolDefinitions(definitions: ToolPromptDefinition[]): ToolPromptDefinition[] {
  return [...definitions].sort(
    (left, right) => compareToolPriority(left.name) - compareToolPriority(right.name) || left.name.localeCompare(right.name),
  );
}

function compareToolPriority(name: string): number {
  const priority = TOOL_PRIORITY[name];

  return priority ?? Number.MAX_SAFE_INTEGER;
}

function buildToolSelectionRules(definitions: ToolPromptDefinition[]): string[] {
  const names = new Set(definitions.map((tool) => tool.name));
  const rules: string[] = [];

  rules.push('- If the user explicitly asks for a TODO list or task checklist, use `todowrite` instead of `task`.');
  rules.push('- If the user explicitly asks to run a shell command such as `ls`, use `bash`.');
  rules.push('- If the user explicitly asks to read a local file, use `read`.');
  rules.push('- Never call `todowrite` unless the user explicitly asks for a TODO list, checklist, or task tracking.');

  if (names.has('todowrite')) {
    rules.push('- `todowrite` is for creating, updating, or managing the conversation task list. Prefer it for TODO/checklist requests.');
  }

  if (names.has('task')) {
    rules.push(
      '- `task` is only for delegating complex multistep work to a subagent. Do not use `task` for TODO lists, simple reads, or basic shell commands.',
    );
    rules.push(
      '- For codebase exploration, repository analysis, or broad code search, prefer `task` with an exploration-focused subagent when available.',
    );
  }

  if (names.has('question')) {
    rules.push('- `question` is only for necessary clarification when you are blocked and cannot safely choose a reasonable default.');
  }

  if (names.has('webfetch')) {
    rules.push('- `webfetch` is for fetching content from a URL, not for local files or shell commands.');
  }

  return rules;
}

const TOOL_PRIORITY: Record<string, number> = {
  bash: 20,
  question: 50,
  read: 10,
  task: 70,
  todowrite: 0,
  webfetch: 30,
};

function toToolPromptDefinition(value: unknown, fallbackName?: string): ToolPromptDefinition[] {
  if (!isRecord(value) || value.type !== 'function') {
    return [];
  }

  const name = typeof value.name === 'string' && value.name.length > 0 ? value.name : fallbackName;
  const inputSchema = isRecord(value.inputSchema) ? value.inputSchema : isRecord(value.parameters) ? value.parameters : undefined;

  if (!name || !inputSchema) {
    return [];
  }

  return [
    {
      description: typeof value.description === 'string' ? value.description : undefined,
      inputSchema,
      name,
    },
  ];
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}
