import 'reflect-metadata';

import { Expose } from 'class-transformer';

import { strictPlainToInstance } from './strict-plain-to-instance';

class UserDto {
  @Expose()
  name!: string;

  @Expose()
  age!: number;
}

describe('strictPlainToInstance', () => {
  it('should convert a plain object to an instance of the class.', () => {
    const result = strictPlainToInstance(UserDto, { name: 'Alice', age: 30 });

    expect(result).toBeInstanceOf(UserDto);
    expect(result.name).toBe('Alice');
    expect(result.age).toBe(30);
  });

  it('should convert an array of plain objects to class instances.', () => {
    const result = strictPlainToInstance(UserDto, [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(UserDto);
    expect(result[1]).toBeInstanceOf(UserDto);
    expect(result[0].name).toBe('Alice');
    expect(result[1].name).toBe('Bob');
  });

  it('should merge user options with exposeUnsetFields override.', () => {
    const result = strictPlainToInstance(UserDto, { name: 'Alice', age: 30 }, { excludeExtraneousValues: true });

    expect(result).toBeInstanceOf(UserDto);
    expect(result.name).toBe('Alice');
    expect(result.age).toBe(30);
  });

  it('should handle empty plain object.', () => {
    const result = strictPlainToInstance(UserDto, {} as never);

    expect(result).toBeInstanceOf(UserDto);
  });

  it('should handle empty array.', () => {
    const result = strictPlainToInstance(UserDto, []);

    expect(result).toHaveLength(0);
  });
});
