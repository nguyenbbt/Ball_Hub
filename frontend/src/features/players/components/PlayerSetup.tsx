import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { axiosClient } from '@/api/axiosClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PlayerProfileForm {
  position: 'PG' | 'SG' | 'SF' | 'PF' | 'C' | '';
  jerseyNumber: number | string;
  height: string;
  weight: string;
  age: number | string;
}

interface Props {
  onComplete: () => void;
}

export const PlayerSetup = ({ onComplete }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<PlayerProfileForm>({
    defaultValues: {
      position: '',
      jerseyNumber: '',
      height: '',
      weight: '',
      age: ''
    }
  });

  const onSubmit = async (data: PlayerProfileForm) => {
    setError(null);
    try {
      const payload: Record<string, any> = {};

      if (data.position) {
        payload.position = data.position.toUpperCase(); // Đảm bảo luôn viết hoa khớp enum
      }
      
      if (data.jerseyNumber !== '' && data.jerseyNumber !== null) {
        const num = Number(data.jerseyNumber);
        if (!isNaN(num)) payload.jerseyNumber = num;
      }

      if (data.age !== '' && data.age !== null) {
        const num = Number(data.age);
        if (!isNaN(num)) payload.age = num;
      }

      if (data.height && data.height.trim() !== '') {
        payload.height = data.height.trim();
      }

      if (data.weight && data.weight.trim() !== '') {
        payload.weight = data.weight.trim();
      }

      // Gửi request lên backend để tạo/cập nhật PlayerProfile
      await axiosClient.put('/players/profile', payload);
      
      // Thành công chuyển tiếp sang bước Join Team (Nhập mã mời)
      onComplete(); 
    } catch (err: any) {
      console.error("Lỗi khi lưu profile:", err);
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo hồ sơ cầu thủ.');
    }
  };

  return (
    <main className="dark min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background text-foreground">
      {/* Grid Lines Background */}
      <div className="fixed top-0 left-0 w-full h-full -z-50 opacity-10 pointer-events-none">
        <div className="absolute w-[1px] h-full left-1/4 bg-border"></div>
        <div className="absolute w-[1px] h-full left-2/4 bg-border"></div>
        <div className="absolute w-[1px] h-full left-3/4 bg-border"></div>
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-20 pointer-events-none signature-gradient blur-[150px] rounded-full"></div>

      <div className="w-full max-w-md space-y-8 z-10 bg-surface-container/40 p-8 rounded-3xl border border-border/50 backdrop-blur-xl shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-2">
            <span className="material-symbols-outlined text-3xl">badge</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            HỒ SƠ CẦU THỦ
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Vui lòng hoàn thiện thông tin thi đấu của bạn.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Vị trí thi đấu */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Vị trí sở trường</label>
            <select
              {...register('position')}
              className="h-12 w-full bg-surface-container-highest border-none rounded-xl px-4 text-white focus:ring-2 focus:ring-primary/30 outline-none font-medium appearance-none"
            >
              <option value="" disabled hidden>Chọn vị trí...</option>
              <option value="PG">PG - Hậu vệ dẫn bóng</option>
              <option value="SG">SG - Hậu vệ ghi điểm</option>
              <option value="SF">SF - Tiền phong phụ</option>
              <option value="PF">PF - Tiền phong chính</option>
              <option value="C">C - Trung phong</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Số áo */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Số áo mong muốn</label>
              <Input 
                type="number"
                {...register('jerseyNumber')}
                placeholder="VD: 23"
                className="h-12 bg-surface-container-highest border-none rounded-xl text-white" 
              />
            </div>

            {/* Độ tuổi */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Độ tuổi</label>
              <Input 
                type="number"
                {...register('age')}
                placeholder="VD: 22"
                className="h-12 bg-surface-container-highest border-none rounded-xl text-white" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Chiều cao */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Chiều cao</label>
              <Input 
                type="text"
                {...register('height')}
                placeholder="VD: 185cm"
                className="h-12 bg-surface-container-highest border-none rounded-xl text-white" 
              />
            </div>

            {/* Cân nặng */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Cân nặng</label>
              <Input 
                type="text"
                {...register('weight')}
                placeholder="VD: 80kg"
                className="h-12 bg-surface-container-highest border-none rounded-xl text-white" 
              />
            </div>
          </div>

          {error && (
            <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-lg border border-destructive/20 font-medium">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full h-14 signature-gradient text-on-primary font-bold rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {isSubmitting ? 'Đang lưu...' : 'Hoàn tất & Tiếp tục'}
          </Button>
        </form>
      </div>
    </main>
  );
};