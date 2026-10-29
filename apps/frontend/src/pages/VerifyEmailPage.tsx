import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Loader2, Mail } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import EmailConfirmationStep from '../components/EmailConfirmationStep';
import { verifyEmail } from '../api/queries/verifyEmail';
import { resendVerification } from '../api/queries/resendVerification';
import { site } from '../config';
import { useSEO } from '../hooks/useSEO';

const resendSchema = z.object({
  email: z.string().email().max(254),
});

type ResendFormValues = z.infer<typeof resendSchema>;

export default function VerifyEmailPage() {
  useSEO({ title: `Verify Email - ${site.name}`, noindex: true });

  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get('token');
  const [emailVerified, setEmailVerified] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showResendForm, setShowResendForm] = useState(false);
  const [emailResent, setEmailResent] = useState(false);
  const navigate = useNavigate();

  const resendForm = useForm<ResendFormValues>({
    resolver: zodResolver(resendSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (!token) {
      toast.error('Missing token in the link.');
      navigate('/login');
      return;
    }

    let isMounted = true;

    const verifyToken = async () => {
      try {
        await verifyEmail({ token });
        if (!isMounted) return;
        setEmailVerified(true);
      } catch {
        if (!isMounted) return;
        setError(true);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token, navigate]);

  async function handleResendVerification(values: ResendFormValues) {
    try {
      await resendVerification({ email: values.email });
      setShowResendForm(false);
      setEmailResent(true);
    } catch {
      toast.error('Failed to send the email. Please try again.');
    }
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
              <Loader2 className="h-6 w-6 text-black animate-spin" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-black">Verifying account...</h2>
            </div>
          </div>
          <p className="text-gray-600">Please wait while we verify your account.</p>
        </div>
      );
    }

    if (emailVerified) {
      return (
        <EmailConfirmationStep
          title="Account activated!"
          message="You can now sign in and start using the platform."
          buttonText="Go to sign in"
          onButtonClick={() => navigate('/login')}
          icon="check"
        />
      );
    }

    if (emailResent) {
      return (
        <EmailConfirmationStep
          title="Verification link sent"
          message="Click the link in the email to activate your account and start using the platform."
          buttonText="Go to sign in"
          onButtonClick={() => navigate('/login')}
        />
      );
    }

    if (error) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-black mb-2">Verification failed</h2>
            <p className="text-gray-600">The verification link has expired or is invalid.</p>
          </div>
          {!showResendForm ? (
            <Button
              onClick={() => setShowResendForm(true)}
              className="w-full h-11 font-medium transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send a new verification link
            </Button>
          ) : (
            <Form {...resendForm}>
              <form
                onSubmit={resendForm.handleSubmit(handleResendVerification)}
                className="space-y-4"
              >
                <FormField
                  control={resendForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="email">Email</FormLabel>
                      <FormControl>
                        <Input
                          id="email"
                          placeholder="name@domain.com"
                          type="email"
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
                  className="w-full h-11 font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                  disabled={!resendForm.formState.isValid || resendForm.formState.isSubmitting}
                >
                  {resendForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send verification link'
                  )}
                </Button>
              </form>
            </Form>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center pt-32">
      <div className="w-full max-w-md space-y-6 px-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">{renderContent()}</div>
      </div>
    </div>
  );
}
