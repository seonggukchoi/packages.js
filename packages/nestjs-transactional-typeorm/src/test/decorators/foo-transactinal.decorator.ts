import { Transactional } from 'typeorm-transactional';

import { FOO_DATA_SOURCE_NAME } from '../constants';

import type { WrapInTransactionOptions } from 'typeorm-transactional';

export const FooTransactional = (options?: Omit<WrapInTransactionOptions, 'connectionName'>) =>
  Transactional({ ...options, connectionName: FOO_DATA_SOURCE_NAME });
