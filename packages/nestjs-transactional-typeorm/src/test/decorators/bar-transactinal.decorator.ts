import { Transactional } from 'typeorm-transactional';

import { BAR_DATA_SOURCE_NAME } from '../constants';

import type { WrapInTransactionOptions } from 'typeorm-transactional';

export const BarTransactional = (options?: Omit<WrapInTransactionOptions, 'connectionName'>) =>
  Transactional({ ...options, connectionName: BAR_DATA_SOURCE_NAME });
