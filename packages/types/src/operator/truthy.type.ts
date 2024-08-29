import { Falsy } from './falsy.type';

export type Truthy<T> = T extends Falsy<T> ? false : true;
