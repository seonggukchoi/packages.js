import type { Messages, NotifyFunction } from '../types.js';

export function createEventHandler(notify: NotifyFunction, messages: Messages) {
  return async ({ event }: { event: { type: string; properties?: Record<string, unknown> } }) => {
    switch (event.type) {
      case 'session.status': {
        const status = event.properties?.status as { type: string } | undefined;
        if (status?.type === 'busy') {
          notify('sessionStarted', '⚡ OpenCode', messages.sessionStarted, 'Pop');
        }
        break;
      }
      case 'session.idle':
        notify('sessionCompleted', '✅ OpenCode', messages.sessionCompleted, 'Hero');
        break;
      case 'session.error':
        notify('sessionError', '❌ OpenCode', messages.sessionError, 'Basso');
        break;
      case 'session.compacted':
        notify('sessionCompacted', '📦 OpenCode', messages.sessionCompacted, 'Purr');
        break;
      case 'permission.updated':
        notify('permissionChanged', '🔐 OpenCode', messages.permissionChanged, 'Glass');
        break;
      default:
        break;
    }
  };
}
