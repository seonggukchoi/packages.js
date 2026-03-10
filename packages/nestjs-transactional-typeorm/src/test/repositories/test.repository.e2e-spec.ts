import { Test } from '@nestjs/testing';
import { Not, IsNull } from 'typeorm';

import type { Equal } from '@seonggukchoi/types';

import { TransactionalTypeOrmModule } from '../../transactional-typeorm.module';
import { TestEntity } from '../entities';

import { TestRepository } from './test.repository';

import type { TestingModule } from '@nestjs/testing';

describe('TestRepository', () => {
  let moduleRef: TestingModule;

  let testRepository: TestRepository;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TransactionalTypeOrmModule.forRoot({
          type: 'sqlite',
          // database: path.join(__dirname, 'foo.sqlite'),
          database: ':memory:',
          synchronize: true,
          autoLoadEntities: true,
          entities: [TestEntity],
        }),
      ],
      providers: [TestRepository],
    }).compile();

    testRepository = moduleRef.get(TestRepository);
  });

  afterEach(async () => {
    await testRepository.clear();
  });

  it('Repository objects should be created successfully.', () => {
    expect(testRepository).toBeInstanceOf(TestRepository);
  });

  describe('findOne', () => {
    it('should return null if no rows exist.', async () => {
      const shopProd = await testRepository.findOne({ select: ['idx'], where: { idx: Not(IsNull()) } });

      expect(shopProd).toBeNull();
    });

    it('should return a Test entity object if a row exists.', async () => {
      await testRepository.insert({});

      const shopProd = await testRepository.findOne({ select: ['idx'], where: { idx: Not(IsNull()) } });

      expect(shopProd).toBeInstanceOf(TestEntity);
    });
  });

  describe('find', () => {
    it('should return an empty array if no rows exist.', async () => {
      const test = await testRepository.find({ select: ['idx'] });

      expect(test).toBeInstanceOf(Array);
      expect(test).toHaveLength(0);
    });

    it('should return an array of Test entity objects if multiple rows exist.', async () => {
      await testRepository.insert([{}, {}, {}]);

      const test = await testRepository.find({ select: ['idx'] });

      expect(test).toBeInstanceOf(Array<TestEntity>);
      expect(test).toHaveLength(3);
    });
  });

  describe('findOne with Transactional decorator', () => {
    it('should return null if no rows exist.', async () => {
      const result = await testRepository.findOneTransactional({ select: ['idx'], where: { idx: Not(IsNull()) } });

      expect(result).toBeNull();
    });

    it('should return a Test entity object if a row exists.', async () => {
      await testRepository.insert({});

      const result = await testRepository.findOneTransactional({ select: ['idx'], where: { idx: Not(IsNull()) } });

      expect(result).toBeInstanceOf(TestEntity);
    });

    it('should work correctly with `find` while a transaction is active on a single data source.', async () => {
      let isTransactionActive = false;

      const originalFooFindOne = testRepository.findOne;

      vi.spyOn(testRepository, 'findOne').mockImplementation(async (...args) => {
        isTransactionActive = !!testRepository.manager.queryRunner?.isTransactionActive;

        return originalFooFindOne.apply(testRepository, [...args]);
      });

      const result = await testRepository.findOneTransactional({ select: ['idx'], where: { idx: Not(IsNull()) } });

      expect(result).toBeNull();

      expect(isTransactionActive).toBe(true);
    });
  });

  describe('findPick', () => {
    describe('Validate runtime value', () => {
      it('should remove non-selected fields when select is an object.', async () => {
        await testRepository.insert({ test: 42 });

        // Spy on find to return entities with all fields regardless of select,
        // so that removeNotIncludesFields actually deletes non-selected fields.
        const originalFind = testRepository.find.bind(testRepository);

        vi.spyOn(testRepository, 'find').mockImplementation(async (options) => {
          const entities = await originalFind({ ...options, select: undefined });

          return entities;
        });

        const result = await testRepository.findPick({ select: { idx: true } });

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('idx');
        expect(result[0]).not.toHaveProperty('test');
      });

      it('should remove non-selected fields when select is a string array.', async () => {
        await testRepository.insert({ test: 42 });

        const originalFind = testRepository.find.bind(testRepository);

        vi.spyOn(testRepository, 'find').mockImplementation(async (options) => {
          const entities = await originalFind({ ...options, select: undefined });

          return entities;
        });

        const result = await testRepository.findPick({ select: ['idx'] });

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('idx');
        expect(result[0]).not.toHaveProperty('test');
      });

      it('should return all fields when select is not provided.', async () => {
        await testRepository.insert({ test: 42 });

        const result = await testRepository.findPick({});

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('idx');
        expect(result[0]).toHaveProperty('test');
      });
    });

    describe('Validate return type', () => {
      describe('Select by object', () => {
        it('should return an array of picked entity.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPick({ select: { idx: true } });
          const equal: Equal<typeof result, Pick<TestEntity, 'idx'>[]> = true;

          expect(equal).toBe(true);
        });

        it('should return an array of picked entity with only the true keys.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPick({ select: { idx: true, test: false } });
          const equal: Equal<typeof result, Pick<TestEntity, 'idx'>[]> = true;

          expect(equal).toBe(true);
        });

        it('should return an array of never picked entity if the specified keys are empty.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPick({ select: {} });
          const equal: Equal<typeof result, Pick<TestEntity, never>[]> = true;

          expect(equal).toBe(true);
        });

        it('should return an array of never picked entity if all keys are false.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPick({ select: { idx: false, test: false } });
          const equal: Equal<typeof result, Pick<TestEntity, never>[]> = true;

          expect(equal).toBe(true);
        });

        it('should return an array of original entity if the select option is not provided.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPick({});
          const equal: Equal<typeof result, TestEntity[]> = true;

          expect(equal).toBe(true);
        });
      });

      describe('Select by string array', () => {
        it('should return an array of picked entity.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPick({ select: ['idx'] });
          const equal: Equal<typeof result, Pick<TestEntity, 'idx'>[]> = true;

          expect(equal).toBe(true);
        });

        it('should return an array of never picked entity if the specified keys are empty.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPick({ select: [] });
          const equal: Equal<typeof result, Pick<TestEntity, never>[]> = true;

          expect(equal).toBe(true);
        });

        it('should return an array of original entity if the select option is not provided.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPick({});
          const equal: Equal<typeof result, TestEntity[]> = true;

          expect(equal).toBe(true);
        });
      });
    });
  });

  describe('findPickAndCount', () => {
    describe('Validate runtime value', () => {
      it('should remove non-selected fields and return correct count when select is an object.', async () => {
        await testRepository.insert([{ test: 1 }, { test: 2 }, { test: 3 }]);

        const originalFindAndCount = testRepository.findAndCount.bind(testRepository);

        vi.spyOn(testRepository, 'findAndCount').mockImplementation(async (options) => {
          return originalFindAndCount({ ...options, select: undefined });
        });

        const [entities, count] = await testRepository.findPickAndCount({ select: { idx: true } });

        expect(count).toBe(3);
        expect(entities).toHaveLength(3);

        for (const entity of entities) {
          expect(entity).toHaveProperty('idx');
          expect(entity).not.toHaveProperty('test');
        }
      });

      it('should return all fields and correct count when select is not provided.', async () => {
        await testRepository.insert([{ test: 1 }, { test: 2 }]);

        const [entities, count] = await testRepository.findPickAndCount({});

        expect(count).toBe(2);
        expect(entities).toHaveLength(2);

        for (const entity of entities) {
          expect(entity).toHaveProperty('idx');
          expect(entity).toHaveProperty('test');
        }
      });
    });

    describe('Validate return type', () => {
      describe('Select by object', () => {
        it('should return an array of picked entity.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPickAndCount({ select: { idx: true } });
          const equal: Equal<typeof result, [Pick<TestEntity, 'idx'>[], number]> = true;

          expect(equal).toBe(true);
        });

        it('should return an array of picked entity with only the true keys.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPickAndCount({ select: { idx: true, test: false } });
          const equal: Equal<typeof result, [Pick<TestEntity, 'idx'>[], number]> = true;

          expect(equal).toBe(true);
        });

        it('should return an array of never picked entity if the specified keys are empty.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPickAndCount({ select: {} });
          const equal: Equal<typeof result, [Pick<TestEntity, never>[], number]> = true;

          expect(equal).toBe(true);
        });

        it('should return an array of never picked entity if all keys are false.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPickAndCount({ select: { idx: false, test: false } });
          const equal: Equal<typeof result, [Pick<TestEntity, never>[], number]> = true;

          expect(equal).toBe(true);
        });

        it('should return an array of original entity if the select option is not provided.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPickAndCount({});
          const equal: Equal<typeof result, [TestEntity[], number]> = true;

          expect(equal).toBe(true);
        });
      });

      describe('Select by string array', () => {
        it('should return an array of picked entity.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPickAndCount({ select: ['idx'] });
          const equal: Equal<typeof result, [Pick<TestEntity, 'idx'>[], number]> = true;

          expect(equal).toBe(true);
        });

        it('should return an array of never picked entity if the specified keys are empty.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPickAndCount({ select: [] });
          const equal: Equal<typeof result, [Pick<TestEntity, never>[], number]> = true;

          expect(equal).toBe(true);
        });

        it('should return an array of original entity if the select option is not provided.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findPickAndCount({});
          const equal: Equal<typeof result, [TestEntity[], number]> = true;

          expect(equal).toBe(true);
        });
      });
    });
  });

  describe('findOnePick', () => {
    describe('Validate runtime value', () => {
      it('should remove non-selected fields when select is an object.', async () => {
        await testRepository.insert({ test: 42 });

        const originalFindOne = testRepository.findOne.bind(testRepository);

        vi.spyOn(testRepository, 'findOne').mockImplementation(async (options) => {
          return originalFindOne({ ...options, select: undefined });
        });

        const result = await testRepository.findOnePick({ select: { idx: true }, where: { test: 42 } });

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('idx');
        expect(result).not.toHaveProperty('test');
      });

      it('should return null when no entity matches.', async () => {
        const result = await testRepository.findOnePick({ select: { idx: true }, where: { test: 999 } });

        expect(result).toBeNull();
      });

      it('should return all fields when select is not provided.', async () => {
        await testRepository.insert({ test: 42 });

        const result = await testRepository.findOnePick({ where: { test: 42 } });

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('idx');
        expect(result).toHaveProperty('test');
      });
    });

    describe('Validate return type', () => {
      describe('Select by object', () => {
        it('should return a picked entity.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findOnePick({ select: { idx: true }, where: {} });
          const equal: Equal<typeof result, Pick<TestEntity, 'idx'> | null> = true;

          expect(equal).toBe(true);
        });

        it('should return a picked entity with only the true keys.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findOnePick({ select: { idx: true, test: false }, where: {} });
          const equal: Equal<typeof result, Pick<TestEntity, 'idx'> | null> = true;

          expect(equal).toBe(true);
        });

        it('should return a never picked entity if the specified keys are empty.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findOnePick({ select: {}, where: {} });
          const equal: Equal<typeof result, Pick<TestEntity, never> | null> = true;

          expect(equal).toBe(true);
        });

        it('should return a never picked entity if all keys are false.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findOnePick({ select: { idx: false, test: false }, where: {} });
          const equal: Equal<typeof result, Pick<TestEntity, never> | null> = true;

          expect(equal).toBe(true);
        });

        it('should return an original entity if the select option is not provided.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findOnePick({ where: {} });
          const equal: Equal<typeof result, TestEntity | null> = true;

          expect(equal).toBe(true);
        });
      });

      describe('Select by string array', () => {
        it('should return a picked entity.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findOnePick({ select: ['idx'], where: {} });
          const equal: Equal<typeof result, Pick<TestEntity, 'idx'> | null> = true;

          expect(equal).toBe(true);
        });

        it('should return a never picked entity if the specified keys are empty.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findOnePick({ select: [], where: {} });
          const equal: Equal<typeof result, Pick<TestEntity, never> | null> = true;

          expect(equal).toBe(true);
        });

        it('should return an original entity if the select option is not provided.', async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await testRepository.findOnePick({ where: {} });
          const equal: Equal<typeof result, TestEntity | null> = true;

          expect(equal).toBe(true);
        });
      });
    });
  });

  describe('findOnePickOrFail', () => {
    describe('Validate runtime value', () => {
      it('should remove non-selected fields when select is an object.', async () => {
        await testRepository.insert({ test: 42 });

        const originalFindOneOrFail = testRepository.findOneOrFail.bind(testRepository);

        vi.spyOn(testRepository, 'findOneOrFail').mockImplementation(async (options) => {
          return originalFindOneOrFail({ ...options, select: undefined });
        });

        const result = await testRepository.findOnePickOrFail({ select: { idx: true }, where: { test: 42 } });

        expect(result).toHaveProperty('idx');
        expect(result).not.toHaveProperty('test');
      });

      it('should throw an error when no entity matches.', async () => {
        await expect(testRepository.findOnePickOrFail({ select: { idx: true }, where: { test: 999 } })).rejects.toThrow();
      });

      it('should return all fields when select is not provided.', async () => {
        await testRepository.insert({ test: 42 });

        const result = await testRepository.findOnePickOrFail({ where: { test: 42 } });

        expect(result).toHaveProperty('idx');
        expect(result).toHaveProperty('test');
      });
    });

    describe('Validate return type', () => {
      describe('Select by object', () => {
        it('should return a picked entity.', async () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const result = await testRepository.findOnePickOrFail({ select: { idx: true }, where: {} });
            const equal: Equal<typeof result, Pick<TestEntity, 'idx'>> = true;

            expect(equal).toBe(true);
          } catch {
            /* empty */
          }
        });

        it('should return a picked entity with only the true keys.', async () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const result = await testRepository.findOnePickOrFail({ select: { idx: true, test: false }, where: {} });
            const equal: Equal<typeof result, Pick<TestEntity, 'idx'>> = true;

            expect(equal).toBe(true);
          } catch {
            /* empty */
          }
        });

        it('should return a never picked entity if the specified keys are empty.', async () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const result = await testRepository.findOnePickOrFail({ select: {}, where: {} });
            const equal: Equal<typeof result, Pick<TestEntity, never>> = true;

            expect(equal).toBe(true);
          } catch {
            /* empty */
          }
        });

        it('should return a never picked entity if all keys are false.', async () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const result = await testRepository.findOnePickOrFail({ select: { idx: false, test: false }, where: {} });
            const equal: Equal<typeof result, Pick<TestEntity, never>> = true;

            expect(equal).toBe(true);
          } catch {
            /* empty */
          }
        });

        it('should return an original entity if the select option is not provided.', async () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const result = await testRepository.findOnePickOrFail({ where: {} });
            const equal: Equal<typeof result, TestEntity> = true;

            expect(equal).toBe(true);
          } catch {
            /* empty */
          }
        });
      });

      describe('Select by string array', () => {
        it('should return a picked entity.', async () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const result = await testRepository.findOnePickOrFail({ select: ['idx'], where: {} });
            const equal: Equal<typeof result, Pick<TestEntity, 'idx'>> = true;

            expect(equal).toBe(true);
          } catch {
            /* empty */
          }
        });

        it('should return a never picked entity if the specified keys are empty.', async () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const result = await testRepository.findOnePickOrFail({ select: [], where: {} });
            const equal: Equal<typeof result, Pick<TestEntity, never>> = true;

            expect(equal).toBe(true);
          } catch {
            /* empty */
          }
        });

        it('should return an original entity if the select option is not provided.', async () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const result = await testRepository.findOnePickOrFail({ where: {} });
            const equal: Equal<typeof result, TestEntity> = true;

            expect(equal).toBe(true);
          } catch {
            /* empty */
          }
        });
      });
    });
  });
});
