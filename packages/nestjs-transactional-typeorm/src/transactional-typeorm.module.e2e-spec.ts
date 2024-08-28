import { randomUUID } from 'node:crypto';

import { Test } from '@nestjs/testing';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { TransactionalTypeOrmModule } from './transactional-typeorm.module';

describe('TransactionalTypeOrmModule', () => {
  const configFactory = (): TypeOrmModuleOptions => ({
    type: 'sqlite',
    database: ':memory:',
    synchronize: true,
    autoLoadEntities: true,
    name: randomUUID(),
  });

  describe('forRoot', () => {
    it('should be created a module successfully.', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [TransactionalTypeOrmModule.forRoot({ ...configFactory() })],
      }).compile();

      expect(moduleRef.get(TransactionalTypeOrmModule)).toBeInstanceOf(TransactionalTypeOrmModule);
    });
  });

  describe('forRootAsync', () => {
    it('should be created a module successfully.', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [TransactionalTypeOrmModule.forRootAsync({ useFactory: () => ({ ...configFactory() }) })],
      }).compile();

      expect(moduleRef.get(TransactionalTypeOrmModule)).toBeInstanceOf(TransactionalTypeOrmModule);
    });

    it('should be created a module successfully with extra providers.', async () => {
      const CONFIG_TOKEN = Symbol('CONFIG_TOKEN');
      const moduleRef = await Test.createTestingModule({
        imports: [
          TransactionalTypeOrmModule.forRootAsync({
            extraProviders: [{ provide: CONFIG_TOKEN, useValue: configFactory() }],
            inject: [CONFIG_TOKEN],
            useFactory: (config: TypeOrmModuleOptions) => config,
          }),
        ],
      }).compile();

      expect(moduleRef.get(TransactionalTypeOrmModule)).toBeInstanceOf(TransactionalTypeOrmModule);
    });
  });
});
