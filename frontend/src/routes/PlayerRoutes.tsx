import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTeamStore } from '../store/useTeamStore';
import { useAuthStore } from '../store/useAuthStore';
import { axiosClient } from '../api/axiosClient';

import PlayerLayout from '../layouts/PlayerLayout';
import DashboardPage from '../pages/player/DashboardPage';
import { TeamSetup } from '../features/teams/components/TeamSetup';
import { PlayerSetup } from '../features/players/components/PlayerSetup';

// Import các Feature Component
import { Schedule } from '../features/calendar/Schedule';
import { RosterFeature } from '../features/teams/components/RosterFeature';
import { Matches } from '../features/matches/components/MatchFeature';
import { Tasks } from '../features/tasks/components/TaskFeature';

const PlayerRoutes = () => {
  const { team, isFetched: isTeamFetched, fetchRoster } = useTeamStore();
  const user = useAuthStore((state) => state.user);
  const teamId = user?.teamId ?? null;
  const needsTeam = !teamId || teamId === 'PENDING';

  // State mới để kiểm tra Profile
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [isProfileChecking, setIsProfileChecking] = useState(true);

  // Kiểm tra Profile trước
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const res = await axiosClient.get('/players/me');
        setHasProfile(res.data.hasProfile);
      } catch (e) {
        setHasProfile(false);
      } finally {
        setIsProfileChecking(false);
      }
    };
    checkProfile();
  }, []);

  // Fetch Roster nếu đã có Profile và Đã vào Đội
  useEffect(() => {
    if (!isTeamFetched && !needsTeam && hasProfile) {
      fetchRoster();
    }
  }, [isTeamFetched, fetchRoster, needsTeam, hasProfile]);

  // Đang tải dữ liệu
  if (isProfileChecking || (!needsTeam && !isTeamFetched)) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">sports_basketball</span>
          <p>Đang tải dữ liệu cầu thủ...</p>
        </div>
      </div>
    );
  }

  // LUỒNG 1: CHƯA CÓ PROFILE -> Hiển thị form tạo Profile
  if (!hasProfile) {
    return (
      <Routes>
        <Route path="setup" element={<PlayerSetup onComplete={() => setHasProfile(true)} />} />
        <Route path="*" element={<Navigate to="setup" replace />} />
      </Routes>
    );
  }

  // LUỒNG 2: ĐÃ CÓ PROFILE NHƯNG CHƯA CÓ ĐỘI -> Hiện form nhập Invite Code
  if (needsTeam) {
    return (
      <Routes>
        <Route path="join" element={<TeamSetup />} />
        <Route path="*" element={<Navigate to="join" replace />} />
      </Routes>
    );
  }

  // LUỒNG 3: ĐÃ VÀO ĐỘI BÓNG -> Khởi chạy bộ Giao diện Player
  return (
    <Routes>
      <Route element={<PlayerLayout />}>
        <Route path="dashboard" element={<DashboardPage />} />
        
        {/* Các chức năng của Player (Truyền role="PLAYER" để Component tự động khóa quyền chỉnh sửa) */}
        <Route path="schedule" element={<div className="animate-in fade-in duration-500"><Schedule role="PLAYER" /></div>} />
        <Route path="roster" element={<div className="animate-in fade-in duration-500"><RosterFeature role="PLAYER" /></div>} />
        <Route path="match" element={<div className="animate-in fade-in duration-500"><Matches role="PLAYER" /></div>} />
        <Route path="tasks" element={<div className="animate-in fade-in duration-500"><Tasks role="PLAYER" /></div>} />
        
        {/* Redirect về Dashboard nếu nhập sai link */}
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default PlayerRoutes;