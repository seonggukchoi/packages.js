import { createEventHandler } from './event-handler.js';

import type { Messages, NotifyFunction } from '../types.js';

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

describe('createEventHandler', () => {
  let notify: NotifyFunction;
  let handler: ReturnType<typeof createEventHandler>;

  beforeEach(() => {
    notify = vi.fn();
    handler = createEventHandler(notify, createMockMessages());
  });

  it('handles session.status with busy status', async () => {
    await handler({ event: { type: 'session.status', properties: { status: { type: 'busy' } } } });

    expect(notify).toHaveBeenCalledWith('sessionStarted', '⚡ OpenCode', 'Session started.', 'Pop');
  });

  it('handles session.idle', async () => {
    await handler({ event: { type: 'session.idle' } });

    expect(notify).toHaveBeenCalledWith('sessionCompleted', '✅ OpenCode', 'Session completed.', 'Hero');
  });

  it('handles session.error', async () => {
    await handler({ event: { type: 'session.error' } });

    expect(notify).toHaveBeenCalledWith('sessionError', '❌ OpenCode', 'An error occurred.', 'Basso');
  });

  it('handles session.compacted', async () => {
    await handler({ event: { type: 'session.compacted' } });

    expect(notify).toHaveBeenCalledWith('sessionCompacted', '📦 OpenCode', 'Session compacted.', 'Purr');
  });

  it('handles permission.asked', async () => {
    await handler({ event: { type: 'permission.asked' } });

    expect(notify).toHaveBeenCalledWith('permissionRequested', '🔐 OpenCode', 'Permission requested.', 'Glass');
  });

  it('ignores unknown event types', async () => {
    await handler({ event: { type: 'unknown.event' } });

    expect(notify).not.toHaveBeenCalled();
  });

  it('handles session.status without busy status', async () => {
    await handler({ event: { type: 'session.status', properties: { status: { type: 'idle' } } } });

    expect(notify).not.toHaveBeenCalled();
  });
});
