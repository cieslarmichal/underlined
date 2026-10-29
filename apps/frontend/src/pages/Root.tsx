import { useContext } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';

import Footer from '../components/Footer';
import Header from '../components/Header';
import InstallHint from '../components/InstallHint';
import { Toaster } from '../components/ui/Sonner';
import { AuthContext } from '../context/AuthContext';

export default function Root() {
  const { userData } = useContext(AuthContext);

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <Header />
      {userData && <InstallHint />}
      <main className="w-full flex-1">
        <ScrollRestoration />
        <Outlet />
        <Toaster richColors />
      </main>
      {!userData && <Footer />}
    </div>
  );
}
