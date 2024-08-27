import { DynamicModule, Module } from '@nestjs/common';
import { AopModule } from '@toss/nestjs-aop';
import { ClsModule } from 'nestjs-cls';
import { LoggerModule, LoggerModuleAsyncParams, Params } from 'nestjs-pino';

import { ContextualLoggerLazyDecorator } from './contextual-logger.lazy-decorator';
import { ContextualLoggerService } from './contextual-logger.service';

@Module({
  imports: [ClsModule.forRoot(), AopModule],
  providers: [ContextualLoggerService, ContextualLoggerLazyDecorator],
  exports: [ContextualLoggerService, ContextualLoggerLazyDecorator],
})
export class ContextualPinoModule {
  public static forRoot(params?: Params): DynamicModule {
    return { module: ContextualPinoModule, imports: [LoggerModule.forRoot(params)] };
  }

  public static forRootAsync(params: LoggerModuleAsyncParams): DynamicModule {
    return { module: ContextualPinoModule, imports: [LoggerModule.forRootAsync(params)] };
  }
}
