import type { EventKey, Messages, NotificationData } from '../types.js';

const EVENT_DEFS: Record<EventKey, { emoji: string; sound: string }> = {
  sessionStarted: { emoji: '⚡', sound: 'Pop' },
  sessionCompleted: { emoji: '✅', sound: 'Hero' },
  sessionError: { emoji: '❌', sound: 'Basso' },
  sessionCompacted: { emoji: '📦', sound: 'Purr' },
  permissionRequested: { emoji: '🔐', sound: 'Glass' },
  decisionNeeded: { emoji: '🙋', sound: 'Glass' },
  subagentStarted: { emoji: '🤖', sound: 'Submarine' },
  subagentCompleted: { emoji: '🤖', sound: 'Hero' },
  toolExecuting: { emoji: '🔧', sound: 'Tink' },
  toolCompleted: { emoji: '✓', sound: 'Blow' },
};

export interface NotificationDetail {
  question?: string;
  description?: string;
  toolName?: string;
}

export function buildNotification(eventKey: EventKey, messages: Messages, detail: NotificationDetail = {}): NotificationData {
  const def = EVENT_DEFS[eventKey];
  const title = `${def.emoji} OpenCode`;
  let message: string;

  switch (eventKey) {
    case 'decisionNeeded':
      message = messages.decisionNeeded(detail.question || messages.decisionRequired);
      break;
    case 'subagentStarted':
      message = messages.subagentStarted(detail.description || 'task delegation');
      break;
    case 'toolExecuting':
    case 'toolCompleted':
      message = messages[eventKey]((detail.toolName || 'tool').replace(/^mcp_/, ''));
      break;
    default:
      message = messages[eventKey] as string;
      break;
  }

  return { eventKey, title, message, sound: def.sound };
}
