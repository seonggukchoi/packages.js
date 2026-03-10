import { ClsService } from 'nestjs-cls';
import { Logger, PinoLogger } from 'nestjs-pino';

import { ContextualLoggerService } from './contextual-logger.service';

describe('ContextualLoggerService', () => {
  let service: ContextualLoggerService;
  let mockClsService: { getId: ReturnType<typeof vi.fn> };
  let mockPinoLogger: PinoLogger;

  beforeEach(() => {
    mockClsService = {
      getId: vi.fn(),
    };

    mockPinoLogger = {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      setContext: vi.fn(),
      isLevelEnabled: vi.fn().mockReturnValue(true),
    } as unknown as PinoLogger;

    const params = {};

    service = new ContextualLoggerService(mockPinoLogger, params, mockClsService as unknown as ClsService);
  });

  describe('verbose', () => {
    it('should call super.verbose with contextId and data when both exist', () => {
      mockClsService.getId.mockReturnValue('ctx-123');
      const superVerboseSpy = vi.spyOn(Logger.prototype, 'verbose');

      service.verbose('test message', { key: 'value' });

      expect(superVerboseSpy).toHaveBeenCalledWith('test message', {
        contextId: 'ctx-123',
        data: { key: 'value' },
      });
    });

    it('should call super.verbose without contextId when clsService.getId returns undefined', () => {
      mockClsService.getId.mockReturnValue(undefined);
      const superVerboseSpy = vi.spyOn(Logger.prototype, 'verbose');

      service.verbose('test message', { key: 'value' });

      expect(superVerboseSpy).toHaveBeenCalledWith('test message', { data: { key: 'value' } });
    });

    it('should call super.verbose without data when data is not provided', () => {
      mockClsService.getId.mockReturnValue('ctx-123');
      const superVerboseSpy = vi.spyOn(Logger.prototype, 'verbose');

      service.verbose('test message');

      expect(superVerboseSpy).toHaveBeenCalledWith('test message', { contextId: 'ctx-123' });
    });

    it('should call super.verbose with empty object when no contextId and no data', () => {
      mockClsService.getId.mockReturnValue(undefined);
      const superVerboseSpy = vi.spyOn(Logger.prototype, 'verbose');

      service.verbose('test message');

      expect(superVerboseSpy).toHaveBeenCalledWith('test message', {});
    });
  });

  describe('debug', () => {
    it('should call super.debug with contextId and data', () => {
      mockClsService.getId.mockReturnValue('ctx-456');
      const superDebugSpy = vi.spyOn(Logger.prototype, 'debug');

      service.debug('debug message', { foo: 'bar' });

      expect(superDebugSpy).toHaveBeenCalledWith('debug message', {
        contextId: 'ctx-456',
        data: { foo: 'bar' },
      });
    });

    it('should call super.debug without contextId when not available', () => {
      mockClsService.getId.mockReturnValue(undefined);
      const superDebugSpy = vi.spyOn(Logger.prototype, 'debug');

      service.debug('debug message');

      expect(superDebugSpy).toHaveBeenCalledWith('debug message', {});
    });
  });

  describe('log', () => {
    it('should call super.log with contextId and data', () => {
      mockClsService.getId.mockReturnValue('ctx-789');
      const superLogSpy = vi.spyOn(Logger.prototype, 'log');

      service.log('log message', { data: 'test' });

      expect(superLogSpy).toHaveBeenCalledWith('log message', {
        contextId: 'ctx-789',
        data: { data: 'test' },
      });
    });

    it('should call super.log without data when not provided', () => {
      mockClsService.getId.mockReturnValue('ctx-789');
      const superLogSpy = vi.spyOn(Logger.prototype, 'log');

      service.log('log message');

      expect(superLogSpy).toHaveBeenCalledWith('log message', { contextId: 'ctx-789' });
    });
  });

  describe('warn', () => {
    it('should call super.warn with contextId and data', () => {
      mockClsService.getId.mockReturnValue('ctx-warn');
      const superWarnSpy = vi.spyOn(Logger.prototype, 'warn');

      service.warn('warn message', { warning: true });

      expect(superWarnSpy).toHaveBeenCalledWith('warn message', {
        contextId: 'ctx-warn',
        data: { warning: true },
      });
    });

    it('should call super.warn without contextId when not available', () => {
      mockClsService.getId.mockReturnValue(undefined);
      const superWarnSpy = vi.spyOn(Logger.prototype, 'warn');

      service.warn('warn message');

      expect(superWarnSpy).toHaveBeenCalledWith('warn message', {});
    });
  });

  describe('error', () => {
    it('should call super.error with parsed Error object, contextId, and data', () => {
      mockClsService.getId.mockReturnValue('ctx-err');
      const superErrorSpy = vi.spyOn(Logger.prototype, 'error');
      const error = new Error('test error');

      service.error('error message', error, { extra: 'info' });

      expect(superErrorSpy).toHaveBeenCalledWith('error message', {
        error: { name: error.name, message: error.message, stack: error.stack, cause: error.cause },
        contextId: 'ctx-err',
        data: { extra: 'info' },
      });
    });

    it('should pass non-Error objects directly as error', () => {
      mockClsService.getId.mockReturnValue('ctx-err');
      const superErrorSpy = vi.spyOn(Logger.prototype, 'error');

      service.error('error message', 'string error');

      expect(superErrorSpy).toHaveBeenCalledWith('error message', {
        error: 'string error',
        contextId: 'ctx-err',
      });
    });

    it('should call super.error without contextId when not available', () => {
      mockClsService.getId.mockReturnValue(undefined);
      const superErrorSpy = vi.spyOn(Logger.prototype, 'error');
      const error = new Error('test');

      service.error('error message', error);

      expect(superErrorSpy).toHaveBeenCalledWith('error message', {
        error: { name: error.name, message: error.message, stack: error.stack, cause: error.cause },
      });
    });

    it('should handle Error with cause', () => {
      mockClsService.getId.mockReturnValue('ctx-err');
      const superErrorSpy = vi.spyOn(Logger.prototype, 'error');
      const cause = new Error('root cause');
      const error = new Error('test error', { cause });

      service.error('error message', error);

      expect(superErrorSpy).toHaveBeenCalledWith('error message', {
        error: { name: error.name, message: error.message, stack: error.stack, cause },
        contextId: 'ctx-err',
      });
    });
  });

  describe('fatal', () => {
    it('should call super.fatal with parsed Error object, contextId, and data', () => {
      mockClsService.getId.mockReturnValue('ctx-fatal');
      const superFatalSpy = vi.spyOn(Logger.prototype, 'fatal');
      const error = new Error('fatal error');

      service.fatal('fatal message', error, { critical: true });

      expect(superFatalSpy).toHaveBeenCalledWith('fatal message', {
        error: { name: error.name, message: error.message, stack: error.stack, cause: error.cause },
        contextId: 'ctx-fatal',
        data: { critical: true },
      });
    });

    it('should pass non-Error objects directly as error for fatal', () => {
      mockClsService.getId.mockReturnValue('ctx-fatal');
      const superFatalSpy = vi.spyOn(Logger.prototype, 'fatal');

      service.fatal('fatal message', { code: 500 });

      expect(superFatalSpy).toHaveBeenCalledWith('fatal message', {
        error: { code: 500 },
        contextId: 'ctx-fatal',
      });
    });

    it('should call super.fatal without contextId when not available', () => {
      mockClsService.getId.mockReturnValue(undefined);
      const superFatalSpy = vi.spyOn(Logger.prototype, 'fatal');
      const error = new Error('fatal');

      service.fatal('fatal message', error);

      expect(superFatalSpy).toHaveBeenCalledWith('fatal message', {
        error: { name: error.name, message: error.message, stack: error.stack, cause: error.cause },
      });
    });

    it('should handle null error value', () => {
      mockClsService.getId.mockReturnValue('ctx-fatal');
      const superFatalSpy = vi.spyOn(Logger.prototype, 'fatal');

      service.fatal('fatal message', null);

      expect(superFatalSpy).toHaveBeenCalledWith('fatal message', {
        error: null,
        contextId: 'ctx-fatal',
      });
    });
  });
});
