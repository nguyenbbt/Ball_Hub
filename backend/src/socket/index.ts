import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { MessagesService } from '../modules/messages/messages.service';

type SocketUser = {
  id: string;
  role?: 'coach' | 'player';
};

type MessagePayload = {
  text: string;
  teamId?: string;
  receiverId?: string;
};

type PresenceJoinPayload = {
  teamId: string;
};

type TypingPayload = {
  teamId?: string;
  receiverId?: string;
};

type ReadPayload = {
  messageIds: string[];
  teamId?: string;
  receiverId?: string;
};

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
};
let ioInstance: Server | null = null;
export const getIo = () => {
  if (!ioInstance) {
    throw new Error('Socket.io chưa được khởi tạo!');
  }
  return ioInstance;
};
export const initSocket = (server: HttpServer) => {
  const defaultClientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
  const allowedOrigins = new Set([defaultClientOrigin, 'http://localhost:5174']);

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
  });

  ioInstance = io;

  const messagesService = new MessagesService();
  const onlineUsersByTeam = new Map<string, Set<string>>();
  const userConnections = new Map<string, number>();

  const broadcastPresence = (teamId: string) => {
    const users = onlineUsersByTeam.get(teamId);
    io.to(`team:${teamId}`).emit('presence:update', {
      teamId,
      onlineUserIds: users ? Array.from(users) : [],
    });
  };

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('Unauthorized'));
      return;
    }

    try {
      const payload = jwt.verify(token, getJwtSecret()) as SocketUser;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as SocketUser | undefined;
    if (!user) return;

    userConnections.set(user.id, (userConnections.get(user.id) ?? 0) + 1);

    socket.join(`user:${user.id}`);

    socket.on('presence:join', ({ teamId }: PresenceJoinPayload) => {
      if (!teamId) return;

      socket.join(`team:${teamId}`);
      socket.data.teamId = teamId;

      const existing = onlineUsersByTeam.get(teamId) ?? new Set<string>();
      existing.add(user.id);
      onlineUsersByTeam.set(teamId, existing);
      broadcastPresence(teamId);
    });

    socket.on('typing:start', (payload: TypingPayload) => {
      if (payload.teamId) {
        io.to(`team:${payload.teamId}`).emit('typing:update', {
          teamId: payload.teamId,
          userId: user.id,
          isTyping: true,
        });
      }

      if (payload.receiverId) {
        io.to(`user:${payload.receiverId}`).emit('typing:update', {
          receiverId: payload.receiverId,
          userId: user.id,
          isTyping: true,
        });
      }
    });

    socket.on('typing:stop', (payload: TypingPayload) => {
      if (payload.teamId) {
        io.to(`team:${payload.teamId}`).emit('typing:update', {
          teamId: payload.teamId,
          userId: user.id,
          isTyping: false,
        });
      }

      if (payload.receiverId) {
        io.to(`user:${payload.receiverId}`).emit('typing:update', {
          receiverId: payload.receiverId,
          userId: user.id,
          isTyping: false,
        });
      }
    });

    socket.on('message:send', async (payload: MessagePayload, callback?: (response: { ok: boolean; message?: string }) => void) => {
      try {
        const text = payload.text?.trim();
        if (!text) {
          callback?.({ ok: false, message: 'Nội dung tin nhắn không được để trống.' });
          return;
        }

        const message = await messagesService.createMessage({
          senderId: user.id,
          teamId: payload.teamId,
          receiverId: payload.receiverId,
          text,
        });

        if (message.teamId) {
          io.to(`team:${message.teamId}`).emit('message:new', message);
        }

        if (message.receiverId) {
          io.to(`user:${message.receiverId}`).emit('message:new', message);
          io.to(`user:${user.id}`).emit('message:new', message);
        }

        callback?.({ ok: true });
      } catch (err: any) {
        callback?.({ ok: false, message: err.message ?? 'Gửi tin nhắn thất bại.' });
      }
    });

    socket.on('message:read', async (payload: ReadPayload) => {
      if (!payload.messageIds?.length) return;

      try {
        await messagesService.markMessagesRead(user.id, payload.messageIds);

        if (payload.teamId) {
          io.to(`team:${payload.teamId}`).emit('message:read', {
            messageIds: payload.messageIds,
            userId: user.id,
            teamId: payload.teamId,
          });
        }

        if (payload.receiverId) {
          io.to(`user:${payload.receiverId}`).emit('message:read', {
            messageIds: payload.messageIds,
            userId: user.id,
            receiverId: payload.receiverId,
          });
        }
      } catch {
        // ignore read errors
      }
    });

    socket.on('disconnect', () => {
      const current = userConnections.get(user.id) ?? 0;
      const nextCount = Math.max(current - 1, 0);
      if (nextCount === 0) {
        userConnections.delete(user.id);
      } else {
        userConnections.set(user.id, nextCount);
      }

      const teamId = socket.data.teamId as string | undefined;
      if (teamId && nextCount === 0) {
        const existing = onlineUsersByTeam.get(teamId);
        if (existing) {
          existing.delete(user.id);
          onlineUsersByTeam.set(teamId, existing);
          broadcastPresence(teamId);
        }
      }
    });
  });
};