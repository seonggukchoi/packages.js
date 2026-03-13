import { Test } from '@nestjs/testing';

import { ContextualLoggerLazyDecorator } from './contextual-logger.lazy-decorator';
import { ContextualLoggerService } from './contextual-logger.service';
import { ContextualPinoModule } from './contextual-pino.module';

describe('ContextualPinoModule', () => {
  describe('forRoot', () => {
    it('should create a dynamic module with LoggerModule.forRoot', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [ContextualPinoModule.forRoot()],
      }).compile();

      expect(moduleRef).toBeDefined();

      const service = moduleRef.get(ContextualLoggerService);

      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ContextualLoggerService);

      const lazyDecorator = moduleRef.get(ContextualLoggerLazyDecorator);

      expect(lazyDecorator).toBeDefined();
      expect(lazyDecorator).toBeInstanceOf(ContextualLoggerLazyDecorator);

      await moduleRef.close();
    });

    it('should accept pino params', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [ContextualPinoModule.forRoot({ pinoHttp: { level: 'debug' } })],
      }).compile();

      expect(moduleRef).toBeDefined();

      await moduleRef.close();
    });
  });

  describe('forRootAsync', () => {
    it('should create a dynamic module with LoggerModule.forRootAsync', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ContextualPinoModule.forRootAsync({
            useFactory: () => ({ pinoHttp: { level: 'info' } }),
          }),
        ],
      }).compile();

      expect(moduleRef).toBeDefined();

      const service = moduleRef.get(ContextualLoggerService);

      expect(service).toBeDefined();

      await moduleRef.close();
    });
  });

  describe('module metadata', () => {
    it('should have ClsModule and AopModule in imports', () => {
      const result = ContextualPinoModule.forRoot();

      expect(result.module).toBe(ContextualPinoModule);
      expect(result.imports).toBeDefined();
    });
  });
});
