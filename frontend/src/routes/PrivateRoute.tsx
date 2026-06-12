import { Navigate, Outlet } from 'react-router-dom';
import { getUserHomePath, useAuthStore, UserRole } from '../store/useAuthStore';

type PrivateRouteProps = {
  allowedRoles?: UserRole[];
};

const PrivateRoute = ({ allowedRoles }: PrivateRouteProps) => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getUserHomePath(user)} replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
