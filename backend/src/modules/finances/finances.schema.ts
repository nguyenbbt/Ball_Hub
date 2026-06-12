import { z } from 'zod';

export const transactionSchema = z.object({
  body: z.object({
    description: z.string().min(1, 'Description is required'),
    amount: z.coerce.number(),
    transType: z.enum(['INCOME', 'EXPENSE']),
    category: z.string().min(1, 'Category is required'),
    transDate: z.string().datetime(), // Validate định dạng ISO date
  }),
});