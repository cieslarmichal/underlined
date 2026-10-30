import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.tsx';

export default function PublicRoute({ children }: { children: React.ReactNode }) {
  const { userData, userDataInitialized } = useContext(AuthContext);

  if (!userDataInitialized) {
    return null;
  }

  if (userData) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return <>{children}</>;
}
