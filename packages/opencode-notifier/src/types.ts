export type Locale = 'en' | 'ko';

export type EventKey =
  | 'sessionStarted'
  | 'sessionCompleted'
  | 'sessionError'
  | 'sessionCompacted'
  | 'permissionRequested'
  | 'decisionNeeded'
  | 'subagentStarted'
  | 'subagentCompleted'
  | 'toolExecuting'
  | 'toolCompleted';

export interface EventOptions {
  enabled: boolean;
  message?: string;
}

export interface NotifierConfig {
  locale: Locale;
  events: Record<EventKey, EventOptions>;
}

export interface Messages {
  sessionStarted: string;
  sessionCompleted: string;
  sessionError: string;
  sessionCompacted: string;
  permissionRequested: string;
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

export type NotifyFunction = (eventKey: EventKey, title: string, message: string, sound?: string) => void;
