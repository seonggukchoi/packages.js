import { buildNotification, shouldSendNotification } from './hook-handler.js';

import type { EventKey, HookData, Messages } from '../types.js';

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

  it('builds sessionStarted notification', () => {
    const result = buildNotification('sessionStarted', messages, {});

    expect(result.title).toBe('\u26A1 Claude Code');
    expect(result.message).toBe('Session started.');
    expect(result.sound).toBe('Pop');
    expect(result.eventKey).toBe('sessionStarted');
  });

  it('builds sessionCompleted notification', () => {
    const result = buildNotification('sessionCompleted', messages, {});

    expect(result.title).toBe('\u2705 Claude Code');
    expect(result.message).toBe('Session completed.');
    expect(result.sound).toBe('Hero');
  });

  it('builds sessionError notification', () => {
    const result = buildNotification('sessionError', messages, {});

    expect(result.title).toBe('\u274C Claude Code');
    expect(result.message).toBe('An error occurred.');
    expect(result.sound).toBe('Basso');
  });

  it('builds sessionCompacted notification', () => {
    const result = buildNotification('sessionCompacted', messages, {});

    expect(result.title).toBe('\uD83D\uDCE6 Claude Code');
    expect(result.message).toBe('Session compacted.');
    expect(result.sound).toBe('Purr');
  });

  it('builds permissionRequested notification', () => {
    const result = buildNotification('permissionRequested', messages, {});

    expect(result.title).toBe('\uD83D\uDD10 Claude Code');
    expect(result.message).toBe('Permission requested.');
    expect(result.sound).toBe('Glass');
  });

  it('builds decisionNeeded notification using decisionRequired as question', () => {
    const result = buildNotification('decisionNeeded', messages, {});

    expect(result.title).toBe('\uD83D\uDE4B Claude Code');
    expect(result.message).toBe('Decision needed: Decision required.');
    expect(result.sound).toBe('Glass');
  });

  it('builds subagentStarted notification with agent_type from hook data', () => {
    const hookData: HookData = { agent_type: 'Explore' };
    const result = buildNotification('subagentStarted', messages, hookData);

    expect(result.title).toBe('\uD83E\uDD16 Claude Code');
    expect(result.message).toBe('Subagent started: Explore');
    expect(result.sound).toBe('Submarine');
  });

  it('builds subagentStarted notification with default description when agent_type is missing', () => {
    const result = buildNotification('subagentStarted', messages, {});

    expect(result.message).toBe('Subagent started: task delegation');
  });

  it('builds subagentCompleted notification', () => {
    const result = buildNotification('subagentCompleted', messages, {});

    expect(result.title).toBe('\uD83E\uDD16 Claude Code');
    expect(result.message).toBe('Subagent task completed.');
    expect(result.sound).toBe('Hero');
  });

  it('builds toolExecuting notification with tool_name from hook data', () => {
    const hookData: HookData = { tool_name: 'mcp__notion__search' };
    const result = buildNotification('toolExecuting', messages, hookData);

    expect(result.title).toBe('\uD83D\uDD27 Claude Code');
    expect(result.message).toBe('notion__search executing...');
    expect(result.sound).toBe('Tink');
  });

  it('builds toolCompleted notification with tool_name from hook data', () => {
    const hookData: HookData = { tool_name: 'mcp__slack__send' };
    const result = buildNotification('toolCompleted', messages, hookData);

    expect(result.title).toBe('\u2713 Claude Code');
    expect(result.message).toBe('slack__send completed.');
    expect(result.sound).toBe('Blow');
  });

  it('uses default tool name when tool_name is missing', () => {
    const result = buildNotification('toolExecuting', messages, {});

    expect(result.message).toBe('tool executing...');
  });

  it('strips mcp__ prefix from tool name', () => {
    const hookData: HookData = { tool_name: 'mcp__server__action' };
    const result = buildNotification('toolCompleted', messages, hookData);

    expect(result.message).toBe('server__action completed.');
  });
});

describe('shouldSendNotification', () => {
  it('skips decisionNeeded when notification_type is idle_prompt', () => {
    const hookData: HookData = { notification_type: 'idle_prompt' };

    expect(shouldSendNotification('decisionNeeded', hookData)).toBe(false);
  });

  it('allows decisionNeeded when notification_type is elicitation_dialog', () => {
    const hookData: HookData = { notification_type: 'elicitation_dialog' };

    expect(shouldSendNotification('decisionNeeded', hookData)).toBe(true);
  });

  it('allows decisionNeeded when notification_type is permission_prompt', () => {
    const hookData: HookData = { notification_type: 'permission_prompt' };

    expect(shouldSendNotification('decisionNeeded', hookData)).toBe(true);
  });

  it('allows decisionNeeded when notification_type is missing', () => {
    const hookData: HookData = {};

    expect(shouldSendNotification('decisionNeeded', hookData)).toBe(true);
  });

  it('allows decisionNeeded when notification_type is not a string', () => {
    const hookData: HookData = { notification_type: undefined };

    expect(shouldSendNotification('decisionNeeded', hookData)).toBe(true);
  });

  it.each<EventKey>([
    'sessionStarted',
    'sessionCompleted',
    'sessionError',
    'sessionCompacted',
    'permissionRequested',
    'subagentStarted',
    'subagentCompleted',
    'toolExecuting',
    'toolCompleted',
  ])('always allows %s even when notification_type is idle_prompt', (eventKey) => {
    const hookData: HookData = { notification_type: 'idle_prompt' };

    expect(shouldSendNotification(eventKey, hookData)).toBe(true);
  });
});
