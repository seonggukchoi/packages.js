import { buildNotification } from './notification.js';

import type { SessionRegistry } from '../session.js';
import type { Messages, NotifyFunction } from '../types.js';

interface ToolInput {
  tool?: string;
  sessionID?: string;
  args?: Record<string, unknown>;
}

interface ToolOutput {
  args?: Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

// `subagent_type` names the agent the task tool delegated to (e.g. "explore", "general"), which
// is what a remote reader recognizes; the child session id it runs in is opaque.
function resolveAgentLabel(args: Record<string, unknown>): string | undefined {
  return readString(args.subagent_type);
}

function isTaskTool(toolName: string): boolean {
  return toolName.toLowerCase() === 'task';
}

function isMcpTool(toolName: string): boolean {
  return toolName.startsWith('mcp_');
}

export function createToolBeforeHandler(notify: NotifyFunction, messages: Messages, sessions: SessionRegistry) {
  return async (input: unknown, output: unknown): Promise<void> => {
    const { tool: toolName = 'tool', sessionID } = (input ?? {}) as ToolInput;
    const args = ((output ?? {}) as ToolOutput).args ?? {};

    if (toolName === 'question') {
      const questions = (args.questions as Array<{ question?: string }> | undefined) ?? [];
      const context = await sessions.resolveContext(sessionID);
      notify(buildNotification('decisionNeeded', messages, { question: questions[0]?.question }), context);
    } else if (isTaskTool(toolName)) {
      const context = await sessions.resolveContext(sessionID, resolveAgentLabel(args));
      notify(buildNotification('subagentStarted', messages, { description: readString(args.description) }), context);
    } else if (isMcpTool(toolName)) {
      const context = await sessions.resolveContext(sessionID);
      notify(buildNotification('toolExecuting', messages, { toolName }), context);
    }
  };
}

export function createToolAfterHandler(notify: NotifyFunction, messages: Messages, sessions: SessionRegistry) {
  return async (input: unknown): Promise<void> => {
    const { tool: toolName = 'tool', sessionID, args = {} } = (input ?? {}) as ToolInput;

    if (isTaskTool(toolName)) {
      const context = await sessions.resolveContext(sessionID, resolveAgentLabel(args));
      notify(buildNotification('subagentCompleted', messages), context);
    } else if (isMcpTool(toolName)) {
      const context = await sessions.resolveContext(sessionID);
      notify(buildNotification('toolCompleted', messages, { toolName }), context);
    }
  };
}
