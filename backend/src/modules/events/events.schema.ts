import { z } from 'zod';

const eventTypeSchema = z.enum(['MATCH', 'TRAINING', 'MEETING']);

export const createEventSchema = z.object({
	body: z.object({
		title: z.string().min(1, 'Event title is required'),
		type: z.preprocess(
			value => (typeof value === 'string' ? value.trim().toUpperCase() : value),
			eventTypeSchema
		),
		date: z.string().datetime(),
		location: z.string().min(1).optional().nullable(),
		opponent: z.string().optional().nullable(), // THÊM DÒNG NÀY
	}),
});

export const attendanceSchema = z.object({
	body: z.object({
		status: z.enum(['CONFIRMED', 'DECLINED']),
	}),
	params: z.object({
		eventId: z.string().min(1),
	}),
});