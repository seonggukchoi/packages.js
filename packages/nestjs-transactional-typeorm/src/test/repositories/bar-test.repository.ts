import { Injectable } from '@nestjs/common';
import { DataSource, FindOneOptions } from 'typeorm';
import { getDataSourceByName } from 'typeorm-transactional';

import { BaseRepository } from '../../base.repository';
import { BAR_DATA_SOURCE_NAME } from '../constants';
import { BarTransactional } from '../decorators';
import { BarTestEntity } from '../entities';

@Injectable()
export class BarTestRepository extends BaseRepository<BarTestEntity> {
  constructor(protected readonly dataSource?: DataSource) {
    super(BarTestEntity, getDataSourceByName(BAR_DATA_SOURCE_NAME)!.createEntityManager());
  }

  @BarTransactional()
  public async findOneTransactional(options: FindOneOptions<BarTestEntity>): Promise<BarTestEntity | null> {
    return this.findOne(options);
  }

  @BarTransactional()
  public async saveTransactional(entity: Partial<BarTestEntity>): Promise<BarTestEntity> {
    return this.save(entity);
  }
}
