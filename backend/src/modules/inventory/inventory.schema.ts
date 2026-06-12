import { z } from 'zod';

const conditionSchema = z.enum(['GOOD', 'FAIR', 'POOR']);

const conditionInputSchema = z.preprocess(
  value => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  conditionSchema
);

const dateInputSchema = z.preprocess(value => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}, z.string().datetime());

export const createItemSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    category: z.string().min(1, 'Category is required'),
    quantity: z.coerce.number().int().nonnegative().optional(),
    minQuantity: z.coerce.number().int().nonnegative().optional(),
    condition: conditionInputSchema.optional(),
    location: z.string().min(1).optional().nullable(),
    lastChecked: dateInputSchema.optional(),
  }),
});

export const updateItemSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    quantity: z.coerce.number().int().nonnegative().optional(),
    minQuantity: z.coerce.number().int().nonnegative().optional(),
    condition: conditionInputSchema.optional(),
    location: z.string().min(1).optional().nullable(),
    lastChecked: dateInputSchema.optional(),
  }),
});
