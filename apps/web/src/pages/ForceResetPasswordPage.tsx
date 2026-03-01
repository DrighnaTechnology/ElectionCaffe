import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { authAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Spinner } from '../components/ui/spinner';
import { toast } from 'sonner';


export function ForceResetPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();
  const { clearMustChangePassword, logout } = useAuthStore();

  const resetMutation = useMutation({
    mutationFn: () => authAPI.changePassword(currentPassword, newPassword, confirmPassword),
    onSuccess: () => {
      clearMustChangePassword();
      toast.success('Password changed successfully! Welcome.');
      // Navigate to root — RootRoute will redirect to the correct page based on role/features
      navigate('/');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to change password');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('New password must be different from the temporary password');
      return;
    }

    resetMutation.mutate();
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Change Your Password</CardTitle>
        <CardDescription>
          Your account has a temporary password. You must set a new password before continuing.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Temporary Password</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="Enter the temporary password you received"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={resetMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter your new password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={resetMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={resetMutation.isPending}
            />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button type="submit" className="w-full" disabled={resetMutation.isPending}>
              {resetMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
              Set New Password
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={logout}
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
