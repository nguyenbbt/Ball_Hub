import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore'; // <-- THÊM IMPORT NÀY

const API_URL = 'http://localhost:5000/api/messages';

const messagesAxios = axios.create({ baseURL: API_URL });

messagesAxios.interceptors.request.use((config) => {
  // Lấy Token chuẩn từ state của Zustand
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type MessageSender = {
  id: string;
  name: string;
  avatarUrl?: string | null; // Sửa lại kiểu cho đúng với schema
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

export type DirectThread = {
  user: MessageSender;
  lastMessage: {
    text: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
};

export const messagesApi = {
  getTeamMessages: async (teamId: string, options?: { before?: string | null; limit?: number }) => {
    const response = await messagesAxios.get(`/team/${teamId}`, {
      params: {
        before: options?.before ?? undefined,
        limit: options?.limit ?? undefined,
      },
    });
    return response.data as { messages: MessageRecord[]; nextCursor: string | null };
  },
  getDirectMessages: async (userId: string, options?: { before?: string | null; limit?: number }) => {
    const response = await messagesAxios.get(`/direct/${userId}`, {
      params: {
        before: options?.before ?? undefined,
        limit: options?.limit ?? undefined,
      },
    });
    return response.data as { messages: MessageRecord[]; nextCursor: string | null };
  },
  getDirectThreads: async () => {
    const response = await messagesAxios.get('/direct');
    return response.data as { threads: DirectThread[] };
  },
};