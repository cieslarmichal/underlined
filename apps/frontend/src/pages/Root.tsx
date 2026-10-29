import { Outlet, ScrollRestoration } from 'react-router-dom';

import Footer from '../components/Footer';
import Header from '../components/Header';
import { Toaster } from '../components/ui/Sonner';

export default function Root() {
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header />
      <main className="w-full flex-1">
        <ScrollRestoration />
        <Outlet />
        <Toaster richColors />
      </main>
      <Footer />
    </div>
  );
}
