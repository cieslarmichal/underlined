import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import RegisterForm from '../components/RegisterForm';
import { site } from '../config';
import { useSEO } from '../hooks/useSEO';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [isRegistrationSuccess, setIsRegistrationSuccess] = useState(false);

  useSEO({ title: `Sign Up - ${site.name}`, description: `Create your ${site.name} account.` });

  if (isRegistrationSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center pt-32">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center pb-3">
            <h2 className="text-3xl font-bold text-black leading-tight tracking-tight">Check your email</h2>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-8">
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto border border-gray-200">
                  <svg
                    className="w-8 h-8 text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-black">Confirm your email</h3>
                <p className="text-gray-600">
                  We sent a confirmation link to your inbox. Click it to activate your account, then sign in.
                </p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                variant="default"
                size="lg"
                className="w-full h-11 rounded-lg shadow-sm hover:shadow-md"
                data-testid="back-to-sign-in-button"
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center pt-32">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center pb-3">
          <h2 className="text-3xl font-bold text-black leading-tight tracking-tight">Create Account</h2>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-8">
          <RegisterForm onSuccess={() => setIsRegistrationSuccess(true)} />
          <div className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-black font-semibold hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
