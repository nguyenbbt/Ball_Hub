import { axiosClient } from '@/api/axiosClient';

export const notificationsApi = {
  getTeamNotifications: async (teamId: string) => {
    const res = await axiosClient.get(`/notifications/team/${teamId}`);
    return res.data;
  },
  markAsRead: async (id: string) => {
    const res = await axiosClient.put(`/notifications/${id}/read`);
    return res.data;
  },
  markAllAsRead: async (teamId: string) => {
    const res = await axiosClient.put(`/notifications/team/${teamId}/read-all`);
    return res.data;
  }
};