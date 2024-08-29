export type Falsy<T> = T extends false
  ? true
  : T extends 0
    ? true
    : T extends ''
      ? true
      : T extends null
        ? true
        : T extends undefined
          ? true
          : T extends void
            ? true
            : T extends never
              ? true
              : false;
