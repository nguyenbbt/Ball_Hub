import { Response, NextFunction } from 'express';
import { PrismaClient, Role, EventType, AttendanceStatus } from '@prisma/client';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { NotificationsService } from '../notifications/notifications.service';

const prisma = new PrismaClient();
const notificationsService = new NotificationsService();

export const getEvents = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId ?? null;
    const userId = req.user?.id ?? null;

    if (!userId || !teamId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Lấy query parameters cho phân trang
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20; // Default limit 20
    const skip = (page - 1) * limit;

    // Chạy đồng thời query lấy data và count tổng số để tối ưu I/O
    const [events, totalEvents] = await Promise.all([
      prisma.event.findMany({
        where: { teamId },
        orderBy: { date: 'asc' },
        skip,
        take: limit,
        // TỐI ƯU 1: Chỉ select những cột cần thiết, tránh dùng `include` lấy thừa data
        select: {
          id: true,
          title: true,
          type: true,
          date: true,
          location: true,
          matchDetails: {
            select: {
              opponent: true, // Chỉ lấy opponent, bỏ qua các data thừa của Match
            }
          }
        }
      }),
      prisma.event.count({ where: { teamId } })
    ]);

    if (events.length === 0) {
      res.status(200).json({ data: [], meta: { total: 0, page, limit } });
      return;
    }

    const eventIds = events.map(event => event.id);

    // TỐI ƯU 2: Giữ nguyên logic gom nhóm groupBy nhanh nhẹn của bạn
    const [confirmedCounts, userAttendances, totalPlayers] = await Promise.all([
      prisma.attendance.groupBy({
        by: ['eventId'],
        where: {
          eventId: { in: eventIds },
          status: 'CONFIRMED',
        },
        _count: { _all: true },
      }),
      prisma.attendance.findMany({
        where: { eventId: { in: eventIds }, userId },
        select: { eventId: true, status: true },
      }),
      prisma.user.count({
        where: { teamId, role: Role.PLAYER },
      }),
    ]);

    const confirmedByEvent = new Map(
      confirmedCounts.map(item => [item.eventId, item._count._all])
    );

    const attendanceByEvent = new Map(
      userAttendances.map(att => [att.eventId, att.status])
    );

    const data = events.map(event => ({
      id: event.id,
      title: event.title,
      type: event.type,
      date: event.date,
      location: event.location,
      opponent: event.matchDetails?.opponent || null, 
      confirmed: confirmedByEvent.get(event.id) ?? 0,
      total: totalPlayers,
      attendanceStatus: attendanceByEvent.get(event.id) ?? null,
    }));

    // TỐI ƯU 3: Trả về cấu trúc bao gồm meta cho Pagination ở Frontend
    res.status(200).json({
      data,
      meta: {
        total: totalEvents,
        page,
        limit,
        totalPages: Math.ceil(totalEvents / limit),
      }
    });
  } catch (err) {
    next(err);
  }
};

export const createEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId ?? null;
    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const { title, type, date, location, opponent } = req.body as {
      title: string;
      type: EventType;
      date: string;
      location?: string | null;
      opponent?: string | null;
    };

    const parsedDate = new Date(date);

    const eventData: any = {
      teamId,
      title,
      type,
      date: parsedDate,
      location: location ?? null,
    };

    if (type === 'MATCH' && opponent) {
      eventData.matchDetails = {
        create: {
          opponent: opponent,
          isHome: true,
          matchType: 'Regular', 
        }
      };
    }

    const created = await prisma.event.create({
      data: eventData,
    });

    const notifType = type === 'MATCH' ? 'URGENT' : 'SYSTEM';
    await notificationsService.createNotification(
      teamId, 
      type === 'MATCH' ? 'Trận đấu mới' : 'Lịch trình mới', 
      `Sự kiện: "${title}" vừa được thêm vào lịch trình.`, 
      notifType
    );

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

export const updateAttendance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id ?? null;
    const teamId = req.user?.teamId ?? null;
    const { eventId } = req.params;
    const { status } = req.body as { status: AttendanceStatus };

    if (!userId || !teamId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, teamId },
      select: { id: true },
    });

    if (!event) {
      res.status(404).json({ message: 'Event not found.' });
      return;
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      create: { eventId, userId, status },
      update: { status },
    });

    res.status(200).json(attendance);
  } catch (err) {
    next(err);
  }
};

export const updateEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId ?? null;
    const { id } = req.params;

    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const { title, type, date, location, opponent } = req.body as any;
    const parsedDate = new Date(date);

    const existingEvent = await prisma.event.findFirst({
      where: { id, teamId },
      include: { matchDetails: true }
    });

    if (!existingEvent) {
      res.status(404).json({ message: 'Event not found.' });
      return;
    }

    const updateData: any = {
      title,
      type,
      date: parsedDate,
      location: location ?? null,
    };

    if (type === 'MATCH' && opponent) {
      updateData.matchDetails = {
        upsert: {
          create: { opponent, isHome: true, matchType: 'Regular' },
          update: { opponent }
        }
      };
    } else if (existingEvent.type === 'MATCH' && type !== 'MATCH') {
      updateData.matchDetails = { delete: true };
    }

    const updated = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    await notificationsService.createNotification(
      teamId, 
      'Thay đổi lịch trình', 
      `Sự kiện "${updated.title}" vừa có thay đổi. Hãy kiểm tra lại lịch!`, 
      'SYSTEM'
    );

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamId = req.user?.teamId ?? null;
    const { id } = req.params;

    if (!teamId) {
      res.status(403).json({ message: 'Forbidden: Missing team assignment.' });
      return;
    }

    const existingEvent = await prisma.event.findFirst({
      where: { id, teamId },
    });

    if (!existingEvent) {
      res.status(404).json({ message: 'Event not found.' });
      return;
    }

    await prisma.event.delete({
      where: { id },
    });

    await notificationsService.createNotification(
      teamId, 
      'Hủy sự kiện', 
      `Sự kiện "${existingEvent.title}" đã bị hủy.`, 
      'SYSTEM'
    );

    res.status(200).json({ message: 'Deleted successfully.' });
  } catch (err) {
    next(err);
  }
};