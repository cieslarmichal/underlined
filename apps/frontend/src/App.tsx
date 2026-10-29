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

function HomeRoute() {
  const { userData } = useContext(AuthContext);
  if (userData?.role === 'admin') return <Navigate to="/admin" replace />;
  return <HomePage />;
}

const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage.tsx'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.tsx'));
const MyProfilePage = lazy(() => import('./pages/MyProfilePage.tsx'));

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
        path: '/profile',
        element: (
          <PrivateRoute>
            <ErrorBoundary>
              <Suspense>
                <MyProfilePage />
              </Suspense>
            </ErrorBoundary>
          </PrivateRoute>
        ),
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
