import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

import { BaseRepository } from '../../base.repository';
import { TestEntity } from '../entities';

import type { FindOneOptions } from 'typeorm';

@Injectable()
export class TestRepository extends BaseRepository<TestEntity> {
  constructor(protected readonly dataSource: DataSource) {
    super(TestEntity, dataSource.createEntityManager());
  }

  @Transactional()
  public async findOneTransactional(options: FindOneOptions<TestEntity>): Promise<TestEntity | null> {
    return this.findOne(options);
  }
}
