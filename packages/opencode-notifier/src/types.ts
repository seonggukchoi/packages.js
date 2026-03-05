export interface TerminalInfo {
  app: string;
  projectName: string;
  icon: string;
}

export type NotifyFunction = (title: string, message: string, sound?: string) => void;
