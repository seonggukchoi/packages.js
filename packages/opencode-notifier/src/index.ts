import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { Plugin } from '@opencode-ai/plugin';

const CACHE_DIR = join(homedir(), '.cache', 'opencode', 'icons');

const APP_ICONS: Record<string, string> = {
  iTerm2: '/Applications/iTerm.app/Contents/Resources/iTerm2 App Icon for Release.icns',
  Cursor: '/Applications/Cursor.app/Contents/Resources/Cursor.icns',
  'VS Code': '/Applications/Visual Studio Code.app/Contents/Resources/Code.icns',
  'Terminal.app': '/System/Applications/Utilities/Terminal.app/Contents/Resources/Terminal.icns',
  Warp: '/Applications/Warp.app/Contents/Resources/AppIcon.icns',
  Hyper: '/Applications/Hyper.app/Contents/Resources/Hyper.icns',
};

interface TerminalInfo {
  app: string;
  projectName: string;
  icon: string;
}

function getPngPath(app: string): string {
  return join(CACHE_DIR, `${app.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
}

function ensureIconCache(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  for (const [app, icnsPath] of Object.entries(APP_ICONS)) {
    const pngPath = getPngPath(app);
    if (!existsSync(pngPath) && existsSync(icnsPath)) {
      try {
        execSync(`sips -s format png "${icnsPath}" --out "${pngPath}" 2>/dev/null`);
      } catch {
        // 아이콘 변환 실패 무시
      }
    }
  }
}

function getPngIcon(app: string): string {
  const pngPath = getPngPath(app);
  return existsSync(pngPath) ? pngPath : '';
}

function getTerminalInfo(directory: string): TerminalInfo {
  const termProgram = process.env.TERM_PROGRAM || '';
  const itermSession = process.env.ITERM_SESSION_ID;
  const cursorEditor = process.env.CURSOR_EDITOR || process.env.VSCODE_GIT_IPC_HANDLE;

  let app = 'Terminal.app';
  if (itermSession) {
    app = 'iTerm2';
  } else if (cursorEditor || termProgram.toLowerCase().includes('cursor')) {
    app = 'Cursor';
  } else if (termProgram === 'vscode' || process.env.VSCODE_GIT_IPC_HANDLE) {
    app = 'VS Code';
  } else if (termProgram === 'Apple_Terminal') {
    app = 'Terminal.app';
  } else if (termProgram === 'WarpTerminal') {
    app = 'Warp';
  } else if (termProgram === 'Hyper') {
    app = 'Hyper';
  }

  const projectPath = directory || process.cwd();
  const projectName = projectPath.split('/').pop() || projectPath;
  const icon = getPngIcon(app);

  return { app, projectName, icon };
}

function sendNotification(context: string, icon: string, title: string, message: string, sound = 'default'): void {
  const fullMessage = `${context}: ${message}`;
  const args = ['-title', title, '-message', fullMessage, '-sound', sound];
  if (icon) {
    args.push('-contentImage', icon);
  }
  try {
    spawn('terminal-notifier', args, { detached: true, stdio: 'ignore' }).unref();
  } catch {
    // terminal-notifier 실행 실패 무시
  }
}

export const OpencodeNotifier: Plugin = async ({ directory }) => {
  ensureIconCache();

  const termInfo = getTerminalInfo(directory);
  const context = `[${termInfo.app}] ${termInfo.projectName}`;

  const notify = (title: string, message: string, sound?: string): void => {
    sendNotification(context, termInfo.icon, title, message, sound);
  };

  return {
    event: async ({ event }) => {
      switch (event.type) {
        case 'session.status': {
          if (event.properties.status.type === 'busy') {
            notify('⚡ OpenCode', '작업을 시작했습니다.', 'Pop');
          }
          break;
        }
        case 'session.idle':
          notify('✅ OpenCode', '작업이 완료되었습니다.', 'Hero');
          break;
        case 'session.error':
          notify('❌ OpenCode', '오류가 발생했습니다.', 'Basso');
          break;
        case 'session.compacted':
          notify('📦 OpenCode', '세션이 압축되었습니다.', 'Purr');
          break;
        case 'permission.updated':
          notify('🔐 OpenCode', '권한이 변경되었습니다.', 'Glass');
          break;
        default:
          break;
      }
    },

    'tool.execute.before': async (input, output) => {
      const toolName = ((input as Record<string, unknown>).tool as string) || '도구';
      const args = ((output as Record<string, unknown>).args as Record<string, unknown>) || {};

      if (toolName === 'question') {
        const questions = (args.questions as Array<{ question?: string }>) || [];
        const firstQ = questions[0]?.question || '결정이 필요합니다';
        notify('🙋 OpenCode', `결정 필요: ${firstQ}`, 'Glass');
      } else if (toolName.toLowerCase() === 'task') {
        notify('🤖 OpenCode', `서브에이전트 시작: ${(args.description as string) || '작업 위임'}`, 'Submarine');
      } else if (toolName.startsWith('mcp_')) {
        notify('🔧 OpenCode', `${toolName.replace('mcp_', '')} 실행 중...`, 'Tink');
      }
    },

    'tool.execute.after': async (input) => {
      const toolName = ((input as Record<string, unknown>).tool as string) || '도구';
      if (toolName.toLowerCase() === 'task') {
        notify('🤖 OpenCode', '서브에이전트 작업 완료', 'Hero');
      } else if (toolName.startsWith('mcp_')) {
        notify('✓ OpenCode', `${toolName.replace('mcp_', '')} 실행 완료`, 'Blow');
      }
    },
  };
};
