import type { NotifyFunction } from '../types.js';

export function createEventHandler(notify: NotifyFunction) {
  return async ({ event }: { event: { type: string; properties?: Record<string, unknown> } }) => {
    switch (event.type) {
      case 'session.status': {
        const status = event.properties?.status as { type: string } | undefined;
        if (status?.type === 'busy') {
          notify('⚡ OpenCode', 'Session started.', 'Pop');
        }
        break;
      }
      case 'session.idle':
        notify('✅ OpenCode', 'Session completed.', 'Hero');
        break;
      case 'session.error':
        notify('❌ OpenCode', 'An error occurred.', 'Basso');
        break;
      case 'session.compacted':
        notify('📦 OpenCode', 'Session compacted.', 'Purr');
        break;
      case 'permission.updated':
        notify('🔐 OpenCode', 'Permission changed.', 'Glass');
        break;
      default:
        break;
    }
  };
}
