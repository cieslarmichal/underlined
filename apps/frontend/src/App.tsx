import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, StrictMode, Suspense } from 'react';
import { AuthContextProvider } from './context/AuthContextProvider.tsx';

import Root from './pages/Root';
import { CookiesProvider } from 'react-cookie';
import HomePage from './pages/HomePage.tsx';
import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext.tsx';
import { TooltipProvider } from './components/ui/Tooltip.tsx';
import PrivateRoute from './auth/privateRoute.tsx';
import PublicRoute from './auth/publicRoute.tsx';
import AdminRoute from './auth/adminRoute.tsx';
import LogoutPage from './pages/LogoutPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx';
import NewPasswordPage from './pages/NewPasswordPage.tsx';
import VerifyEmailPage from './pages/VerifyEmailPage.tsx';
import NotFoundPage from './pages/NotFoundPage.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import ErrorPage from './pages/ErrorPage.tsx';
import AppShell from './components/AppShell.tsx';
import { getLastBookId } from './lib/lastBook.ts';

function HomeRoute() {
  const { userData, userDataInitialized } = useContext(AuthContext);
  if (!userDataInitialized) return null;
  if (userData?.role === 'admin')
    return (
      <Navigate
        to="/admin"
        replace
      />
    );
  if (userData) {
    const lastBookId = getLastBookId();
    return (
      <Navigate
        to={lastBookId ? `/books/${lastBookId}` : '/books'}
        replace
      />
    );
  }
  return <HomePage />;
}

const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage.tsx'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.tsx'));
const MyProfilePage = lazy(() => import('./pages/MyProfilePage.tsx'));
const BooksPage = lazy(() => import('./pages/BooksPage.tsx'));
const BookPage = lazy(() => import('./pages/BookPage.tsx'));
const ReviewPage = lazy(() => import('./pages/ReviewPage.tsx'));
const BoardPage = lazy(() => import('./pages/BoardPage.tsx'));

function AppPage({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense>{children}</Suspense>
    </ErrorBoundary>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <HomeRoute />,
      },
      {
        path: '/login',
        element: (
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        ),
      },
      {
        path: '/register',
        element: (
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        ),
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: '/new-password',
        element: <NewPasswordPage />,
      },
      {
        path: '/verify-email',
        element: <VerifyEmailPage />,
      },
      {
        path: '/logout',
        element: (
          <PrivateRoute>
            <LogoutPage />
          </PrivateRoute>
        ),
      },
      {
        element: (
          <PrivateRoute>
            <AppShell />
          </PrivateRoute>
        ),
        children: [
          {
            path: '/books',
            element: (
              <AppPage>
                <BooksPage />
              </AppPage>
            ),
          },
          {
            path: '/books/:id',
            element: (
              <AppPage>
                <BookPage />
              </AppPage>
            ),
          },
          {
            path: '/books/:bookId/review/:captureId',
            element: (
              <AppPage>
                <ReviewPage />
              </AppPage>
            ),
          },
          {
            path: '/words',
            element: (
              <AppPage>
                <BoardPage />
              </AppPage>
            ),
          },
          {
            path: '/profile',
            element: (
              <AppPage>
                <MyProfilePage />
              </AppPage>
            ),
          },
        ],
      },
      {
        path: '/admin',
        element: (
          <AdminRoute>
            <ErrorBoundary>
              <Suspense>
                <AdminDashboardPage />
              </Suspense>
            </ErrorBoundary>
          </AdminRoute>
        ),
      },
      {
        path: '/admin/users',
        element: (
          <AdminRoute>
            <ErrorBoundary>
              <Suspense>
                <AdminUsersPage />
              </Suspense>
            </ErrorBoundary>
          </AdminRoute>
        ),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

function App() {
  return (
    <StrictMode>
      <CookiesProvider>
        <AuthContextProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
        </AuthContextProvider>
      </CookiesProvider>
    </StrictMode>
  );
}

export default App;
