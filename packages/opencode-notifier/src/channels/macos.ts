import { spawn } from 'node:child_process';

import type { NotificationChannel } from '../types.js';

// The context is taken per send rather than at creation: the plugin lives as long as the OpenCode
// server, and the session a notification belongs to is only known when the event arrives.
export function createMacOSChannel(icon: string): NotificationChannel {
  return {
    type: 'macos',
    send({ title, message, context, sound = 'default' }) {
      const fullMessage = `${context}: ${message}`;
      const args = ['-title', `"${title}"`, '-message', `"${fullMessage}"`, '-sound', `"${sound}"`];
      if (icon) {
        args.push('-contentImage', `"${icon}"`);
      }
      try {
        const child = spawn('terminal-notifier', args, { detached: true, stdio: 'ignore' });
        child.on('error', () => {});
        child.unref();
      } catch {
        // Ignore terminal-notifier synchronous execution failures
      }
    },
  };
}
