import { createDecorator } from '@toss/nestjs-aop';

import { ContextualLoggerDecoratorOptions } from './contextual-logger-decorator-options.interface';
import { CONTEXTUAL_LOGGER_DECORATOR } from './contextual-logger.constant';

export const ContextualLog = (
  level: ContextualLoggerDecoratorOptions['level'],
  message: ContextualLoggerDecoratorOptions['message'],
  options?: Omit<ContextualLoggerDecoratorOptions, 'level' | 'message'>,
) => createDecorator(CONTEXTUAL_LOGGER_DECORATOR, { level, message, ...options } satisfies ContextualLoggerDecoratorOptions);
