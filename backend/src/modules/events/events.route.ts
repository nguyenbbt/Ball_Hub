import { Router, RequestHandler } from 'express';
import { createEvent, getEvents, updateAttendance, updateEvent, deleteEvent } from './events.controller'; // Đã import thêm
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { attendanceSchema, createEventSchema } from './events.schema';

export const eventsRouter = Router();

eventsRouter.use(authMiddleware as RequestHandler);

eventsRouter.get('/', getEvents as RequestHandler);

// Coach mới có quyền tạo sự kiện
eventsRouter.post('/', requireRole(['COACH']) as RequestHandler, validate(createEventSchema), createEvent as RequestHandler);

// Điểm danh
eventsRouter.post(
	'/:eventId/attendance',
	validate(attendanceSchema),
	updateAttendance as RequestHandler
);

// THÊM: Sửa sự kiện (Dùng chung schema validate với lúc tạo)
eventsRouter.put('/:id', requireRole(['COACH']) as RequestHandler, validate(createEventSchema), updateEvent as RequestHandler);

// THÊM: Xóa sự kiện
eventsRouter.delete('/:id', requireRole(['COACH']) as RequestHandler, deleteEvent as RequestHandler);