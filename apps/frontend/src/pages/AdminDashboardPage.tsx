import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { site } from '../config';
import { useSEO } from '../hooks/useSEO';

interface Tile {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

const tiles: Tile[] = [
  {
    title: 'Users',
    description: 'Manage registered accounts, view roles and verification status',
    icon: <Users className="w-6 h-6" />,
    href: '/admin/users',
    color: 'bg-secondary text-foreground',
  },
];

export default function AdminDashboardPage() {
  useSEO({ title: `Admin - ${site.name}`, noindex: true });

  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-72px)] bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tiles.map((tile) => (
            <button
              key={tile.href}
              onClick={() => navigate(tile.href)}
              className="group text-left bg-card rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-6 cursor-pointer"
            >
              <div className={`inline-flex p-3 rounded-xl mb-4 ${tile.color}`}>{tile.icon}</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors">
                {tile.title}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">{tile.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
