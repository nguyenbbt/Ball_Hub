import { create } from 'zustand';

export type UserRole = 'ADMIN' | 'COACH' | 'PLAYER';
export type TeamStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const isTeamPending = (teamId?: string | null, teamStatus?: TeamStatus | null) =>
  !teamId || teamStatus === 'PENDING';

export const isTeamApproved = (teamStatus?: TeamStatus | null) => teamStatus === 'APPROVED';

const normalizeRole = (role?: string | null): UserRole | null => {
  if (!role) return null;
  const normalized = role.toUpperCase();
  if (normalized === 'ADMIN' || normalized === 'COACH' || normalized === 'PLAYER') {
    return normalized;
  }
  return null;
};

const normalizeUser = (raw: User | null): User | null => {
  if (!raw) return null;
  const role = normalizeRole(raw.role);
  if (!role) return null;
  return {
    ...raw,
    role,
    teamId: raw.teamId ?? null,
    teamStatus: raw.teamStatus ?? null,
  };
};

// Định nghĩa cấu trúc dữ liệu người dùng
export interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  teamId?: string | null;
  teamStatus?: TeamStatus | null;
  
  // Thông tin liên lạc
  phone?: string;
  contactInfo?: string;
  avatarUrl?: string; 
}

export const getUserHomePath = (user: User): string => {
  if (user.role === 'ADMIN') {
    return '/admin/pending-teams';
  }

  if (user.role === 'COACH') {
    if (!user.teamId) {
      return '/coach/register-team';
    }

    if (user.teamStatus === 'PENDING') {
      return '/coach/waiting-approval';
    }

    return isTeamApproved(user.teamStatus) ? '/coach/dashboard' : '/coach/register-team';
  }

  return isTeamPending(user.teamId, user.teamStatus) ? '/player/join' : '/player/dashboard';
};

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  updateUser: (userData: Partial<User>) => void; // Hàm để cập nhật UI ngay lập tức
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // 1. Khi khởi tạo, thử lấy user từ localStorage ra
  user: normalizeUser(JSON.parse(localStorage.getItem('user') || 'null')),
  token: localStorage.getItem('token'),
  
  setAuth: (user, token) => {
    const normalizedUser = normalizeUser(user);
    if (!normalizedUser) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null });
      return;
    }
    // 2. Lưu cả user vào localStorage dưới dạng string JSON
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    set({ user: normalizedUser, token });
  },

  updateUser: (userData) => {
    set((state) => {
      const newUser = state.user ? normalizeUser({ ...state.user, ...userData }) : null;
      // 3. Cập nhật lại localStorage khi user thay đổi thông tin
      if (newUser) localStorage.setItem('user', JSON.stringify(newUser));
      return { user: newUser };
    });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // Xóa sạch khi logout
    set({ user: null, token: null });
  },
}));