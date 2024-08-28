import { Transactional, WrapInTransactionOptions } from 'typeorm-transactional';

import { BAR_DATA_SOURCE_NAME } from '../constants';

export const BarTransactional = (options?: Omit<WrapInTransactionOptions, 'connectionName'>) =>
  Transactional({ ...options, connectionName: BAR_DATA_SOURCE_NAME });
