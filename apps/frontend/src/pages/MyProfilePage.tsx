import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Trash2, EyeIcon, EyeOffIcon, InfoIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { AuthContext } from '../context/AuthContext';
import { deleteUser } from '../api/queries/deleteUser';
import { updateNativeLanguage } from '../api/queries/updateNativeLanguage';
import { languageNames, nativeLanguages, type NativeLanguage } from '../api/types/language';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { changePassword } from '../api/queries/changePassword';
import { ApiError } from '../api/ApiError';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { site } from '../config';
import { useSEO } from '../hooks/useSEO';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(64)
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/\d/, 'Must contain at least one digit')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function MyProfilePage() {
  useSEO({ title: `My Profile - ${site.name}`, noindex: true });

  const { userData, clearUserData, refreshUserData } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: 'onTouched',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function onPasswordSubmit(values: PasswordFormValues) {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.reset();
      toast.success('Password changed successfully');
    } catch (error) {
      if (error instanceof ApiError && error.isErrorType('UnauthorizedAccessError')) {
        passwordForm.setError('currentPassword', {
          message: 'Current password is incorrect',
        });
        return;
      }
      toast.error('An error occurred while changing your password');
    }
  }

  async function onNativeLanguageChange(value: string) {
    try {
      await updateNativeLanguage(value as NativeLanguage);
      await refreshUserData();
      toast.success('Native language updated');
    } catch {
      toast.error('Could not update your native language');
    }
  }

  async function onDeleteAccount() {
    try {
      setIsDeleting(true);
      await deleteUser();
      await clearUserData();
      toast.success('Account deleted successfully');
      navigate('/');
    } catch {
      toast.error('An error occurred while deleting your account');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading user data...</p>
      </div>
    );
  }

  const memberSince = new Date(userData.createdAt).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-[calc(100vh-72px)] bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">My Profile</h1>
          <p className="text-gray-500">Manage your account information and settings</p>
        </div>

        <Tabs
          defaultValue="account"
          className="w-full"
        >
          <TabsList className={`grid w-full mb-6 h-auto ${userData.role === 'admin' ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <TabsTrigger
              value="account"
              className="py-2.5 text-sm"
            >
              Account
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="py-2.5 text-sm"
            >
              Security
            </TabsTrigger>
            {userData.role !== 'admin' && (
              <TabsTrigger
                value="danger"
                className="py-2.5 text-sm"
              >
                Manage Account
              </TabsTrigger>
            )}
          </TabsList>

          {/* Account Tab */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-lg">
                    <User className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <CardTitle>Account Details</CardTitle>
                    <CardDescription>Your basic account information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email address</label>
                  <Input
                    value={userData.email}
                    disabled
                    className="h-11 bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">To change your email, contact support</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Native language</label>
                  <Select
                    value={userData.nativeLanguage}
                    onValueChange={onNativeLanguageChange}
                  >
                    <SelectTrigger className="h-11 w-full text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {nativeLanguages.map((language) => (
                        <SelectItem
                          key={language}
                          value={language}
                        >
                          {languageNames[language]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-1">
                    Applies to new photos only. Words you already saved keep their current translations.
                  </p>
                </div>

                {typeof userData.capturesToday === 'number' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Photos today</label>
                    <Input
                      value={`${userData.capturesToday} / ${userData.dailyCaptureLimit}`}
                      disabled
                      className="h-11 bg-gray-50 text-gray-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Member since</label>
                  <Input
                    value={memberSince}
                    disabled
                    className="h-11 bg-gray-50 text-gray-500"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-lg">
                    <Lock className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Update your account password</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                    className="space-y-5"
                  >
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Current password</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                placeholder="Enter current password"
                                type={showCurrentPassword ? 'text' : 'password'}
                                className="h-11 pr-11"
                                {...field}
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute inset-y-0 right-0 h-full px-3 text-gray-400 hover:text-gray-600 hover:bg-transparent"
                              tabIndex={-1}
                            >
                              {showCurrentPassword ? (
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

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            New password
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
                                  Must contain at least 8 characters, one lowercase letter, one uppercase letter, one
                                  digit and one special character.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                placeholder="Enter new password"
                                type={showNewPassword ? 'text' : 'password'}
                                className="h-11 pr-11"
                                {...field}
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute inset-y-0 right-0 h-full px-3 text-gray-400 hover:text-gray-600 hover:bg-transparent"
                              tabIndex={-1}
                            >
                              {showNewPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Confirm new password</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                placeholder="Repeat new password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="h-11 pr-11"
                                {...field}
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute inset-y-0 right-0 h-full px-3 text-gray-400 hover:text-gray-600 hover:bg-transparent"
                              tabIndex={-1}
                            >
                              {showConfirmPassword ? (
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

                    {passwordForm.formState.errors.root && (
                      <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm">
                        {passwordForm.formState.errors.root.message}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11"
                      disabled={!passwordForm.formState.isValid || passwordForm.formState.isSubmitting}
                    >
                      {passwordForm.formState.isSubmitting ? 'Changing password...' : 'Change password'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Account Tab */}
          {userData.role !== 'admin' && (
            <TabsContent value="danger">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle>Delete Account</CardTitle>
                      <CardDescription>Permanently delete your account and all associated data</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm font-medium text-red-800 mb-2">Deleting your account will:</p>
                      <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                        <li>Permanently remove all your data</li>
                        <li>Revoke access to the platform</li>
                        <li>Cannot be undone</li>
                      </ul>
                    </div>

                    <Dialog
                      open={showDeleteDialog}
                      onOpenChange={setShowDeleteDialog}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="w-full h-11"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete my account
                        </Button>
                      </DialogTrigger>
                      <DialogContent
                        className="sm:max-w-lg"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <DialogHeader>
                          <DialogTitle>Confirm account deletion</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete your account? This action is irreversible and will
                            permanently remove all your data.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-2">
                          <p className="text-sm font-medium text-red-800">This action cannot be undone!</p>
                          <p className="text-sm text-red-700 mt-1">All your data will be permanently deleted.</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                            className="flex-1"
                            disabled={isDeleting}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={onDeleteAccount}
                            className="flex-1"
                            disabled={isDeleting}
                          >
                            {isDeleting ? 'Deleting...' : 'Delete account'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
