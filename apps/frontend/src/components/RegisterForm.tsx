import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Mail, Lock, EyeIcon, EyeOffIcon, InfoIcon } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { registerUser } from '../api/queries/register';
import { ApiError } from '../api/ApiError';

const formSchema = z.object({
  email: z.string().email('Invalid email address').max(64),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64)
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one digit')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  onSuccess?: () => void;
}

export default function RegisterForm({ onSuccess }: Props) {
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
      await registerUser({ email: values.email, password: values.password });
      onSuccess?.();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isErrorType('ResourceAlreadyExistsError')) {
          form.setError('email', {
            message: 'An account with this email already exists.',
          });
          return;
        }

        if (error.isErrorType('TooManyRequestsError')) {
          form.setError('root', {
            message: 'Too many registration attempts. Please try again in a few minutes.',
          });
          return;
        }

        form.setError('root', {
          message: error.message || 'Registration error',
        });
        return;
      }

      form.setError('root', {
        message: 'Registration error',
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
              <FormLabel className="flex items-center gap-2 text-gray-700 font-medium">
                Password
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-gray-400 cursor-pointer">
                      <InfoIcon className="w-4 h-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs"
                  >
                    <p>
                      Must contain at least 8 characters, one lowercase letter, one uppercase letter, one digit and one
                      special character.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <FormControl>
                  <Input
                    placeholder="Create a password"
                    type={showPassword ? 'text' : 'password'}
                    className="pl-11 pr-11 h-12 rounded-xl"
                    autoComplete="new-password"
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

        {form.formState.errors.root && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm">
            {form.formState.errors.root.message}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-12 rounded-xl font-semibold text-base shadow-sm hover:shadow-md transition-all"
          disabled={!form.formState.isValid || form.formState.isSubmitting}
          data-testid="register-submit-button"
        >
          {form.formState.isSubmitting ? 'Signing up...' : 'Sign Up'}
        </Button>
      </form>
    </Form>
  );
}
