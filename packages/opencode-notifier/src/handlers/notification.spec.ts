import { buildNotification } from './notification.js';

import type { EventKey, Messages } from '../types.js';

function createMockMessages(): Messages {
  return {
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
}

describe('buildNotification', () => {
  const messages = createMockMessages();

  it.each<[EventKey, string, string, string]>([
    ['sessionStarted', '⚡ OpenCode', 'Session started.', 'Pop'],
    ['sessionCompleted', '✅ OpenCode', 'Session completed.', 'Hero'],
    ['sessionError', '❌ OpenCode', 'An error occurred.', 'Basso'],
    ['sessionCompacted', '📦 OpenCode', 'Session compacted.', 'Purr'],
    ['permissionRequested', '🔐 OpenCode', 'Permission requested.', 'Glass'],
    ['subagentCompleted', '🤖 OpenCode', 'Subagent task completed.', 'Hero'],
  ])('builds %s with its title, message and sound', (eventKey, title, message, sound) => {
    expect(buildNotification(eventKey, messages)).toEqual({ eventKey, title, message, sound });
  });

  it('builds decisionNeeded with the question', () => {
    const notification = buildNotification('decisionNeeded', messages, { question: 'What should I do?' });

    expect(notification).toEqual({
      eventKey: 'decisionNeeded',
      title: '🙋 OpenCode',
      message: 'Decision needed: What should I do?',
      sound: 'Glass',
    });
  });

  it('falls back to the generic decision message without a question', () => {
    expect(buildNotification('decisionNeeded', messages).message).toBe('Decision needed: Decision required.');
    expect(buildNotification('decisionNeeded', messages, { question: '' }).message).toBe('Decision needed: Decision required.');
  });

  it('builds subagentStarted with the task description', () => {
    const notification = buildNotification('subagentStarted', messages, { description: 'Analyze code' });

    expect(notification).toEqual({
      eventKey: 'subagentStarted',
      title: '🤖 OpenCode',
      message: 'Subagent started: Analyze code',
      sound: 'Submarine',
    });
  });

  it('falls back to a generic description for subagentStarted', () => {
    expect(buildNotification('subagentStarted', messages).message).toBe('Subagent started: task delegation');
  });

  it('strips the mcp_ prefix from tool names', () => {
    expect(buildNotification('toolExecuting', messages, { toolName: 'mcp_bash' })).toEqual({
      eventKey: 'toolExecuting',
      title: '🔧 OpenCode',
      message: 'bash executing...',
      sound: 'Tink',
    });
    expect(buildNotification('toolCompleted', messages, { toolName: 'mcp_read' })).toEqual({
      eventKey: 'toolCompleted',
      title: '✓ OpenCode',
      message: 'read completed.',
      sound: 'Blow',
    });
  });

  it('falls back to a generic tool name', () => {
    expect(buildNotification('toolExecuting', messages).message).toBe('tool executing...');
    expect(buildNotification('toolCompleted', messages, { toolName: '' }).message).toBe('tool completed.');
  });
});
