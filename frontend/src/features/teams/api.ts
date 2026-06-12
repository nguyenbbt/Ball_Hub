import { axiosClient } from '@/api/axiosClient';

export const teamsApi = {
  // Hàm tạo đội (Dành cho Coach)
  createTeam: async (name: string) => {
    const response = await axiosClient.post('/teams/create', { name });
    return response.data;
  },

  // Hàm tham gia đội (Dành cho Player)
  joinTeam: async (inviteCode: string) => {
    const response = await axiosClient.post('/teams/join', { inviteCode });
    return response.data;
  },

  // Hàm lấy danh sách thành viên (Dành cho cả Coach và Player)
  getRoster: async () => {
    // Gọi thẳng vào router /teams/roster mà bạn đã thiết lập
    const response = await axiosClient.get('/teams/roster');
    return response.data;
  }
};