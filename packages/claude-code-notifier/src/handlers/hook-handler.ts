import type { EventKey, HookData, Messages } from '../types.js';

export interface NotificationData {
  eventKey: EventKey;
  title: string;
  message: string;
  sound: string;
}

const EVENT_DEFS: Record<EventKey, { emoji: string; sound: string }> = {
  sessionStarted: { emoji: '\u26A1', sound: 'Pop' },
  sessionCompleted: { emoji: '\u2705', sound: 'Hero' },
  sessionError: { emoji: '\u274C', sound: 'Basso' },
  sessionCompacted: { emoji: '\uD83D\uDCE6', sound: 'Purr' },
  permissionRequested: { emoji: '\uD83D\uDD10', sound: 'Glass' },
  decisionNeeded: { emoji: '\uD83D\uDE4B', sound: 'Glass' },
  subagentStarted: { emoji: '\uD83E\uDD16', sound: 'Submarine' },
  subagentCompleted: { emoji: '\uD83E\uDD16', sound: 'Hero' },
  toolExecuting: { emoji: '\uD83D\uDD27', sound: 'Tink' },
  toolCompleted: { emoji: '\u2713', sound: 'Blow' },
};

// Claude Code's `Notification` hook fires for several notification types. The
// `idle_prompt` type is known to fire whenever Claude finishes responding —
// even for normal completions — which duplicates the `Stop` hook's
// `sessionCompleted` notification. We skip it here so users don't get two
// alerts per turn. See anthropics/claude-code#12048.
const NOISY_NOTIFICATION_TYPES: ReadonlySet<string> = new Set(['idle_prompt']);

export function shouldSendNotification(eventKey: EventKey, hookData: HookData): boolean {
  if (eventKey !== 'decisionNeeded') {
    return true;
  }

  const notificationType = hookData.notification_type;
  if (typeof notificationType === 'string' && NOISY_NOTIFICATION_TYPES.has(notificationType)) {
    return false;
  }

  return true;
}

export function buildNotification(eventKey: EventKey, messages: Messages, hookData: HookData): NotificationData {
  const def = EVENT_DEFS[eventKey];
  const title = `${def.emoji} Claude Code`;
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
