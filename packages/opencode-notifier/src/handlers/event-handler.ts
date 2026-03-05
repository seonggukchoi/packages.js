import type { Messages, NotifyFunction } from '../types.js';

export function createEventHandler(notify: NotifyFunction, messages: Messages) {
  return async ({ event }: { event: { type: string; properties?: Record<string, unknown> } }) => {
    switch (event.type) {
      case 'session.status': {
        const status = event.properties?.status as { type: string } | undefined;
        if (status?.type === 'busy') {
          notify('⚡ OpenCode', messages.sessionStarted, 'Pop');
        }
        break;
      }
      case 'session.idle':
        notify('✅ OpenCode', messages.sessionCompleted, 'Hero');
        break;
      case 'session.error':
        notify('❌ OpenCode', messages.sessionError, 'Basso');
        break;
      case 'session.compacted':
        notify('📦 OpenCode', messages.sessionCompacted, 'Purr');
        break;
      case 'permission.updated':
        notify('🔐 OpenCode', messages.permissionChanged, 'Glass');
        break;
      default:
        break;
    }
  };
}
