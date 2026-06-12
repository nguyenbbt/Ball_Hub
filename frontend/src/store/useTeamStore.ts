import { create } from 'zustand';
import { teamsApi } from '../features/teams/api';
import { useAuthStore } from './useAuthStore';

interface TeamState {
  team: any | null;
  coach: any | null;
  players: any[];
  isLoading: boolean;
  isFetched: boolean; // Đánh dấu xem đã gọi API lần nào chưa
  fetchRoster: () => Promise<void>;
  clearTeam: () => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  team: null,
  coach: null,
  players: [],
  isLoading: false,
  isFetched: false,

  fetchRoster: async () => {
    // Chặn ngay lập tức nếu không có token để tránh lỗi 401
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true });
    try {
      const data = await teamsApi.getRoster();
      set({ 
        team: data.team, 
        coach: data.coach, 
        players: data.players, 
        isLoading: false,
        isFetched: true
      });
    } catch (error) {
      console.error("Lỗi lấy dữ liệu đội bóng:", error);
      set({ isLoading: false, isFetched: true });
    }
  },

  clearTeam: () => set({ team: null, coach: null, players: [], isFetched: false }),
}));