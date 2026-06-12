import { PrismaClient } from '@prisma/client';
import { getIo } from '../../socket';

const prisma = new PrismaClient();

export class NotificationsService {
  async getTeamNotifications(teamId: string) {
    return prisma.notification.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createNotification(teamId: string, title: string, message: string, type: string = 'INFO') {
    const notif = await prisma.notification.create({
      data: { teamId, title, message, type, readBy: [] }
    });
    
    // ĐÃ SỬA: Bắn Socket Realtime TẠI ĐÂY và gom nhóm theo đúng teamId
    const io = getIo();
    if (io) {
      io.to(`team:${teamId}`).emit('notification:new', notif);
    }
    
    return notif;
  }

  async markAsRead(notificationId: string, userId: string) {
    const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (notif && !notif.readBy.includes(userId)) {
      return prisma.notification.update({
        where: { id: notificationId },
        data: { readBy: { push: userId } }
      });
    }
    return notif;
  }

  async markAllAsRead(teamId: string, userId: string) {
    const unreadNotifs = await prisma.notification.findMany({
      where: { teamId, NOT: { readBy: { has: userId } } }
    });
    
    const updates = unreadNotifs.map(n => 
      prisma.notification.update({
        where: { id: n.id },
        data: { readBy: { push: userId } }
      })
    );
    await prisma.$transaction(updates);
    return { success: true };
  }
}