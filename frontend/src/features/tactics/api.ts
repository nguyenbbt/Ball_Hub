import { axiosClient } from '@/api/axiosClient';
import { Tactic, Position, TacticNote } from './types';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type CreateTacticPayload = {
  name: string;
  players: Position[];
  notes: TacticNote[];
};

type UpdateTacticPayload = {
  name?: string;
  players?: Position[];
  notes?: TacticNote[];
};

const basePath = '/tactics';

export const tacticApi = {
  getTactics: () => axiosClient.get<ApiResponse<Tactic[]>>(basePath),
  getTacticById: (id: string) => axiosClient.get<ApiResponse<Tactic>>(`${basePath}/${id}`), // ĐÃ THÊM API LẤY CHI TIẾT
  createTactic: (payload: CreateTacticPayload) => axiosClient.post<ApiResponse<Tactic>>(basePath, payload),
  updateTactic: (id: string, payload: UpdateTacticPayload) =>
    axiosClient.put<ApiResponse<Tactic>>(`${basePath}/${id}`, payload),
  deleteTactic: (id: string) => axiosClient.delete<{ success: boolean; message: string }>(`${basePath}/${id}`),
};