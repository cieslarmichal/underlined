import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { userData, userDataInitialized } = useContext(AuthContext);
  const location = useLocation();

  if (!userDataInitialized) {
    return null;
  }

  if (!userData) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (userData.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
