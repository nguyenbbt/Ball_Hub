import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { teamsApi } from '../api';
import { getUserHomePath, useAuthStore } from '../../../store/useAuthStore';
import { useTeamStore } from '../../../store/useTeamStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SetupFormData {
  teamName?: string;
  inviteCode?: string;
}

export const TeamSetup = () => {
  const user = useAuthStore((state) => state.user);
  // 1. Thêm hàm updateUser từ store để cập nhật dữ liệu cục bộ
  const updateUser = useAuthStore((state) => state.updateUser); 
  const fetchRoster = useTeamStore((state) => state.fetchRoster);
  const navigate = useNavigate();
  
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<SetupFormData>();

  const isCoach = user?.role === 'COACH';

  const onSubmit = async (data: SetupFormData) => {
    setError(null);
    try {
      if (isCoach) {
        if (!data.teamName) return setError('Vui lòng nhập tên đội bóng.');
        const res = await teamsApi.createTeam(data.teamName);
        // Cập nhật teamId mới cho Coach vào Zustand store
        updateUser({ teamId: res.teamId, teamStatus: res.status });
      } else {
        if (!data.inviteCode) return setError('Vui lòng nhập mã mời.');
        const res = await teamsApi.joinTeam(data.inviteCode);
        // Cập nhật teamId mới cho Player vào Zustand store
        updateUser({ teamId: res.teamId, teamStatus: res.teamStatus });
      }
      
      await fetchRoster(); // Fetch thông tin đội bóng mới nhất
      
      // 2. Lấy user MỚI NHẤT từ store (đã có teamId) để điều hướng chính xác
      const latestUser = useAuthStore.getState().user;
      if (latestUser) {
        navigate(getUserHomePath(latestUser));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng kiểm tra lại mã mời.');
    }
  };

  return (
    <main className="dark min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background text-foreground">
      
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-primary rounded-full blur-[120px] -top-64"></div>
      </div>

      <div className="w-full max-w-[480px] z-10">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl signature-gradient flex items-center justify-center shadow-lg shadow-primary/20 mb-6">
            <span className="material-symbols-outlined text-3xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isCoach ? 'shield' : 'group_add'}
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-white mb-2">
            {isCoach ? 'Create Your Dynasty' : 'Join Your Squad'}
          </h1>
          <p className="text-muted-foreground text-sm font-medium tracking-tight">
            {isCoach ? 'Thiết lập trung tâm chỉ huy cho đội bóng của bạn.' : 'Nhập mã mời từ huấn luyện viên để kết nối.'}
          </p>
        </div>

        {/* Form Panel */}
        <div className="glass-panel p-8 rounded-2xl border border-border shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                {isCoach ? 'Tên đội bóng' : 'Mã mời (Invite Code)'}
              </label>
              <Input 
                type="text"
                {...register(isCoach ? 'teamName' : 'inviteCode')}
                placeholder={isCoach ? "VD: Saigon Heat Uni" : "VD: A1B2C3D4"}
                maxLength={isCoach ? 50 : 8}
                className="w-full h-14 bg-surface-container-highest border-none rounded-xl px-4 text-white focus-visible:ring-primary/30 transition-all placeholder:text-muted-foreground/50 font-medium" 
              />
            </div>

            {error && (
              <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full h-14 signature-gradient text-on-primary font-bold rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Đang xử lý...' : (isCoach ? 'Tạo đội bóng' : 'Tham gia ngay')}
            </Button>
          </form>
        </div>
      </div>

      {/* Grid Lines Background */}
      <div className="fixed top-0 left-0 w-full h-full -z-50 opacity-10 pointer-events-none">
        <div className="absolute w-[1px] h-full left-1/4 bg-border"></div>
        <div className="absolute w-[1px] h-full left-2/4 bg-border"></div>
        <div className="absolute w-[1px] h-full left-3/4 bg-border"></div>
        <div className="absolute h-[1px] w-full top-1/4 bg-border"></div>
        <div className="absolute h-[1px] w-full top-2/4 bg-border"></div>
        <div className="absolute h-[1px] w-full top-3/4 bg-border"></div>
      </div>
    </main>
  );
};