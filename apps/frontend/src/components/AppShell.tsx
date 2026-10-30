import { BookA, BookOpen, Library, type LucideIcon } from 'lucide-react';
import { matchPath, NavLink, Outlet, useLocation } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { getLastBookId } from '../lib/lastBook';

const linkClass = 'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-14 py-1.5 text-xs font-medium transition-colors';

function NavItem({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active: boolean }) {
  return (
    <>
      <span
        className={cn(
          'flex h-7 w-14 items-center justify-center rounded-full transition-colors',
          active ? 'bg-highlight text-highlight-foreground' : 'text-muted-foreground',
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className={active ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </>
  );
}

// Layout of the signed-in app: content above a bottom navigation like in a native app.
export default function AppShell() {
  const { pathname } = useLocation();
  // The page stores the last book in an effect, so on the first render of a book page read it from the URL.
  const lastBookId = matchPath('/books/:id/*', pathname)?.params.id ?? getLastBookId();

  return (
    <>
      <div className="pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </div>
      <nav
        aria-label="Main"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex max-w-2xl">
          <NavLink
            to={lastBookId ? `/books/${lastBookId}` : '/books'}
            className={linkClass}
          >
            <NavItem
              icon={BookOpen}
              label="Reading"
              active={pathname.startsWith('/books/')}
            />
          </NavLink>
          <NavLink
            to="/books"
            end
            className={linkClass}
          >
            {({ isActive }) => (
              <NavItem
                icon={Library}
                label="Library"
                active={isActive}
              />
            )}
          </NavLink>
          <NavLink
            to="/words"
            className={linkClass}
          >
            {({ isActive }) => (
              <NavItem
                icon={BookA}
                label="Words"
                active={isActive}
              />
            )}
          </NavLink>
        </div>
      </nav>
    </>
  );
}
