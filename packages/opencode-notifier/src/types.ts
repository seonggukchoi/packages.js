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

// --- Channel types ---

export interface NotificationChannel {
  readonly type: string;
  send(params: { title: string; message: string; context: string; icon?: string; sound?: string }): void | Promise<void>;
}

export interface ChannelConfig {
  enabled: boolean;
  events?: Partial<Record<EventKey, EventOptions>>;
}

export type MacOSChannelConfig = ChannelConfig;

export interface TelegramChannelConfig extends ChannelConfig {
  botToken: string;
  chatId: string;
}

export interface ChannelsConfig {
  macos?: MacOSChannelConfig;
  telegram?: TelegramChannelConfig;
}

export interface ChannelEntry {
  channel: NotificationChannel;
  events: Record<EventKey, EventOptions>;
}

// --- Config ---

export interface NotifierConfig {
  locale: Locale;
  events: Record<EventKey, EventOptions>;
  channels: ChannelsConfig;
}

// --- Messages ---

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
