import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
    category: z.string().optional().nullable(),
    assigneeIds: z.array(z.string()).optional(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  }),
});