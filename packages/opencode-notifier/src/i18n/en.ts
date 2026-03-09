import type { Messages } from '../types.js';

export const en: Messages = {
  sessionStarted: 'Session started.',
  sessionCompleted: 'Session completed.',
  sessionError: 'An error occurred.',
  sessionCompacted: 'Session compacted.',
  permissionRequested: 'Permission requested.',
  decisionRequired: 'Decision required.',
  decisionNeeded: (question: string) => `Decision needed: ${question}`,
  subagentStarted: (description: string) => `Subagent started: ${description}`,
  subagentCompleted: 'Subagent task completed.',
  toolExecuting: (toolName: string) => `${toolName} executing...`,
  toolCompleted: (toolName: string) => `${toolName} completed.`,
};
