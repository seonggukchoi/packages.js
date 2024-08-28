import {
  FindOptionsSelectByString,
  EntityManager,
  EntityTarget,
  FindManyOptions,
  FindOneOptions,
  FindOptionsSelect,
  ObjectLiteral,
  QueryRunner,
  Repository,
} from 'typeorm';

type TrueKeys<Type extends object> = { [Key in keyof Type]: Type[Key] extends true ? Key : never }[keyof Type];
type FindOptionsSelectUnion<Entity extends ObjectLiteral> = FindOptionsSelect<Entity> | FindOptionsSelectByString<Entity> | undefined;
type FindSelectPick<Entity extends ObjectLiteral, Select extends FindOptionsSelectUnion<Entity>> =
  Select extends FindOptionsSelectByString<Entity>
    ? Pick<Entity, Select[number]>
    : Select extends FindOptionsSelect<Entity>
      ? Pick<Entity, Exclude<TrueKeys<Select>, symbol>>
      : never;

export abstract class BaseRepository<Entity extends ObjectLiteral> extends Repository<Entity> {
  constructor(target: EntityTarget<Entity>, manager: EntityManager, queryRunner?: QueryRunner) {
    super(target, manager, queryRunner);
  }

  /**
   * @deprecated Use `findPick` instead.
   */
  public override async find(options?: FindManyOptions<Entity>): Promise<Entity[]> {
    return super.find(options);
  }

  /**
   * @deprecated Use `findPickAndCount` instead.
   */
  public override async findAndCount(options?: FindManyOptions<Entity>): Promise<[Entity[], number]> {
    return super.findAndCount(options);
  }

  /**
   * @deprecated Use `findOnePick` instead.
   */
  public override async findOne(options: FindOneOptions<Entity>): Promise<Entity | null> {
    return super.findOne(options);
  }

  /**
   * @deprecated Use `findOnePickOrFail` instead.
   */
  public override async findOneOrFail(options: FindOneOptions<Entity>): Promise<Entity> {
    return super.findOneOrFail(options);
  }

  public async findPick<Options extends FindManyOptions<Entity>>(options: Omit<Options, 'select'>): Promise<Entity[]>;
  public async findPick<Options extends FindManyOptions<Entity>>(options: Options): Promise<FindSelectPick<Entity, Options['select']>[]>;
  public async findPick<Options extends FindManyOptions<Entity>>(
    options: Options,
  ): Promise<Entity[] | FindSelectPick<Entity, Options['select']>[]> {
    const entities = await this.find(options);

    if (options.select) {
      const includedFields = this.getIncludesFieldKeys(options.select);

      return entities.map((entity) => this.removeNotIncludesFields(entity, includedFields)) as FindSelectPick<Entity, Options['select']>[];
    }

    return entities as Entity[];
  }

  public async findPickAndCount<Options extends FindManyOptions<Entity>>(options: Omit<Options, 'select'>): Promise<[Entity[], number]>;
  public async findPickAndCount<Options extends FindManyOptions<Entity>>(
    options: Options,
  ): Promise<[FindSelectPick<Entity, Options['select']>[], number]>;
  public async findPickAndCount<Options extends FindManyOptions<Entity>>(
    options: Options,
  ): Promise<[Entity[] | FindSelectPick<Entity, Options['select']>[], number]> {
    const [entities, count] = await this.findAndCount(options);

    if (options.select) {
      const includedFields = this.getIncludesFieldKeys(options.select);

      return [
        entities.map((entity) => this.removeNotIncludesFields(entity, includedFields)) as FindSelectPick<Entity, Options['select']>[],
        count,
      ];
    }

    return [entities as Entity[], count];
  }

  public async findOnePick<Options extends FindOneOptions<Entity>>(options: Omit<Options, 'select'>): Promise<Entity | null>;
  public async findOnePick<Options extends FindOneOptions<Entity>>(
    options: Options,
  ): Promise<FindSelectPick<Entity, Options['select']> | null>;
  public async findOnePick<Options extends FindOneOptions<Entity>>(
    options: Options,
  ): Promise<Entity | FindSelectPick<Entity, Options['select']> | null> {
    const entity = await this.findOne(options);

    if (!entity) {
      return null;
    }

    if (options.select) {
      const includedFields = this.getIncludesFieldKeys(options.select);

      return this.removeNotIncludesFields(entity, includedFields) as FindSelectPick<Entity, Options['select']>;
    }

    return entity as Entity;
  }

  public async findOnePickOrFail<Options extends FindOneOptions<Entity>>(options: Omit<Options, 'select'>): Promise<Entity>;
  public async findOnePickOrFail<Options extends FindOneOptions<Entity>>(
    options: Options,
  ): Promise<FindSelectPick<Entity, Options['select']>>;
  public async findOnePickOrFail<Options extends FindOneOptions<Entity>>(
    options: Options,
  ): Promise<Entity | FindSelectPick<Entity, Options['select']>> {
    const entity = await this.findOneOrFail(options);

    if (options.select) {
      const includedFields = this.getIncludesFieldKeys(options.select);

      return this.removeNotIncludesFields(entity, includedFields) as FindSelectPick<Entity, Options['select']>;
    }

    return entity as Entity;
  }

  private getIncludesFieldKeys(select?: FindOptionsSelectUnion<Entity>): (keyof Entity)[] {
    if (!select) {
      return [];
    }

    if (Array.isArray(select)) {
      return select;
    }

    return Object.keys(select);
  }

  private removeNotIncludesFields(entity: Entity, includeFields: (keyof Entity)[]): Pick<Entity, keyof Entity> {
    const copiedEntity = { ...entity };

    for (const resultKey of Object.keys(copiedEntity)) {
      if (!includeFields.includes(resultKey)) {
        delete copiedEntity[resultKey];
      }
    }

    return copiedEntity;
  }
}
