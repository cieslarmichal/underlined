import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { site } from '../config';
import { useSEO } from '../hooks/useSEO';

export default function NotFoundPage() {
  useSEO({ title: `Page not found - ${site.name}`, noindex: true });

  return (
    <div className="min-h-[calc(100vh-72px)] bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-8xl font-bold text-gray-200">404</p>
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="text-gray-500">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link to="/">
          <Button className="mt-2">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
