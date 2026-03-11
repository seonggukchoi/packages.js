import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CACHE_DIR = join(homedir(), '.cache', 'opencode', 'icons');

const APP_ICONS: Record<string, string> = {
  iTerm2: '/Applications/iTerm.app/Contents/Resources/iTerm2 App Icon for Release.icns',
  Cursor: '/Applications/Cursor.app/Contents/Resources/Cursor.icns',
  'VS Code': '/Applications/Visual Studio Code.app/Contents/Resources/Code.icns',
  Zed: '/Applications/Zed.app/Contents/Resources/Zed.icns',
  'Terminal.app': '/System/Applications/Utilities/Terminal.app/Contents/Resources/Terminal.icns',
  Warp: '/Applications/Warp.app/Contents/Resources/AppIcon.icns',
  Hyper: '/Applications/Hyper.app/Contents/Resources/Hyper.icns',
};

function getPngPath(app: string): string {
  return join(CACHE_DIR, `${app.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
}

export function ensureIconCache(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  for (const [app, icnsPath] of Object.entries(APP_ICONS)) {
    const pngPath = getPngPath(app);
    if (!existsSync(pngPath) && existsSync(icnsPath)) {
      try {
        execSync(`sips -s format png "${icnsPath}" --out "${pngPath}" 2>/dev/null`);
      } catch {
        // Ignore icon conversion failures
      }
    }
  }
}

export function getPngIcon(app: string): string {
  const pngPath = getPngPath(app);
  return existsSync(pngPath) ? pngPath : '';
}
