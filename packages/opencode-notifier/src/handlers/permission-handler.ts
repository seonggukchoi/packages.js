import type { Messages, NotifyFunction } from '../types.js';

export function createPermissionHandler(notify: NotifyFunction, messages: Messages) {
  return async () => {
    notify('permissionRequested', '🔐 OpenCode', messages.permissionRequested, 'Glass');
  };
}
