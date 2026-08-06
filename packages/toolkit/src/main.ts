#!/usr/bin/env node
import { CommandFactory } from 'nest-commander';

import { AppModule } from './app.module.js';
import { reportCommandFailure } from './command-failure/index.js';

async function bootstrap() {
  await CommandFactory.run(AppModule, { serviceErrorHandler: reportCommandFailure });
}

bootstrap();
