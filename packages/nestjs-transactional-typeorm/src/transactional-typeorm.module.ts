import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { addTransactionalDataSource, initializeTransactionalContext, getDataSourceByName } from 'typeorm-transactional';

import type { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';

@Module({})
export class TransactionalTypeOrmModule extends TypeOrmModule {
  public static override forRoot(options: TypeOrmModuleOptions): DynamicModule {
    return { ...this.forRootAsync({ useFactory: () => options }), module: TransactionalTypeOrmModule };
  }

  public static override forRootAsync(options: TypeOrmModuleAsyncOptions): DynamicModule {
    initializeTransactionalContext();

    return {
      ...super.forRootAsync({
        ...options,
        // This function is required to use the transactional context,
        // and if exists the function in the options, this will be overridden.
        async dataSourceFactory(dataSourceOptions?: DataSourceOptions) {
          /* v8 ignore next 3 -- defensive guard: TypeORM always provides dataSourceOptions */
          if (!dataSourceOptions) {
            throw new Error('Invalid options passed');
          }

          const dataSource = options.dataSourceFactory
            ? await options.dataSourceFactory({ ...dataSourceOptions })
            : new DataSource({ ...dataSourceOptions });

          const alreadyRegisteredDataSource = getDataSourceByName(dataSource.name);

          if (alreadyRegisteredDataSource) {
            return alreadyRegisteredDataSource;
          }

          return addTransactionalDataSource({ name: dataSource.name, dataSource });
        },
      }),
      module: TransactionalTypeOrmModule,
    };
  }
}
