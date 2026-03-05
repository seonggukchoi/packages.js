import { getPngIcon } from './icon.js';

import type { TerminalInfo } from './types.js';

export function detectTerminal(directory: string): TerminalInfo {
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
