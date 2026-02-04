import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { authAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Spinner } from '../components/ui/spinner';
import { toast } from 'sonner';
import { detectTenant, getTenantSlug } from '../utils/tenant';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  // Auto-detect tenant from URL
  const tenant = detectTenant();
  const tenantSlug = getTenantSlug();

  console.log('🌐 [FRONTEND] Tenant detection:', { tenant, tenantSlug, url: window.location.href, port: window.location.port });

  const loginMutation = useMutation({
    mutationFn: () => authAPI.login(identifier, password, tenantSlug),
    onSuccess: (response) => {
      const { user, accessToken, refreshToken } = response.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success('Login successful!');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Login failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error('Please enter mobile number or email and password');
      return;
    }
    loginMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>
          {tenant ? (
            <>Sign in to <span className="font-semibold text-orange-500">{tenant.name}</span></>
          ) : (
            'Sign in to your account to continue'
          )}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Mobile Number or Email</Label>
            <Input
              id="identifier"
              type="text"
              placeholder="Enter mobile number or email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loginMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loginMutation.isPending}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
            Sign In
          </Button>
          <p className="text-sm text-gray-600 text-center">
            Don't have an account?{' '}
            <Link to="/register" className="text-orange-500 hover:underline">
              Register
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
