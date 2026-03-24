import { randomUUID } from 'node:crypto';

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

import { jsonSchemaToZodObjectShape } from './schema.js';
import { isRecord } from './types.js';

import type { BridgeContext, OpenCodeToolLike } from './types.js';
import type { LanguageModelV2FunctionTool, LanguageModelV2ProviderDefinedTool } from '@ai-sdk/provider';
import type { McpServerConfig } from '@anthropic-ai/claude-agent-sdk';

export const NATIVE_TOOL_NAME_MAP = {
  bash: 'Bash',
  edit: 'Edit',
  glob: 'Glob',
  grep: 'Grep',
  read: 'Read',
  write: 'Write',
} as const;

type BuiltBridge = {
  allowedTools: string[];
  bridgedToolNames: string[];
  mcpServers: Record<string, McpServerConfig>;
  nativeTools: string[];
  permissionPromptToolName?: string;
  warnings: string[];
};

type BridgedToolResult = {
  content: unknown[];
  isError?: boolean;
};

export function buildBridge(context: BridgeContext): BuiltBridge {
  const toolDefinitions = normalizeTools(context.tools);
  const enabledNative = new Set(context.nativeTools ?? Object.keys(NATIVE_TOOL_NAME_MAP));
  const enabledBridge = new Set(context.bridgeTools ?? []);

  const nativeTools: string[] = [];
  const bridgeDefinitions = [];
  const bridgedToolNames: string[] = [];
  const warnings: string[] = [];

  for (const definition of toolDefinitions) {
    const nativeName = NATIVE_TOOL_NAME_MAP[definition.name as keyof typeof NATIVE_TOOL_NAME_MAP];
    const bridgeEnabled = enabledBridge.size === 0 || enabledBridge.has(definition.name);
    const nativeEnabled = nativeName !== undefined && enabledNative.has(definition.name);
    const bridgeDefinition = bridgeEnabled ? createBridgeToolDefinition(definition, context) : undefined;
    const canBridge = bridgeDefinition !== undefined && hasProviderSideExecutor(definition);

    if (context.toolPreference === 'claude-first' && nativeEnabled) {
      nativeTools.push(nativeName);
      continue;
    }

    if (canBridge) {
      bridgedToolNames.push(definition.name);
      bridgeDefinitions.push(bridgeDefinition);
      continue;
    }

    if (nativeEnabled) {
      nativeTools.push(nativeName);
      continue;
    }

    if (bridgeEnabled) {
      if (!hasProviderSideExecutor(definition)) {
        warnings.push(`Skipping OpenCode tool "${definition.name}" because no provider-side executor was attached.`);
        continue;
      }

      warnings.push(
        `Skipping OpenCode tool "${definition.name}" because its schema could not be converted for the Claude Agent SDK bridge.`,
      );
    }
  }

  const mcpServers: Record<string, McpServerConfig> = {};

  if (bridgeDefinitions.length > 0) {
    mcpServers.opencode = createSdkMcpServer({
      name: 'opencode',
      tools: bridgeDefinitions,
      version: '0.1.0',
    });
  }

  return {
    allowedTools: [...nativeTools, ...(bridgeDefinitions.length > 0 ? ['mcp__opencode__*'] : [])],
    bridgedToolNames,
    mcpServers,
    nativeTools,
    permissionPromptToolName: bridgedToolNames.includes('question') ? 'mcp__opencode__question' : undefined,
    warnings,
  };
}

