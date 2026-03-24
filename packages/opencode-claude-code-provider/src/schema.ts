import { z } from 'zod';

import { isRecord } from './types.js';

import type { JSONSchema7, JSONSchema7Definition } from '@ai-sdk/provider';

export function jsonSchemaToZodObjectShape(schema: JSONSchema7 | undefined): z.ZodRawShape | undefined {
  if (!schema || schema.type !== 'object' || !isRecord(schema.properties)) {
    return undefined;
  }

  const required = new Set(Array.isArray(schema.required) ? schema.required : []);
  const shape = Object.fromEntries(
    Object.entries(schema.properties).map(([key, value]) => {
      const zodSchema = jsonSchemaToZod(value);
      return [key, required.has(key) ? zodSchema : zodSchema.optional()];
    }),
  );

  return shape;
}

export function jsonSchemaToZod(schema: JSONSchema7Definition | undefined): z.ZodTypeAny {
  if (!schema || typeof schema === 'boolean') {
    return z.unknown();
  }

  if (Array.isArray(schema.type)) {
    return jsonSchemaToZod({ ...schema, type: schema.type[0] });
  }

  if (schema.enum) {
    const enumValues = schema.enum.filter((value): value is string | number | boolean | null => value !== undefined);

    if (enumValues.length > 0) {
      const [firstLiteral, ...restLiterals] = enumValues.map((value) => z.literal(value));

      return restLiterals.length > 0 ? z.union([firstLiteral, ...restLiterals]) : firstLiteral;
    }
  }

  switch (schema.type) {
    case 'array': {
      const items = Array.isArray(schema.items) ? schema.items[0] : schema.items;
      return z.array(jsonSchemaToZod(items));
    }
    case 'boolean': {
      return z.boolean();
    }
    case 'integer': {
      return z.number().int();
    }
    case 'number': {
      return z.number();
    }
    case 'object': {
      return z.object(jsonSchemaToZodObjectShape(schema) ?? {}).passthrough();
    }
    case 'string': {
      const format = schema.format;

      if (format === 'uri' || format === 'url') {
        return z.string().url();
      }

      return z.string();
    }
    default: {
      return z.unknown();
    }
  }
}
