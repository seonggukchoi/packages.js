import { Primitive } from '../data';

export type DeepSimilarObject<T> = {
  [K in keyof T]: T[K] extends Primitive
    ? Primitive
    : T[K] extends Array<infer U>
      ? Array<DeepSimilarObject<U>>
      : T[K] extends ReadonlyArray<infer U>
        ? ReadonlyArray<DeepSimilarObject<U>>
        : T[K] extends Set<infer U>
          ? Set<DeepSimilarObject<U>>
          : T[K] extends ReadonlySet<infer U>
            ? ReadonlySet<DeepSimilarObject<U>>
            : T[K] extends Map<infer K, infer V>
              ? Map<DeepSimilarObject<K>, DeepSimilarObject<V>>
              : T[K] extends ReadonlyMap<infer K, infer V>
                ? ReadonlyMap<DeepSimilarObject<K>, DeepSimilarObject<V>>
                : DeepSimilarObject<T[K]>;
};
