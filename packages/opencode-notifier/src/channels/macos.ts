import { spawn } from 'node:child_process';

import type { NotificationChannel } from '../types.js';

export function createMacOSChannel(context: string, icon: string): NotificationChannel {
  return {
    type: 'macos',
    send({ title, message, sound = 'default' }) {
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
        // Ignore terminal-notifier execution failures
      }
    },
  };
}
