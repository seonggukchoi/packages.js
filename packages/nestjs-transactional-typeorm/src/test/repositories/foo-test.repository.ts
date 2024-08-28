import { Injectable } from '@nestjs/common';
import { DataSource, FindOneOptions } from 'typeorm';
import { getDataSourceByName } from 'typeorm-transactional';

import { BaseRepository } from '../../base.repository';
import { FOO_DATA_SOURCE_NAME } from '../constants';
import { FooTransactional } from '../decorators';
import { FooTestEntity } from '../entities';

@Injectable()
export class FooTestRepository extends BaseRepository<FooTestEntity> {
  constructor(protected readonly dataSource?: DataSource) {
    super(FooTestEntity, getDataSourceByName(FOO_DATA_SOURCE_NAME)!.createEntityManager());
  }

  @FooTransactional()
  public async findOneTransactional(options: FindOneOptions<FooTestEntity>): Promise<FooTestEntity | null> {
    return this.findOne(options);
  }

  @FooTransactional()
  public async saveTransactional(entity: Partial<FooTestEntity>): Promise<FooTestEntity> {
    return this.save(entity);
  }
}
