import { Link } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { site } from '../config';
import { useSEO } from '../hooks/useSEO';

export default function LoginPage() {
  useSEO({ title: `Sign In - ${site.name}`, description: `Sign in to your ${site.name} account.` });

  return (
    <div className="min-h-[calc(100dvh-65px)] bg-background flex justify-center pt-12 sm:pt-24">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center pb-3">
          <h2 className="font-serif text-3xl font-semibold text-foreground leading-tight tracking-tight">Log into your account</h2>
        </div>

        <div className="bg-card rounded-2xl border border-gray-100 shadow-sm p-8">
          <LoginForm />
          <div className="mt-4 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="text-foreground font-semibold hover:underline"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
