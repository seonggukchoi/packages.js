type IsSubType<T> = <U>() => U extends T ? true : false;

export type Equal<X, Y> = IsSubType<X> extends IsSubType<Y> ? true : false;