function createBridgeToolDefinition(definition: OpenCodeToolLike, context: BridgeContext) {
  if (definition.name === 'question') {
    return tool(
      definition.name,
      definition.description ?? 'Ask the user a structured question.',
      {
        questions: z.array(
          z.object({
            header: z.string(),
            multiple: z.boolean().optional(),
            options: z.array(
              z.object({
                description: z.string(),
                label: z.string(),
              }),
            ),
            question: z.string(),
          }),
        ),
      },
      async (args) => executeTool(definition, args, context),
    );
  }

  if (definition.name === 'apply_patch' || definition.name === 'oc_apply_patch') {
    return tool(
      definition.name,
      definition.description ?? 'Apply a textual patch to workspace files.',
      {
        patchText: z.string(),
      },
      async (args) => executeTool(definition, args, context),
    );
  }

  if (definition.name === 'codesearch' || definition.name === 'oc_codesearch') {
    return tool(
      definition.name,
      definition.description ?? 'Search indexed code context.',
      {
        query: z.string(),
        tokensNum: z.number().int().min(1000).max(50000).default(5000),
      },
      async (args) => executeTool(definition, args, context),
    );
  }

  if (definition.name === 'task') {
    return tool(
      definition.name,
      definition.description ?? 'Launch a subagent task.',
      {
        command: z.string().optional(),
        description: z.string(),
        prompt: z.string(),
        subagent_type: z.string(),
        task_id: z.string().optional(),
      },
      async (args) => executeTool(definition, args, context),
    );
  }

  if (definition.name === 'todowrite') {
    return tool(
      definition.name,
      definition.description ?? 'Write the current structured todo list.',
      {
        todos: z.array(
          z.object({
            content: z.string(),
            priority: z.enum(['high', 'medium', 'low']),
            status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
          }),
        ),
      },
      async (args) => executeTool(definition, args, context),
    );
  }

  if (definition.name === 'webfetch') {
    return tool(
      definition.name,
      definition.description ?? 'Fetch a web page as markdown, text, or html.',
      {
        format: z.enum(['markdown', 'text', 'html']).default('markdown'),
        timeout: z.number().int().positive().max(120).optional(),
        url: z.string().url(),
      },
      async (args) => executeTool(definition, args, context),
    );
  }

  if (definition.name === 'websearch' || definition.name === 'oc_websearch') {
    return tool(
      definition.name,
      definition.description ?? 'Search the web for current information.',
      {
        query: z.string(),
      },
      async (args) => executeTool(definition, args, context),
    );
  }

  const genericShape = jsonSchemaToZodObjectShape(definition.inputSchema);

  if (genericShape) {
    return tool(definition.name, definition.description ?? `Execute the ${definition.name} tool.`, genericShape, async (args) =>
      executeTool(definition, args, context),
    );
  }

  return undefined;
}

async function executeTool(definition: OpenCodeToolLike, args: unknown, context: BridgeContext) {
  if (typeof definition.execute !== 'function') {
    return {
      content: [
        {
          text: `Tool "${definition.name}" is visible to Claude but no provider-side executor was attached.`,
          type: 'text',
        },
      ],
      isError: true,
    } as BridgedToolResult;
  }

  try {
    const output = await definition.execute(args, {
      abortSignal: context.abortSignal,
      messages: context.prompt,
      toolCallId: randomUUID(),
    });

    if (isRecord(output) && Array.isArray(output.content)) {
      return output as BridgedToolResult;
    }

    return {
      content: [{ text: toText(output), type: 'text' }],
    } as BridgedToolResult;
  } catch (error) {
    return {
      content: [{ text: toText(error), type: 'text' }],
      isError: true,
    } as BridgedToolResult;
  }
}

function hasProviderSideExecutor(definition: OpenCodeToolLike): boolean {
  return typeof definition.execute === 'function';
}

function normalizeTools(input: unknown): OpenCodeToolLike[] {
  if (Array.isArray(input)) {
    return input.filter(isFunctionTool) as OpenCodeToolLike[];
  }

  if (!isRecord(input)) {
    return [];
  }

  return Object.entries(input)
    .map(([name, value]) => {
      if (!isRecord(value)) {
        return undefined;
      }

      return {
        ...value,
        name,
      } as OpenCodeToolLike;
    })
    .filter((value): value is OpenCodeToolLike => value !== undefined && typeof value.name === 'string');
}

function isFunctionTool(
  input: LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool | unknown,
): input is LanguageModelV2FunctionTool {
  return isRecord(input) && input.type === 'function' && typeof input.name === 'string';
}

function toText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    return value.message;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
