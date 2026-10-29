import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

import { site } from '../config';
import Logo from './Logo';

const productLinks = [
  { name: 'Home', href: '/' },
  { name: 'Sign In', href: '/login' },
  { name: 'Sign Up', href: '/register' },
];

const currentYear = new Date().getFullYear();

export default function Footer() {
  return (
    <footer
      className="bg-primary text-primary-foreground mt-auto"
      aria-label="Footer"
    >
      <div className="max-w-350 mx-auto px-4 lg:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr] gap-10">
          <div className="lg:pr-6">
            <Link
              to="/"
              className="flex items-center gap-3 group w-fit"
            >
              <Logo className="size-8 ring-1 ring-primary-foreground/20 transition-transform group-hover:scale-105" />
              <h2 className="text-xl font-bold tracking-tight">{site.name}</h2>
            </Link>
            <div className="flex items-center gap-2 mt-5">
              <a
                href={site.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold mb-4">Product</h3>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm opacity-70 hover:opacity-100 transition-opacity"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold mb-4">Contact</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href={`mailto:${site.contactEmail}`}
                  className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{site.contactEmail}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="max-w-350 mx-auto px-4 lg:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs opacity-60">
            © {currentYear} {site.name}. All rights reserved.
          </p>
          <p className="text-xs opacity-60">
            Crafted by{' '}
            <a
              href={site.authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold hover:opacity-100 underline underline-offset-2 transition-opacity"
            >
              {site.author}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
