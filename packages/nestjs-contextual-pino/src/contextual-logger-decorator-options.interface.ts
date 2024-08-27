import { ContextualLoggerService } from './contextual-logger.service';

export interface ContextualLoggerDecoratorOptions {
  /**
   * @description The method name of the logger service.
   */
  level: keyof ContextualLoggerService;

  /**
   * @description The message to log.
   */
  message: string;

  /**
   * @description If true, logging parameters will be enabled.
   * @default true
   */
  enableLoggingParameters?: boolean;

  /**
   * @description If true, logging return value will be enabled.
   * @default true
   */
  enableLoggingReturnValue?: boolean;

  /**
   * @description If true, method start logging will be enabled.
   * @default false
   */
  enableLoggingWhenStarted?: boolean;

  /**
   * @description If true, method end logging will be enabled.
   * @default true
   */
  enableLoggingWhenEnded?: boolean;

  /**
   * @description If true, error logging will be enabled.
   * @default true
   */
  enableLoggingError?: boolean;
}
