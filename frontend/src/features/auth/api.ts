import { axiosClient } from '../../api/axiosClient';
import type { LoginCredentials, RegisterData, AuthResponse } from './types';

export const authApi = {
  login: (data: LoginCredentials) =>
    axiosClient.post<AuthResponse>('/auth/login', data).then((res) => res.data),

  register: (data: RegisterData) =>
    axiosClient.post<AuthResponse>('/auth/register', data).then((res) => res.data),
};
