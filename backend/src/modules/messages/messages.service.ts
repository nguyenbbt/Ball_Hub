import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type MessageSender = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  role?: string;
};

export type MessageRecord = {
  id: string;
  sender: MessageSender;
  teamId?: string | null;
  receiverId?: string | null;
  text: string;
  createdAt: string;
  readBy: string[];
};

export type MessagePage = {
  messages: MessageRecord[];
  nextCursor: string | null;
};

export type DirectThread = {
  user: MessageSender;
  lastMessage: {
    text: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
};

export class MessagesService {
  private parseLimit(limit?: number): number {
    if (!Number.isFinite(limit)) return 30;
    return Math.min(Math.max(limit ?? 30, 1), 100);
  }

  private parseBefore(before?: string): Date | undefined {
    if (!before) return undefined;
    const date = new Date(before);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  // FIX LỖI: Kiểm tra quyền truy cập đúng chuẩn Prisma
  private async assertTeamMembership(userId: string, teamId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.teamId !== teamId) {
      throw new Error('Bạn không có quyền truy cập đội bóng này.');
    }
  }

  private async assertSharedTeam(userId: string, otherUserId: string): Promise<void> {
    const user1 = await prisma.user.findUnique({ where: { id: userId } });
    const user2 = await prisma.user.findUnique({ where: { id: otherUserId } });
    if (!user1?.teamId || user1.teamId !== user2?.teamId) {
      throw new Error('Hai người dùng không thuộc cùng một đội.');
    }
  }

  private formatMessage(doc: any): MessageRecord {
    return {
      id: doc.id,
      sender: {
        id: doc.sender.id,
        name: `${doc.sender.firstName} ${doc.sender.lastName}`.trim() || 'Người dùng',
        avatarUrl: doc.sender.avatarUrl,
        role: doc.sender.role,
      },
      teamId: doc.teamId,
      receiverId: doc.receiverId,
      text: doc.text,
      createdAt: doc.createdAt.toISOString(),
      readBy: doc.readBy || [],
    };
  }

  async getTeamMessages(userId: string, teamId: string, options?: { limit?: number; before?: string }): Promise<MessagePage> {
    await this.assertTeamMembership(userId, teamId);
    
    const limit = this.parseLimit(options?.limit);
    const beforeDate = this.parseBefore(options?.before);

    const where: any = { teamId };
    if (beforeDate) where.createdAt = { lt: beforeDate };

    const docs = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } }
      }
    });

    const records = docs.map(doc => this.formatMessage(doc));
    const sortedRecords = records.reverse();
    const nextCursor = docs.length === limit ? docs[docs.length - 1].createdAt.toISOString() : null;
    
    return { messages: sortedRecords, nextCursor };
  }

  async getDirectMessages(userId: string, otherUserId: string, options?: { limit?: number; before?: string }): Promise<MessagePage> {
    await this.assertSharedTeam(userId, otherUserId);

    const limit = this.parseLimit(options?.limit);
    const beforeDate = this.parseBefore(options?.before);

    const where: any = {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ]
    };
    if (beforeDate) where.createdAt = { lt: beforeDate };

    const docs = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } }
      }
    });

    const records = docs.map(doc => this.formatMessage(doc));
    const sortedRecords = records.reverse();
    const nextCursor = docs.length === limit ? docs[docs.length - 1].createdAt.toISOString() : null;
    
    return { messages: sortedRecords, nextCursor };
  }

  async createMessage(params: { senderId: string; teamId?: string; receiverId?: string; text: string; }): Promise<MessageRecord> {
    const { senderId, teamId, receiverId, text } = params;

    if (!teamId && !receiverId) throw new Error('Thiếu teamId hoặc receiverId.');
    if (teamId && receiverId) throw new Error('Chỉ được gửi theo teamId hoặc receiverId.');

    if (teamId) await this.assertTeamMembership(senderId, teamId);
    if (receiverId) await this.assertSharedTeam(senderId, receiverId);

    const doc = await prisma.message.create({
      data: {
        senderId,
        teamId,
        receiverId,
        text: text.trim(),
        readBy: [senderId],
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } }
      }
    });

    return this.formatMessage(doc);
  }

  async markMessagesRead(userId: string, messageIds: string[]): Promise<void> {
    if (!messageIds.length) return;

    const messages = await prisma.message.findMany({
      where: { id: { in: messageIds } }
    });

    const updates = messages
      .filter(m => !m.readBy.includes(userId))
      .map(m => 
        prisma.message.update({
          where: { id: m.id },
          data: { readBy: { push: userId } }
        })
      );

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }
  }

  async getDirectThreads(userId: string): Promise<DirectThread[]> {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: { not: null } },
          { receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } }
      }
    });

    const threadsMap = new Map<string, DirectThread>();

    for (const msg of messages) {
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!otherUser) continue;
      
      if (!threadsMap.has(otherUser.id)) {
        threadsMap.set(otherUser.id, {
          user: {
            id: otherUser.id,
            name: `${otherUser.firstName} ${otherUser.lastName}`.trim() || 'Người dùng',
            avatarUrl: otherUser.avatarUrl,
            role: otherUser.role
          },
          lastMessage: {
            text: msg.text,
            createdAt: msg.createdAt.toISOString(),
            senderId: msg.senderId
          },
          unreadCount: 0
        });
      }

      // Đếm tin nhắn chưa đọc
      if (msg.receiverId === userId && !msg.readBy.includes(userId)) {
        threadsMap.get(otherUser.id)!.unreadCount += 1;
      }
    }

    return Array.from(threadsMap.values());
  }
}