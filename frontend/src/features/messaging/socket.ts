import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/useAuthStore';

const SOCKET_URL = 'http://localhost:5000';

let socket: Socket | null = null;
let currentToken: string | null = null; // Biến theo dõi token hiện tại

export const getSocket = () => {
  const token = useAuthStore.getState().token;

  // Nếu đã có socket nhưng Token bị thay đổi (do đổi tài khoản) -> Xóa socket cũ
  if (socket && currentToken !== token) {
    socket.disconnect();
    socket = null;
  }

  // Khởi tạo socket mới với Token mới
  if (!socket && token) {
    currentToken = token;
    socket = io(SOCKET_URL, {
      auth: { token },
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
};