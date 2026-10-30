import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import EmailConfirmationStep from '../components/EmailConfirmationStep';
import { sendResetPasswordEmail } from '../api/queries/sendResetPasswordEmail';
import { ApiError } from '../api/ApiError';
import { site } from '../config';
import { useSEO } from '../hooks/useSEO';

const formSchema = z.object({
  email: z.string().email().max(254),
});

type FormValues = z.infer<typeof formSchema>;

export default function ForgotPasswordPage() {
  useSEO({ title: `Forgot Password - ${site.name}`, noindex: true });

  const navigate = useNavigate();

  const [resetPasswordSent, setResetPasswordSent] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await sendResetPasswordEmail({ email: values.email });
      setResetPasswordSent(true);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isErrorType('TooManyRequestsError')) {
          form.setError('root', {
            message: 'Too many password reset attempts. Please try again in a few minutes.',
          });
          return;
        }

        form.setError('root', {
          message: error.message || 'An error occurred while resetting password',
        });
        return;
      }

      form.setError('root', {
        message: 'An error occurred while resetting password',
      });
    }
  }

  if (resetPasswordSent) {
    return (
      <div className="min-h-[calc(100dvh-65px)] bg-background flex justify-center pt-12 sm:pt-24">
        <div className="w-full max-w-md space-y-6 px-6">
          <div className="bg-card rounded-xl border border-gray-200 shadow-lg p-6">
            <EmailConfirmationStep
              title="Reset link sent"
              message="If an account exists for this email address, you will receive an email with a link to set a new password."
              buttonText="Back to sign in"
              onButtonClick={() => navigate('/login')}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-65px)] bg-background flex justify-center pt-12 sm:pt-24">
      <div className="w-full max-w-md space-y-6 px-6">
        <div className="text-center flex flex-col justify-end pb-3">
          <h2 className="font-serif text-3xl font-semibold text-foreground leading-tight tracking-tight">Reset password</h2>
          <p className="text-gray-600 mt-2">Enter your email address to receive a password reset link</p>
        </div>

        <div className="bg-card rounded-xl border border-gray-200 shadow-lg p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        placeholder="name@domain.com"
                        className="h-11"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 font-medium transition-all duration-200 shadow-sm hover:shadow-md mt-6"
                disabled={!form.formState.isValid || form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </form>
          </Form>

          {form.formState.errors.root && (
            <div className="text-destructive text-sm mt-3 text-center bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              {form.formState.errors.root.message}
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Remembered your password?{' '}
              <Link
                to="/login"
                className="font-semibold text-foreground hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
