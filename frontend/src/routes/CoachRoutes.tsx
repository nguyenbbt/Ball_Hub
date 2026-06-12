import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTeamStore } from '../store/useTeamStore';
import { getUserHomePath, useAuthStore } from '../store/useAuthStore';
import CoachLayout from '../layouts/CoachLayout';
import DashboardPage from '../pages/coach/DashboardPage'; 
import RosterPage from '../pages/coach/RosterPage';
import TacticsPage from '../pages/coach/TacticsPage';
import RegisterTeam from '../pages/coach/RegisterTeam';
import WaitingApproval from '../pages/coach/WaitingApproval';
import SchedulePage from '../pages/coach/SchedulePage';
import InventoryPage from '../pages/coach/InventoryPage';
import TasksPage from '../pages/coach/TasksPage';
import MatchPage from '@/pages/coach/MatchPage';
import FinancePage from '../pages/coach/FinancePage';
import { Statistics } from '../features/statistics/components/Statistics';
const CoachRoutes = () => {
  const { team, isFetched, fetchRoster } = useTeamStore();
  const user = useAuthStore((state) => state.user);
  const teamId = user?.teamId ?? null;
  const teamStatus = user?.teamStatus ?? null;
  const needsTeam = !teamId || teamStatus === 'REJECTED';
  const isPending = teamId && teamStatus === 'PENDING';

  useEffect(() => {
    if (!isFetched && !needsTeam && !isPending) {
      fetchRoster();
    }
  }, [isFetched, fetchRoster, needsTeam, isPending]);

  if (!needsTeam && !isPending && !isFetched) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">sports_soccer</span>
          <p>Đang đồng bộ dữ liệu đội bóng...</p>
        </div>
      </div>
    );
  }

  if (needsTeam) {
    return (
      <Routes>
        <Route path="register-team" element={<RegisterTeam />} />
        <Route path="*" element={<Navigate to="register-team" replace />} />
      </Routes>
    );
  }

  if (isPending) {
    return (
      <Routes>
        <Route path="waiting-approval" element={<WaitingApproval />} />
        <Route path="*" element={<Navigate to="waiting-approval" replace />} />
      </Routes>
    );
  }

  if (!team && user) {
    return <Navigate to={getUserHomePath(user)} replace />;
  }

  return (
    <Routes>
      <Route element={<CoachLayout />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="roster" element={<RosterPage />} />
        <Route path="tactics" element={<TacticsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="tasks" element={<TasksPage />} />
        {/* Đã xóa dòng schedule bị lặp ở đây */}
        <Route path="match" element={<MatchPage />} />
        <Route path="stats" element={<Statistics />} />

        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default CoachRoutes;