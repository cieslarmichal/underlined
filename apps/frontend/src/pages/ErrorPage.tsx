import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function ErrorPage() {
  const error = useRouteError();

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Something went wrong';

  const message = isRouteErrorResponse(error)
    ? error.data
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-8xl font-bold text-gray-200">{isRouteErrorResponse(error) ? error.status : '!'}</p>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {message && <p className="text-gray-500">{message}</p>}
        <Link to="/">
          <Button className="mt-2">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
