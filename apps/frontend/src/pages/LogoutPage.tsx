import { useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LogoutPage() {
  const navigate = useNavigate();

  const { clearUserData } = useContext(AuthContext);

  useEffect(() => {
    const handleLogout = async () => {
      await clearUserData();
      navigate('/');
    };

    handleLogout();
  }, [clearUserData, navigate]);

  return <div>Logging out...</div>;
}
