import axios from 'axios';

// Trỏ tới module users ở Backend
const API_URL = 'http://localhost:5000/api/users'; 

const userAxios = axios.create({ baseURL: API_URL });

// Tự động đính kèm token vào mọi request
userAxios.interceptors.request.use((config) => {
    // Lấy trực tiếp từ localStorage để đảm bảo tính thời sự nếu Store đang bị lag
    const token = localStorage.getItem('token'); 
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("Cảnh báo: Không tìm thấy Token trong LocalStorage!");
    }
    return config;
  });

export const userApi = {
  updateProfile: async (data: any) => {
    const response = await userAxios.put('/profile', data);
    return response.data;
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await userAxios.post('/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as { message: string; avatarUrl: string };
  }
};