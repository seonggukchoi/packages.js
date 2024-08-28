import { Injectable } from '@nestjs/common';

import { BarTransactional, FooTransactional } from '../decorators';
import { FooTestEntity, BarTestEntity } from '../entities';
import { FooTestRepository, BarTestRepository } from '../repositories';

@Injectable()
export class TestService {
  constructor(
    private readonly fooTestRepository: FooTestRepository,
    private readonly barTestRepository: BarTestRepository,
  ) {}

  @FooTransactional()
  @BarTransactional()
  public async find(idx: number): Promise<{ foo: FooTestEntity | null; bar: BarTestEntity | null }> {
    const [foo, bar] = await Promise.all([
      this.fooTestRepository.findOne({ where: { idx } }),
      this.barTestRepository.findOne({ where: { idx } }),
    ]);

    return { foo, bar };
  }

  @FooTransactional()
  @BarTransactional()
  public async save(foo: Partial<FooTestEntity>, bar: Partial<BarTestEntity>): Promise<{ foo: FooTestEntity; bar: BarTestEntity }> {
    const [savedFoo, savedBar] = await Promise.all([this.fooTestRepository.save(foo), this.barTestRepository.save(bar)]);

    return { foo: savedFoo, bar: savedBar };
  }
}
