import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginForm } from '../features/auth/components/LoginForm';
import { RegisterForm } from '../features/auth/components/RegisterForm';
import CoachRoutes from './CoachRoutes';
import PlayerRoutes from './PlayerRoutes';
import { getUserHomePath, useAuthStore } from '../store/useAuthStore';
import PrivateRoute from './PrivateRoute'; // 1. Import PrivateRoute
import AdminLayout from '../layouts/AdminLayout';
import PendingTeams from '../pages/admin/PendingTeams';

// Chặn người dùng đã đăng nhập quay lại trang Login/Register
const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  
  if (token && user) {
    return <Navigate to={getUserHomePath(user)} replace />;
  }
  return children;
};

const SetupRedirect = () => {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getUserHomePath(user)} replace />;
};

export const AppRouter = () => {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PublicRoute><LoginForm /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterForm /></PublicRoute>} />
        
        {/* 2. Sử dụng PrivateRoute để bọc các route cần bảo vệ */}
        <Route element={<PrivateRoute />}>
          <Route path="/setup" element={<SetupRedirect />} />
        </Route>

        <Route element={<PrivateRoute allowedRoles={['COACH']} />}>
          <Route path="/coach/*" element={<CoachRoutes />} />
        </Route>

        <Route element={<PrivateRoute allowedRoles={['PLAYER']} />}>
          <Route path="/player/*" element={<PlayerRoutes />} />
        </Route>

        <Route element={<PrivateRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/pending-teams" replace />} />
            <Route path="pending-teams" element={<PendingTeams />} />
          </Route>
        </Route>
        
        {/* 404 Route */}
        <Route path="*" element={<div className="p-8 text-center text-2xl font-bold text-white">404 - Trang không tồn tại</div>} />
      </Routes>
    </div>
  );
};