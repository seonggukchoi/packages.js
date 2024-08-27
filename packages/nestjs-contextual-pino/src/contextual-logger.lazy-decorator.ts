import { Aspect, LazyDecorator, WrapParams } from '@toss/nestjs-aop';

import { ContextualLoggerDecoratorOptions } from './contextual-logger-decorator-options.interface';
import { CONTEXTUAL_LOGGER_DECORATOR } from './contextual-logger.constant';
import { ContextualLoggerService } from './contextual-logger.service';

type Method = (...args: unknown[]) => unknown;

@Aspect(CONTEXTUAL_LOGGER_DECORATOR)
export class ContextualLoggerLazyDecorator implements LazyDecorator<Method, ContextualLoggerDecoratorOptions> {
  constructor(private readonly contextualLoggerService: ContextualLoggerService) {}

  public wrap({
    method,
    metadata: {
      level,
      message,
      enableLoggingParameters = true,
      enableLoggingReturnValue = true,
      enableLoggingWhenStarted = false,
      enableLoggingWhenEnded = true,
      enableLoggingError = true,
    },
  }: WrapParams<Method, ContextualLoggerDecoratorOptions>) {
    return async (...args: unknown[]) => {
      const parameters = enableLoggingParameters && { parameters: args };

      if (enableLoggingWhenStarted) {
        this.contextualLoggerService[level](message, { ...parameters });
      }

      const returnValue = await this.wrapInPromise(method, ...args).catch((error: unknown) => {
        if (enableLoggingError) {
          this.contextualLoggerService.error(message, error, { ...parameters });
        }

        throw error;
      });

      if (enableLoggingWhenEnded) {
        this.contextualLoggerService[level](message, { ...parameters, ...(enableLoggingReturnValue && { returnValue }) });
      }

      return returnValue;
    };
  }

  private async wrapInPromise(method: Method, ...args: unknown[]): Promise<unknown> {
    let result = method(...args);

    if (result instanceof Promise) {
      result = await result;
    }

    return result;
  }
}
