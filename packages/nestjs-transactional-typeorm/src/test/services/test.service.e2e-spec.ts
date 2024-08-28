import { Test, TestingModule } from '@nestjs/testing';

import { TransactionalTypeOrmModule } from '../../transactional-typeorm.module';
import { FOO_DATA_SOURCE_NAME, BAR_DATA_SOURCE_NAME } from '../constants';
import { FooTestEntity, BarTestEntity } from '../entities';
import { FooTestRepository, BarTestRepository } from '../repositories';

import { TestService } from './test.service';

describe('TestService', () => {
  let moduleRef: TestingModule;
  let testService: TestService;

  let fooTestRepository: FooTestRepository;
  let barTestRepository: BarTestRepository;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TransactionalTypeOrmModule.forRoot({
          type: 'sqlite',
          // database: path.join(__dirname, 'foo.sqlite'),
          database: ':memory:',
          synchronize: true,
          autoLoadEntities: true,
          entities: [FooTestEntity],
          name: FOO_DATA_SOURCE_NAME,
        }),
        TransactionalTypeOrmModule.forRoot({
          type: 'sqlite',
          // database: path.join(__dirname, 'bar.sqlite'),
          database: ':memory:',
          synchronize: true,
          autoLoadEntities: true,
          entities: [BarTestEntity],
          name: BAR_DATA_SOURCE_NAME,
        }),
      ],
      providers: [TestService, FooTestRepository, BarTestRepository],
    }).compile();
    moduleRef.enableShutdownHooks();

    testService = moduleRef.get(TestService);

    fooTestRepository = moduleRef.get(FooTestRepository);
    barTestRepository = moduleRef.get(BarTestRepository);
  });

  afterEach(async () => {
    await fooTestRepository.clear();
    await barTestRepository.clear();
  });

  it('should be created a service and repositories successfully.', () => {
    expect(testService).toBeInstanceOf(TestService);

    expect(fooTestRepository).toBeInstanceOf(FooTestRepository);
    expect(barTestRepository).toBeInstanceOf(BarTestRepository);
  });

  it('should find data with each transaction active for multiple data sources.', async () => {
    let isFooTransactionActive = false;
    let isBarTransactionActive = false;

    const originalFooFindOne = fooTestRepository.findOne;
    const originalBarFindOne = barTestRepository.findOne;

    jest.spyOn(fooTestRepository, 'findOne').mockImplementation(async (...args) => {
      isFooTransactionActive = !!fooTestRepository.manager.queryRunner?.isTransactionActive;

      return originalFooFindOne.apply(fooTestRepository, [...args]);
    });

    jest.spyOn(barTestRepository, 'findOne').mockImplementation(async (...args) => {
      isBarTransactionActive = !!barTestRepository.manager.queryRunner?.isTransactionActive;

      return originalBarFindOne.apply(barTestRepository, [...args]);
    });

    const result = await testService.find(1);

    expect(result.foo).toBeNull();
    expect(result.bar).toBeNull();

    expect(isFooTransactionActive).toBe(true);
    expect(isBarTransactionActive).toBe(true);
  });

  it('should save data with each transaction active for multiple data sources.', async () => {
    let isFooTransactionActive = false;
    let isBarTransactionActive = false;

    const originalFooFindOne = fooTestRepository.save;
    const originalBarFindOne = barTestRepository.save;

    jest.spyOn(fooTestRepository, 'save').mockImplementation(async (...args) => {
      isFooTransactionActive = !!fooTestRepository.manager.queryRunner?.isTransactionActive;

      return originalFooFindOne.apply(fooTestRepository, [...args]);
    });

    jest.spyOn(barTestRepository, 'save').mockImplementation(async (...args) => {
      isBarTransactionActive = !!barTestRepository.manager.queryRunner?.isTransactionActive;

      return originalBarFindOne.apply(barTestRepository, [...args]);
    });

    const result = await testService.save({ foo: 'foo' }, { bar: 'bar' });

    expect(result.foo).toHaveProperty('idx');
    expect(result.foo.foo).toBe('foo');

    expect(result.bar).toHaveProperty('idx');
    expect(result.bar.bar).toBe('bar');

    expect(isFooTransactionActive).toBe(true);
    expect(isBarTransactionActive).toBe(true);
  });
});
