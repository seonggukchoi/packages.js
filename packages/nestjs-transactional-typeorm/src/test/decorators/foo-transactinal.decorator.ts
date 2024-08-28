import { Transactional, WrapInTransactionOptions } from 'typeorm-transactional';

import { FOO_DATA_SOURCE_NAME } from '../constants';

export const FooTransactional = (options?: Omit<WrapInTransactionOptions, 'connectionName'>) =>
  Transactional({ ...options, connectionName: FOO_DATA_SOURCE_NAME });
