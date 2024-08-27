import { ClassConstructor, ClassTransformOptions, plainToInstance } from 'class-transformer';

import { DeepSimilarObject } from '@seonggukchoi/types';

export function strictPlainToInstance<T>(cls: ClassConstructor<T>, plain: DeepSimilarObject<T>, options?: ClassTransformOptions): T;
export function strictPlainToInstance<T>(cls: ClassConstructor<T>, plain: DeepSimilarObject<T>[], options?: ClassTransformOptions): T[];
export function strictPlainToInstance<T>(
  cls: ClassConstructor<T>,
  plain: DeepSimilarObject<T> | DeepSimilarObject<T>[],
  options?: ClassTransformOptions,
): T | T[] {
  return plainToInstance(cls, plain, { ...options, exposeUnsetFields: true });
}
