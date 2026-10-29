import { BookA, BookOpen, Library } from 'lucide-react';
import { matchPath, NavLink, Outlet, useLocation } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { getLastBookId } from '../lib/lastBook';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-14 py-2 text-xs font-medium transition-colors',
    isActive ? 'text-foreground' : 'text-muted-foreground',
  );

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
        className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex max-w-2xl">
          <NavLink
            to={lastBookId ? `/books/${lastBookId}` : '/books'}
            className={() => linkClass({ isActive: pathname.startsWith('/books/') })}
          >
            <BookOpen className="size-5" />
            Reading
          </NavLink>
          <NavLink
            to="/books"
            end
            className={linkClass}
          >
            <Library className="size-5" />
            Library
          </NavLink>
          <NavLink
            to="/words"
            className={linkClass}
          >
            <BookA className="size-5" />
            Words
          </NavLink>
        </div>
      </nav>
    </>
  );
}
