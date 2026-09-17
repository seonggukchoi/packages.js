import { buildNotification } from './notification.js';

import type { SessionEvent, SessionRegistry } from '../session.js';
import type { EventKey, Messages, NotifyFunction } from '../types.js';

// Session lifecycle events fire for subagent sessions as well, since the task tool runs each
// subagent in a child session. Those are reported through the task tool hooks instead, so they are
// skipped here to keep one notification per delegation, the way Claude Code separates its
// SessionStart/Stop hooks from SubagentStart/SubagentStop.
const MAIN_SESSION_EVENT_KEYS: ReadonlySet<EventKey> = new Set<EventKey>([
  'sessionStarted',
  'sessionCompleted',
  'sessionError',
  'sessionCompacted',
]);

function resolveEventKey(event: SessionEvent): EventKey | undefined {
  switch (event.type) {
    case 'session.status': {
      const status = event.properties?.status as { type?: string } | undefined;
      return status?.type === 'busy' ? 'sessionStarted' : undefined;
    }
    case 'session.idle':
      return 'sessionCompleted';
    case 'session.error':
      return 'sessionError';
    case 'session.compacted':
      return 'sessionCompacted';
    case 'permission.asked':
      return 'permissionRequested';
    default:
      return undefined;
  }
}

export function createEventHandler(notify: NotifyFunction, messages: Messages, sessions: SessionRegistry) {
  return async ({ event }: { event: SessionEvent }): Promise<void> => {
    sessions.observe(event);

    const eventKey = resolveEventKey(event);
    if (!eventKey) {
      return;
    }

    const sessionID = typeof event.properties?.sessionID === 'string' ? event.properties.sessionID : undefined;
    if (MAIN_SESSION_EVENT_KEYS.has(eventKey) && (await sessions.isChildSession(sessionID))) {
      return;
    }

    const context = await sessions.resolveContext(sessionID);
    notify(buildNotification(eventKey, messages), context);
  };
}
