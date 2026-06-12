import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const PlayerPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  name: z.string(),
  initials: z.string(),
  pos: z.string(),
  color: z.string(),
});

const NoteSchema = z.object({
  label: z.string(),
  active: z.boolean(),
});

export const createTacticSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Tên chiến thuật không được để trống'),
    players: z.array(PlayerPositionSchema).min(1, 'Danh sách cầu thủ không được để trống'),
    notes: z.array(NoteSchema).default([]),
  }),
});

export const updateTacticSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'ID chiến thuật không hợp lệ'),
  }),
  body: z.object({
    name: z.string().optional(),
    players: z.array(PlayerPositionSchema).optional(),
    notes: z.array(NoteSchema).optional(),
  }),
});

export const deleteTacticSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'ID chiến thuật không hợp lệ'),
  }),
});
