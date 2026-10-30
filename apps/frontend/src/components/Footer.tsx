import { Link } from 'react-router-dom';

import { site } from '../config';
import Logo from './Logo';

const links = [
  { name: 'Sign in', href: '/login' },
  { name: 'Create account', href: '/register' },
];

const currentYear = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/60">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-start sm:justify-between lg:px-6">
        <div className="max-w-xs">
          <Link
            to="/"
            aria-label={site.name}
            className="flex w-fit items-center gap-3"
          >
            <Logo className="size-8" />
            <span className="font-serif text-xl font-semibold tracking-tight">{site.name}</span>
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Read paper books in another language and keep every word you underline, with its real context.
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-col gap-1 text-sm sm:items-end"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="flex min-h-11 items-center text-muted-foreground transition-colors hover:text-foreground sm:justify-end"
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-5xl px-4 py-5 text-xs text-muted-foreground lg:px-6">
          © {currentYear} {site.name}
        </p>
      </div>
    </footer>
  );
}
