import { ConfigurableModuleBuilder } from '@nestjs/common';
import { Params } from 'nestjs-pino';

export const {
  ConfigurableModuleClass: ConfigurableContextualPinoModule,
  OPTIONS_TYPE: CONTEXTUAL_LOGGER_MODULE_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: CONTEXTUAL_LOGGER_MODULE_ASYNC_OPTIONS_TYPE,
  MODULE_OPTIONS_TOKEN: CONTEXTUAL_LOGGER_MODULE_OPTIONS_TOKEN,
} = new ConfigurableModuleBuilder<Params>({ moduleName: 'ContextualLogger' }).build();
