export type Locale = 'en' | 'ko';

export interface NotifierConfig {
  locale: Locale;
}

export interface Messages {
  sessionStarted: string;
  sessionCompleted: string;
  sessionError: string;
  sessionCompacted: string;
  permissionChanged: string;
  decisionRequired: string;
  decisionNeeded: (question: string) => string;
  subagentStarted: (description: string) => string;
  subagentCompleted: string;
  toolExecuting: (toolName: string) => string;
  toolCompleted: (toolName: string) => string;
}

export interface TerminalInfo {
  app: string;
  projectName: string;
  icon: string;
}

export type NotifyFunction = (title: string, message: string, sound?: string) => void;
