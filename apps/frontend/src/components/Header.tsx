import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { site } from '../config';
import { LogOut, User } from 'lucide-react';
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '@/components/ui/Menubar';
import Logo from './Logo';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';

export default function Header() {
  const { userData, userDataInitialized } = useContext(AuthContext);
  const navigate = useNavigate();

  const initial = (userData?.email?.[0] || 'U').toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="max-w-350 mx-auto flex items-center px-4 lg:px-6 py-3">
        <div className="w-48 flex items-center">
          <Link
            to={'/'}
            aria-label={site.name}
            className="flex items-center gap-3 group"
          >
            <Logo className="transition-transform group-hover:scale-105" />
            <span className="hidden sm:block text-xl font-bold text-foreground tracking-tight whitespace-nowrap">
              {site.name}
            </span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-end gap-4">
          {!userDataInitialized ? (
            <div className="flex items-center gap-2 lg:gap-3">
              <Skeleton className="h-10 w-10 rounded-full bg-muted" />
            </div>
          ) : userData ? (
            <div className="flex justify-end">
              <Menubar className="rounded-none space-x-0 border-none data-[state=open]:!bg-none">
                <MenubarMenu>
                  <MenubarTrigger
                    omitOpenBg
                    className="relative h-10 w-10 cursor-pointer overflow-hidden rounded-full border border-border bg-card p-0 shadow-xs transition-colors hover:border-foreground/30 focus:bg-card data-[state=open]:border-foreground/40 data-[state=open]:bg-card"
                  >
                    <span className="h-full w-full flex items-center justify-center text-sm font-bold text-gray-900 select-none group-hover:text-gray-700 transition-colors">
                      {initial}
                    </span>
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem
                      onClick={() => navigate('/profile')}
                      className="cursor-pointer flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      My Profile
                    </MenubarItem>
                    <MenubarItem
                      onClick={() => navigate('/logout')}
                      className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </div>
          ) : (
            <div className="min-w-[120px] flex items-center gap-3 justify-end">
              <Button
                variant="link"
                size="lg"
                onClick={() => navigate('/login')}
                className="text-sm font-medium"
              >
                Sign In
              </Button>
              <Button
                size="lg"
                onClick={() => navigate('/register')}
                className="text-sm font-semibold rounded-md"
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
