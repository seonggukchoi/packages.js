import { spawn } from 'node:child_process';

export function sendNotification(context: string, icon: string, title: string, message: string, sound = 'default'): void {
  const fullMessage = `${context}: ${message}`;
  const args = ['-title', `"${title}"`, '-message', `"${fullMessage}"`, '-sound', `"${sound}"`];
  if (icon) {
    args.push('-contentImage', `"${icon}"`);
  }
  try {
    spawn('terminal-notifier', args, { detached: true, stdio: 'ignore' }).unref();
  } catch {
    // Ignore terminal-notifier execution failures
  }
}
