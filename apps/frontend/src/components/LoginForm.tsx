import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, EyeIcon, EyeOffIcon } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { loginUser } from '../api/queries/login';
import { getMyUser } from '../api/queries/getMyUser';
import { ApiError } from '../api/ApiError';

const formSchema = z.object({
  email: z.string().email().max(64),
  password: z.string().min(8).max(64),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname;
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await loginUser({ email: values.email, password: values.password });
      const user = await getMyUser();
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate(from ?? '/', { replace: true });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isErrorType('TooManyRequestsError')) {
          form.setError('root', {
            message: 'Too many login attempts. Please try again in a few minutes.',
          });
          return;
        }

        if (error.isErrorType('ForbiddenAccessError')) {
          const reason = error.getContextValue<string>('reason');

          if (reason === 'User email is not verified.') {
            form.setError('root', {
              message:
                'Your account has not been activated yet. Check your email inbox (including spam folder) and click the activation link.',
            });
            return;
          }
        }

        if (error.isErrorType('UnauthorizedAccessError')) {
          form.setError('root', {
            message: 'Invalid email address or password',
          });
          return;
        }

        form.setError('root', {
          message: error.message || 'An error occurred during login',
        });
        return;
      }

      form.setError('root', {
        message: 'Invalid email address or password',
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <FormControl>
                  <Input
                    placeholder="name@domain.com"
                    className="pl-11 h-12 rounded-xl"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700 font-medium">Password</FormLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <FormControl>
                  <Input
                    placeholder="Enter your password"
                    type={showPassword ? 'text' : 'password'}
                    className="pl-11 pr-11 h-12 rounded-xl"
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 h-full px-3 text-gray-400 hover:text-gray-600 hover:bg-transparent"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Link
            to="/forgot-password"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {form.formState.errors.root && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm">
            {form.formState.errors.root.message}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-12 rounded-xl font-semibold text-base shadow-sm hover:shadow-md transition-all"
          disabled={!form.formState.isValid || form.formState.isSubmitting}
          data-testid="login-submit-button"
        >
          {form.formState.isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </Form>
  );
}
