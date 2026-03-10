import { ContextualLoggerLazyDecorator } from './contextual-logger.lazy-decorator';
import { ContextualLoggerService } from './contextual-logger.service';

describe('ContextualLoggerLazyDecorator', () => {
  let lazyDecorator: ContextualLoggerLazyDecorator;
  let mockLoggerService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockLoggerService = {
      verbose: vi.fn(),
      debug: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    };

    lazyDecorator = new ContextualLoggerLazyDecorator(mockLoggerService as unknown as ContextualLoggerService);
  });

  describe('wrap', () => {
    it('should call the wrapped method and return its result', async () => {
      const method = vi.fn().mockReturnValue('result');
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: { level: 'log', message: 'test' },
      });

      const result = await wrapped('arg1', 'arg2');

      expect(method).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('result');
    });

    it('should handle async methods', async () => {
      const method = vi.fn().mockResolvedValue('async-result');
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: { level: 'log', message: 'test' },
      });

      const result = await wrapped();

      expect(result).toBe('async-result');
    });

    it('should log when started if enableLoggingWhenStarted is true', async () => {
      const method = vi.fn().mockReturnValue('result');
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: { level: 'log', message: 'start test', enableLoggingWhenStarted: true },
      });

      await wrapped('arg1');

      expect(mockLoggerService.log).toHaveBeenCalledWith('start test', { parameters: ['arg1'] });
    });

    it('should not log when started if enableLoggingWhenStarted is false (default)', async () => {
      const method = vi.fn().mockReturnValue('result');
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: { level: 'log', message: 'test' },
      });

      await wrapped();

      // The default enableLoggingWhenStarted is false, so only the "ended" log should fire
      expect(mockLoggerService.log).toHaveBeenCalledTimes(1);
    });

    it('should log when ended with return value by default', async () => {
      const method = vi.fn().mockReturnValue('result');
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: { level: 'debug', message: 'end test' },
      });

      await wrapped('arg1');

      expect(mockLoggerService.debug).toHaveBeenCalledWith('end test', {
        parameters: ['arg1'],
        returnValue: 'result',
      });
    });

    it('should not log when ended if enableLoggingWhenEnded is false', async () => {
      const method = vi.fn().mockReturnValue('result');
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: { level: 'log', message: 'test', enableLoggingWhenEnded: false },
      });

      await wrapped();

      expect(mockLoggerService.log).not.toHaveBeenCalled();
    });

    it('should not include parameters if enableLoggingParameters is false', async () => {
      const method = vi.fn().mockReturnValue('result');
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: { level: 'log', message: 'test', enableLoggingParameters: false },
      });

      await wrapped('arg1');

      expect(mockLoggerService.log).toHaveBeenCalledWith('test', { returnValue: 'result' });
    });

    it('should not include return value if enableLoggingReturnValue is false', async () => {
      const method = vi.fn().mockReturnValue('result');
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: { level: 'log', message: 'test', enableLoggingReturnValue: false },
      });

      await wrapped('arg1');

      expect(mockLoggerService.log).toHaveBeenCalledWith('test', { parameters: ['arg1'] });
    });

    it('should log error and rethrow when async method rejects', async () => {
      const error = new Error('test error');
      const method = vi.fn().mockRejectedValue(error);
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: { level: 'log', message: 'error test' },
      });

      await expect(wrapped('arg1')).rejects.toThrow('test error');

      expect(mockLoggerService.error).toHaveBeenCalledWith('error test', error, { parameters: ['arg1'] });
    });

    it('should log error when sync method throws', async () => {
      const error = new Error('sync error');
      const method = vi.fn().mockImplementation(() => {
        throw error;
      });
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: { level: 'log', message: 'sync error test' },
      });

      await expect(wrapped()).rejects.toThrow('sync error');

      expect(mockLoggerService.error).toHaveBeenCalledWith('sync error test', error, { parameters: [] });
    });

    it('should not log error if enableLoggingError is false', async () => {
      const error = new Error('test error');
      const method = vi.fn().mockRejectedValue(error);
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: { level: 'log', message: 'test', enableLoggingError: false },
      });

      await expect(wrapped()).rejects.toThrow('test error');

      expect(mockLoggerService.error).not.toHaveBeenCalled();
    });

    it('should use the specified log level', async () => {
      const method = vi.fn().mockReturnValue('result');
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: { level: 'warn', message: 'warn test' },
      });

      await wrapped();

      expect(mockLoggerService.warn).toHaveBeenCalled();
    });

    it('should log both start and end when both are enabled', async () => {
      const method = vi.fn().mockReturnValue('result');
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: {
          level: 'log',
          message: 'both test',
          enableLoggingWhenStarted: true,
          enableLoggingWhenEnded: true,
        },
      });

      await wrapped('arg1');

      expect(mockLoggerService.log).toHaveBeenCalledTimes(2);
      expect(mockLoggerService.log).toHaveBeenNthCalledWith(1, 'both test', { parameters: ['arg1'] });
      expect(mockLoggerService.log).toHaveBeenNthCalledWith(2, 'both test', {
        parameters: ['arg1'],
        returnValue: 'result',
      });
    });

    it('should handle method with no arguments', async () => {
      const method = vi.fn().mockReturnValue('result');
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: { level: 'log', message: 'no args' },
      });

      await wrapped();

      expect(mockLoggerService.log).toHaveBeenCalledWith('no args', { parameters: [], returnValue: 'result' });
    });

    it('should not log start parameters when enableLoggingParameters is false and enableLoggingWhenStarted is true', async () => {
      const method = vi.fn().mockReturnValue('result');
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: {
          level: 'log',
          message: 'test',
          enableLoggingWhenStarted: true,
          enableLoggingParameters: false,
        },
      });

      await wrapped('arg1');

      expect(mockLoggerService.log).toHaveBeenNthCalledWith(1, 'test', {});
    });

    it('should not log error parameters when enableLoggingParameters is false', async () => {
      const error = new Error('test error');
      const method = vi.fn().mockRejectedValue(error);
      const wrapped = lazyDecorator.wrap({
        instance: {},
        methodName: 'testMethod',
        method,
        metadata: { level: 'log', message: 'test', enableLoggingParameters: false },
      });

      await expect(wrapped('arg1')).rejects.toThrow('test error');

      expect(mockLoggerService.error).toHaveBeenCalledWith('test', error, {});
    });
  });
});
