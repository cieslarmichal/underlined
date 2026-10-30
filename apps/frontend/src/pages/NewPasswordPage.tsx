import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { EyeIcon, EyeOffIcon, InfoIcon, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import ErrorStep from '../components/ErrorStep';
import { changePasswordByToken } from '../api/queries/changePasswordByToken';
import { validateOneTimeToken } from '../api/queries/validateOneTimeToken';
import { ApiError } from '../api/ApiError';
import { site } from '../config';
import { useSEO } from '../hooks/useSEO';

const formSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(64)
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/\d/, 'Password must contain at least one digit')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords must match',
    path: ['passwordConfirmation'],
  });

type FormValues = z.infer<typeof formSchema>;

export default function NewPasswordPage() {
  useSEO({ title: `Set New Password - ${site.name}`, noindex: true });

  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get('token');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      password: '',
      passwordConfirmation: '',
    },
  });

  useEffect(() => {
    let isMounted = true;

    const checkToken = async () => {
      if (!token) {
        if (!isMounted) return;
        setIsTokenValid(false);
        setIsCheckingToken(false);
        return;
      }

      try {
        const res = await validateOneTimeToken({ token, purpose: 'reset-password' });
        if (!isMounted) return;
        setIsTokenValid(res.valid);
      } catch {
        if (!isMounted) return;
        setIsTokenValid(false);
      } finally {
        if (isMounted) {
          setIsCheckingToken(false);
        }
      }
    };

    checkToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function onSubmit(values: FormValues) {
    try {
      await changePasswordByToken({
        token: token || '',
        password: values.password,
      });

      toast.success('Password has been changed.');
      navigate('/login');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isErrorType('InputNotValidError')) {
          const reason = error.getContextValue<string>('reason');

          if (reason === 'Reset password token is invalid or has been used') {
            form.setError('root', {
              message:
                'The password reset link is invalid, has expired, or has already been used. Please request a new reset link.',
            });
            return;
          }

          form.setError('root', {
            message: error.message || 'The provided data is invalid.',
          });
          return;
        }

        form.setError('root', {
          message: error.message || 'Failed to set a new password.',
        });
        return;
      }

      form.setError('root', {
        message: 'Failed to set a new password.',
      });
    }
  }

  return (
    <div className="min-h-[calc(100dvh-65px)] bg-background flex justify-center pt-12 sm:pt-24">
      <div className="w-full max-w-md space-y-6 px-6">
        <div className="text-center flex flex-col justify-end pb-3">
          <h2 className="font-serif text-3xl font-semibold text-foreground leading-tight tracking-tight">Set new password</h2>
          <p className="text-gray-600 mt-2">Enter a new password for your account</p>
        </div>

        <div className="bg-card rounded-xl border border-gray-200 shadow-lg p-6">
          {!isCheckingToken && !isTokenValid ? (
            <ErrorStep
              title="Invalid reset link"
              message="The password reset link is invalid, has expired, or has already been used. Please request a new reset link."
              buttonText="Request new link"
              onButtonClick={() => navigate('/forgot-password')}
            />
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel htmlFor="password">New password</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InfoIcon className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-xs"
                          >
                            <p>
                              Password must contain at least 8 characters, one lowercase letter, one uppercase letter,
                              one digit and one special character.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="relative">
                        <FormControl>
                          <Input
                            id="password"
                            placeholder="Create a strong password"
                            type={showPassword ? 'text' : 'password'}
                            className="h-11"
                            autoComplete="new-password"
                            disabled={isCheckingToken || !isTokenValid}
                            aria-invalid={!!fieldState.error}
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                          tabIndex={-1}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passwordConfirmation"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel htmlFor="passwordConfirmation">Repeat password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            id="passwordConfirmation"
                            placeholder="Repeat the same password"
                            type={showPasswordConfirmation ? 'text' : 'password'}
                            className="h-11"
                            autoComplete="new-password"
                            disabled={isCheckingToken || !isTokenValid}
                            aria-invalid={!!fieldState.error}
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                          tabIndex={-1}
                          aria-label={showPasswordConfirmation ? 'Hide password' : 'Show password'}
                        >
                          {showPasswordConfirmation ? (
                            <EyeOffIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 font-medium transition-all duration-200 shadow-sm hover:shadow-md mt-6"
                  disabled={isCheckingToken || !isTokenValid || !form.formState.isValid || form.formState.isSubmitting}
                >
                  {isCheckingToken ? (
                    'Checking link...'
                  ) : form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting password...
                    </>
                  ) : (
                    'Set new password'
                  )}
                </Button>
              </form>
            </Form>
          )}

          {form.formState.errors.root && (
            <div className="text-destructive text-sm mt-3 text-center bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              {form.formState.errors.root.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
