import type { NotifyFunction } from '../types.js';

export function createToolBeforeHandler(notify: NotifyFunction) {
  return async (input: unknown, output: unknown) => {
    const toolName = ((input as Record<string, unknown>).tool as string) || 'tool';
    const args = ((output as Record<string, unknown>).args as Record<string, unknown>) || {};

    if (toolName === 'question') {
      const questions = (args.questions as Array<{ question?: string }>) || [];
      const firstQ = questions[0]?.question || 'Decision required';
      notify('🙋 OpenCode', `Decision needed: ${firstQ}`, 'Glass');
    } else if (toolName.toLowerCase() === 'task') {
      notify('🤖 OpenCode', `Subagent started: ${(args.description as string) || 'task delegation'}`, 'Submarine');
    } else if (toolName.startsWith('mcp_')) {
      notify('🔧 OpenCode', `${toolName.replace('mcp_', '')} executing...`, 'Tink');
    }
  };
}

export function createToolAfterHandler(notify: NotifyFunction) {
  return async (input: unknown) => {
    const toolName = ((input as Record<string, unknown>).tool as string) || 'tool';
    if (toolName.toLowerCase() === 'task') {
      notify('🤖 OpenCode', 'Subagent task completed', 'Hero');
    } else if (toolName.startsWith('mcp_')) {
      notify('✓ OpenCode', `${toolName.replace('mcp_', '')} completed`, 'Blow');
    }
  };
}
