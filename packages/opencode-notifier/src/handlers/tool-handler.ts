import type { Messages, NotifyFunction } from '../types.js';

export function createToolBeforeHandler(notify: NotifyFunction, messages: Messages) {
  return async (input: unknown, output: unknown) => {
    const toolName = ((input as Record<string, unknown>).tool as string) || 'tool';
    const args = ((output as Record<string, unknown>).args as Record<string, unknown>) || {};

    if (toolName === 'question') {
      const questions = (args.questions as Array<{ question?: string }>) || [];
      const firstQ = questions[0]?.question || messages.decisionRequired;
      notify('decisionNeeded', '🙋 OpenCode', messages.decisionNeeded(firstQ), 'Glass');
    } else if (toolName.toLowerCase() === 'task') {
      const description = (args.description as string) || 'task delegation';
      notify('subagentStarted', '🤖 OpenCode', messages.subagentStarted(description), 'Submarine');
    } else if (toolName.startsWith('mcp_')) {
      notify('toolExecuting', '🔧 OpenCode', messages.toolExecuting(toolName.replace('mcp_', '')), 'Tink');
    }
  };
}

export function createToolAfterHandler(notify: NotifyFunction, messages: Messages) {
  return async (input: unknown) => {
    const toolName = ((input as Record<string, unknown>).tool as string) || 'tool';
    if (toolName.toLowerCase() === 'task') {
      notify('subagentCompleted', '🤖 OpenCode', messages.subagentCompleted, 'Hero');
    } else if (toolName.startsWith('mcp_')) {
      notify('toolCompleted', '✓ OpenCode', messages.toolCompleted(toolName.replace('mcp_', '')), 'Blow');
    }
  };
}
