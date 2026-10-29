import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getAdminUsers, type AdminUsersResponse } from '../api/queries/getAdminUsers';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { useSEO } from '../hooks/useSEO';
import { useDebounce } from '../hooks/useDebounce';
import { site } from '../config';

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  useSEO({ title: `Users - Admin - ${site.name}`, noindex: true });

  const [response, setResponse] = useState<AdminUsersResponse | null>(null);
  const [loadedParams, setLoadedParams] = useState<{ page: number; email: string } | null>(null);
  const [page, setPage] = useState(1);
  const [emailFilter, setEmailFilter] = useState('');
  const debouncedEmail = useDebounce(emailFilter, 400);

  const [prevDebouncedEmail, setPrevDebouncedEmail] = useState(debouncedEmail);
  if (debouncedEmail !== prevDebouncedEmail) {
    setPrevDebouncedEmail(debouncedEmail);
    setPage(1);
  }

  const loading = loadedParams === null || loadedParams.page !== page || loadedParams.email !== debouncedEmail;

  useEffect(() => {
    let ignore = false;

    getAdminUsers({ page, pageSize: PAGE_SIZE, email: debouncedEmail || undefined })
      .then((data) => {
        if (ignore) return;
        setResponse(data);
        setLoadedParams({ page, email: debouncedEmail });
      })
      .catch(() => {
        if (ignore) return;
        toast.error('Failed to load users');
        setLoadedParams({ page, email: debouncedEmail });
      });

    return () => {
      ignore = true;
    };
  }, [page, debouncedEmail]);

  const totalPages = response ? Math.ceil(response.metadata.total / PAGE_SIZE) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        {response && (
          <span className="text-sm text-muted-foreground">{response.metadata.total} total</span>
        )}
      </div>

      <div className="mb-4">
        <Input
          placeholder="Filter by email..."
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  </tr>
                ))
              : response?.data.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {user.isEmailVerified ? (
                        <Badge variant="outline">Verified</Badge>
                      ) : (
                        <Badge variant="destructive">Unverified</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && response?.data.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">No users found.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
