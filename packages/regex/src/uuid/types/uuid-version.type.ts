import { UUID_VERSION } from '../constants';

export type UuidVersion = (typeof UUID_VERSION)[keyof typeof UUID_VERSION];
