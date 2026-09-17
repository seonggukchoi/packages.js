import { createEventHandler } from './event-handler.js';

import type { SessionRegistry } from '../session.js';
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

function createMockSessions(childSessions: string[] = []) {
  return {
    observe: vi.fn(),
    isChildSession: vi.fn(async (sessionID?: string) => childSessions.includes(sessionID ?? '')),
    resolveContext: vi.fn(async (sessionID?: string) => (sessionID ? `ctx:${sessionID}` : 'ctx:none')),
  } satisfies SessionRegistry;
}

describe('createEventHandler', () => {
  let notify: NotifyFunction;
  let sessions: ReturnType<typeof createMockSessions>;
  let handler: ReturnType<typeof createEventHandler>;

  beforeEach(() => {
    notify = vi.fn();
    sessions = createMockSessions(['child']);
    handler = createEventHandler(notify, createMockMessages(), sessions);
  });

  it('feeds every event to the session registry', async () => {
    const event = { type: 'session.updated', properties: { info: { id: 's1', title: 'T' } } };

    await handler({ event });

    expect(sessions.observe).toHaveBeenCalledWith(event);
    expect(notify).not.toHaveBeenCalled();
  });

  it('handles session.status with busy status', async () => {
    await handler({ event: { type: 'session.status', properties: { sessionID: 's1', status: { type: 'busy' } } } });

    expect(notify).toHaveBeenCalledWith(
      { eventKey: 'sessionStarted', title: '⚡ OpenCode', message: 'Session started.', sound: 'Pop' },
      'ctx:s1',
    );
  });

  it('handles session.idle', async () => {
    await handler({ event: { type: 'session.idle', properties: { sessionID: 's1' } } });

    expect(notify).toHaveBeenCalledWith(
      { eventKey: 'sessionCompleted', title: '✅ OpenCode', message: 'Session completed.', sound: 'Hero' },
      'ctx:s1',
    );
  });

  it('handles session.error, including one without a session id', async () => {
    await handler({ event: { type: 'session.error' } });

    expect(notify).toHaveBeenCalledWith(
      { eventKey: 'sessionError', title: '❌ OpenCode', message: 'An error occurred.', sound: 'Basso' },
      'ctx:none',
    );
  });

  it('handles session.compacted', async () => {
    await handler({ event: { type: 'session.compacted', properties: { sessionID: 's1' } } });

    expect(notify).toHaveBeenCalledWith(
      { eventKey: 'sessionCompacted', title: '📦 OpenCode', message: 'Session compacted.', sound: 'Purr' },
      'ctx:s1',
    );
  });

  it('handles permission.asked', async () => {
    await handler({ event: { type: 'permission.asked', properties: { sessionID: 's1' } } });

    expect(notify).toHaveBeenCalledWith(
      { eventKey: 'permissionRequested', title: '🔐 OpenCode', message: 'Permission requested.', sound: 'Glass' },
      'ctx:s1',
    );
  });

  it.each(['session.status', 'session.idle', 'session.error', 'session.compacted'])('skips %s from a subagent session', async (type) => {
    await handler({ event: { type, properties: { sessionID: 'child', status: { type: 'busy' } } } });

    expect(notify).not.toHaveBeenCalled();
  });

  it('still reports permission.asked from a subagent session', async () => {
    await handler({ event: { type: 'permission.asked', properties: { sessionID: 'child' } } });

    expect(notify).toHaveBeenCalledTimes(1);
    expect(sessions.isChildSession).not.toHaveBeenCalled();
  });

  it('ignores unknown event types', async () => {
    await handler({ event: { type: 'unknown.event' } });

    expect(notify).not.toHaveBeenCalled();
  });

  it('handles session.status without busy status', async () => {
    await handler({ event: { type: 'session.status', properties: { sessionID: 's1', status: { type: 'idle' } } } });
    await handler({ event: { type: 'session.status', properties: { sessionID: 's1' } } });

    expect(notify).not.toHaveBeenCalled();
  });
});
