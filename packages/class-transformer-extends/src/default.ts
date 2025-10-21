import { Transform } from 'class-transformer';

export function Default(defaultValue: unknown) {
  return Transform(({ value }) => (value !== null && value !== undefined ? value : defaultValue));
}
