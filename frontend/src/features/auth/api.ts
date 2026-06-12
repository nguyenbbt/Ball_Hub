import axios from 'axios';
import { LoginCredentials, RegisterData, AuthResponse } from './types';

const API_URL = 'http://localhost:5000/api/auth'; // Đảm bảo khớp với cổng Backend của bạn

// Tạo một instance axios riêng cho Auth (không cần đính kèm token vì lúc này chưa đăng nhập)
const authAxios = axios.create({
  baseURL: API_URL,
});

export const authApi = {
  // Hàm xử lý Đăng nhập
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await authAxios.post('/login', credentials);
    return response.data;
  },

  // Hàm xử lý Đăng ký
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await authAxios.post('/register', data);
    return response.data;
  }
};