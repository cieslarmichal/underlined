import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.tsx';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { userData, userDataInitialized } = useContext(AuthContext);
  const location = useLocation();

  if (!userDataInitialized) {
    return null;
  }

  if (!userData) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return <>{children}</>;
}
