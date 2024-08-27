import { Inject, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Logger, Params, PARAMS_PROVIDER_TOKEN, PinoLogger } from 'nestjs-pino';

@Injectable()
export class ContextualLoggerService extends Logger {
  constructor(
    logger: PinoLogger,
    @Inject(PARAMS_PROVIDER_TOKEN) params: Params,
    @Inject(ClsService) private readonly clsService: ClsService,
  ) {
    super(logger, params);
  }

  public override verbose<DataType>(message: string, data?: DataType): void {
    const contextId = this.clsService.getId();

    return super.verbose(message, { ...(contextId && { contextId }), ...(data && { data }) });
  }

  public override debug<DataType>(message: string, data?: DataType): void {
    const contextId = this.clsService.getId();

    return super.debug(message, { ...(contextId && { contextId }), ...(data && { data }) });
  }

  public override log<DataType>(message: string, data?: DataType): void {
    const contextId = this.clsService.getId();

    return super.log(message, { ...(contextId && { contextId }), ...(data && { data }) });
  }

  public override warn<DataType>(message: string, data?: DataType): void {
    const contextId = this.clsService.getId();

    return super.warn(message, { ...(contextId && { contextId }), ...(data && { data }) });
  }

  public override error<DataType>(message: string, error: unknown, data?: DataType): void {
    const contextId = this.clsService.getId();

    return super.error(message, {
      ...(error instanceof Error ? { error: this.parseErrorObject(error) } : { error }),
      ...(contextId && { contextId }),
      ...(data && { data }),
    });
  }

  public override fatal<DataType>(message: string, error: unknown, data?: DataType): void {
    const contextId = this.clsService.getId();

    return super.fatal(message, {
      ...(error instanceof Error ? { error: this.parseErrorObject(error) } : { error }),
      ...(contextId && { contextId }),
      ...(data && { data }),
    });
  }

  private parseErrorObject(error: Error): Record<string, unknown> {
    return { name: error.name, message: error.message, stack: error.stack, cause: error.cause };
  }
}
