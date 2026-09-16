import type { EventKey, HookData, Messages } from '../types.js';

export interface NotificationData {
  eventKey: EventKey;
  title: string;
  message: string;
  sound: string;
}

const NOTIFICATION_TITLE = 'Codex';

const EVENT_DEFS: Record<EventKey, { emoji: string; sound: string }> = {
  sessionStarted: { emoji: '⚡', sound: 'Pop' },
  sessionCompleted: { emoji: '✅', sound: 'Hero' },
  sessionInterrupted: { emoji: '⏹️', sound: 'Funk' },
  sessionCompacted: { emoji: '📦', sound: 'Purr' },
  permissionRequested: { emoji: '🔐', sound: 'Glass' },
  decisionNeeded: { emoji: '🙋', sound: 'Glass' },
  subagentStarted: { emoji: '🤖', sound: 'Submarine' },
  subagentCompleted: { emoji: '🤖', sound: 'Hero' },
  toolExecuting: { emoji: '🔧', sound: 'Tink' },
  toolCompleted: { emoji: '✓', sound: 'Blow' },
};

export function buildNotification(eventKey: EventKey, messages: Messages, hookData: HookData): NotificationData {
  const def = EVENT_DEFS[eventKey];
  const title = `${def.emoji} ${NOTIFICATION_TITLE}`;
  let message: string;

  switch (eventKey) {
    case 'decisionNeeded':
      message = messages.decisionNeeded(messages.decisionRequired);
      break;
    case 'subagentStarted':
      message = messages.subagentStarted(hookData.agent_type || 'task delegation');
      break;
    case 'toolExecuting':
    case 'toolCompleted':
      message = messages[eventKey]((hookData.tool_name || 'tool').replace(/^mcp__/, ''));
      break;
    default:
      message = messages[eventKey] as string;
      break;
  }

  return { eventKey, title, message, sound: def.sound };
}
