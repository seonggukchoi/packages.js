import { createDecorator } from '@toss/nestjs-aop';

import { CONTEXTUAL_LOGGER_DECORATOR } from './contextual-logger.constant';
import { ContextualLog } from './contextual-logger.decorator';

vi.mock('@toss/nestjs-aop', () => ({
  createDecorator: vi.fn(() => 'mocked-decorator'),
}));

describe('ContextualLog', () => {
  it('should call createDecorator with CONTEXTUAL_LOGGER_DECORATOR symbol and merged options', () => {
    const result = ContextualLog('log', 'test message', {
      enableLoggingParameters: false,
      enableLoggingReturnValue: false,
    });

    expect(createDecorator).toHaveBeenCalledWith(CONTEXTUAL_LOGGER_DECORATOR, {
      level: 'log',
      message: 'test message',
      enableLoggingParameters: false,
      enableLoggingReturnValue: false,
    });
    expect(result).toBe('mocked-decorator');
  });

  it('should call createDecorator with only level and message when no options provided', () => {
    ContextualLog('error', 'error message');

    expect(createDecorator).toHaveBeenCalledWith(CONTEXTUAL_LOGGER_DECORATOR, {
      level: 'error',
      message: 'error message',
    });
  });

  it('should pass all optional fields when provided', () => {
    ContextualLog('debug', 'debug message', {
      enableLoggingParameters: true,
      enableLoggingReturnValue: true,
      enableLoggingWhenStarted: true,
      enableLoggingWhenEnded: false,
      enableLoggingError: false,
    });

    expect(createDecorator).toHaveBeenCalledWith(CONTEXTUAL_LOGGER_DECORATOR, {
      level: 'debug',
      message: 'debug message',
      enableLoggingParameters: true,
      enableLoggingReturnValue: true,
      enableLoggingWhenStarted: true,
      enableLoggingWhenEnded: false,
      enableLoggingError: false,
    });
  });
});
