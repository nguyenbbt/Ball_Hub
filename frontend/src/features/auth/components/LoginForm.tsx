import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { getUserHomePath, useAuthStore } from '../../../store/useAuthStore';
import type { LoginCredentials } from '../types';

export const LoginForm = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<LoginCredentials>();

  const onSubmit = async (formData: LoginCredentials) => {
    setError(null);
    try {
      const data = await authApi.login(formData);
      
      // Tách 'name' thành 'firstName' và 'lastName' để khớp với Type User của Store
      const nameParts = (data.user.name || '').trim().split(' ');
      const firstName = (data.user as any).firstName || nameParts[0] || 'User';
      const lastName = (data.user as any).lastName || nameParts.slice(1).join(' ') || '';

      const fullUser = {
        ...data.user,
        firstName,
        lastName
      };

      // Ép kiểu (as any) để bypass sự sai lệch Type giữa API Response và Store State
      setAuth(fullUser as any, data.token);

      navigate(getUserHomePath(fullUser as any));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng kiểm tra lại thông tin.');
      console.error('Lỗi đăng nhập:', err);
    }
  };

  return (
    <main className="dark min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background text-foreground">
      
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-primary rounded-full blur-[120px] -top-64"></div>
      </div>

      <div className="w-full max-w-[440px] z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl font-black tracking-tighter text-white">BallHub</span>
          </div>
          <p className="text-on-surface-variant text-sm font-medium tracking-tight">Elite Performance Management</p>
        </div>

        {/* Login Form Panel */}
        <div className="glass-panel p-8 rounded-xl border border-outline-variant/15 shadow-2xl">
          <h1 className="text-xl font-bold text-white mb-6 text-center">Welcome back</h1>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1" htmlFor="email">
                Email Address
              </label>
              <input 
                id="email"
                type="email"
                placeholder="coach@ballhub.com"
                {...register('email', { required: true })}
                className="w-full h-12 bg-surface-container-highest border-0 rounded-lg px-4 text-on-surface placeholder:text-outline/50 focus:ring-2 focus:ring-primary/30 transition-all outline-none" 
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-end px-1">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="password">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-medium text-tertiary hover:text-white transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input 
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password', { required: true })}
                className="w-full h-12 bg-surface-container-highest border-0 rounded-lg px-4 text-on-surface placeholder:text-outline/50 focus:ring-2 focus:ring-primary/30 transition-all outline-none" 
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-error text-sm text-center bg-error/10 p-2 rounded border border-error/20">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isSubmitting}
              className="signature-gradient w-full h-12 rounded-lg text-on-primary font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Social Login Separator */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/10"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#1e253a] px-3 text-on-surface-variant font-medium">OR CONTINUE WITH</span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-4">
            {/* Google Button */}
            <button type="button" className="flex items-center justify-center h-11 bg-surface-container-high hover:bg-surface-bright rounded-lg border border-outline-variant/10 transition-colors group">
              <div className="w-5 h-5 mr-2 opacity-80 group-hover:opacity-100 transition-opacity">
                <svg className="w-full h-full fill-white" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path>
                </svg>
              </div>
              <span className="text-xs font-bold text-white tracking-wide">GOOGLE</span>
            </button>
            
            {/* Apple Button */}
            <button type="button" className="flex items-center justify-center h-11 bg-surface-container-high hover:bg-surface-bright rounded-lg border border-outline-variant/10 transition-colors group">
              <div className="w-5 h-5 mr-2 opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg className="w-full h-full fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.126 3.805 3.052 1.527-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.613 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.68.727-1.35 2.158-1.168 3.522 1.365.104 2.615-.506 3.454-1.51z"></path>
                </svg>
              </div>
              <span className="text-xs font-bold text-white tracking-wide">APPLE</span>
            </button>
          </div>

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-on-surface-variant text-sm">
              Don't have an account? 
              <Link to="/register" className="text-white font-bold hover:text-primary transition-colors ml-1">
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.2em] text-outline/30 font-bold select-none whitespace-nowrap">
          Secure Infrastructure • ISO 27001 Certified
        </div>
      </div>

      {/* Grid Lines Background */}
      <div className="fixed top-0 left-0 w-full h-full -z-50 opacity-10 pointer-events-none">
        <div className="absolute w-[1px] h-full left-1/4 bg-outline-variant/10"></div>
        <div className="absolute w-[1px] h-full left-2/4 bg-outline-variant/10"></div>
        <div className="absolute w-[1px] h-full left-3/4 bg-outline-variant/10"></div>
        <div className="absolute h-[1px] w-full top-1/4 bg-outline-variant/10"></div>
        <div className="absolute h-[1px] w-full top-2/4 bg-outline-variant/10"></div>
        <div className="absolute h-[1px] w-full top-3/4 bg-outline-variant/10"></div>
      </div>
    </main>
  );
};