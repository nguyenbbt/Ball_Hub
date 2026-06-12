import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '../api';
import { getUserHomePath, useAuthStore } from '../../../store/useAuthStore';
import { UserRole } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const RegisterForm = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  
  const [role, setRole] = useState<UserRole>('PLAYER');
  
  // Đã xóa hoàn toàn trường inviteCode khỏi state
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await authApi.register({ ...formData, role });
      
      // Tách 'name' thành 'firstName' và 'lastName' để khớp với Type User của Store
      const nameParts = (data.user.name || '').trim().split(' ');
      const firstName = (data.user as any).firstName || nameParts[0] || 'User';
      const lastName = (data.user as any).lastName || nameParts.slice(1).join(' ') || '';

      const fullUser = {
        ...data.user,
        firstName,
        lastName
      };

      // Ép kiểu (as any) để bypass sự sai lệch Type
      setAuth(fullUser as any, data.token);
      navigate(getUserHomePath(fullUser as any));
    } catch (err) {
      console.error('Lỗi đăng ký:', err);
      toast.error('Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="dark min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Left Section: Branding & Visual */}
      <section className="hidden md:flex md:w-5/12 lg:w-1/2 relative bg-surface-container-lowest items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
          <img 
            alt="Athletic focus" 
            className="w-full h-full object-cover" 
            src="https://cdn.britannica.com/96/195196-050-3909D5BD/Michael-Jordan-1988.jpg" 
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-background/20 to-background z-10"></div>
        <div className="relative z-20 max-w-lg">
          <div className="mb-8 inline-flex items-center px-4 py-2 rounded-full bg-primary-container/20 border border-primary-container/30">
            <span className="text-xs font-bold tracking-widest uppercase text-tertiary">Performance Command Center</span>
          </div>
          <h2 className="text-5xl lg:text-7xl font-black tracking-tighter text-white mb-6 leading-tight">
            BallHub<span className="text-primary-container">.</span>
          </h2>
          <p className="text-xl text-on-surface-variant font-medium leading-relaxed max-w-md">
            The platform designed for those who measure success in fractions of a second and pixels of precision.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-surface-container-high/40 backdrop-blur-md">
              <div className="text-primary-container mb-2">
                <span className="material-symbols-outlined text-3xl">insights</span>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">Real-time</div>
              <div className="text-xs uppercase tracking-wider text-outline">Analytics Tracking</div>
            </div>
            <div className="p-6 rounded-xl bg-surface-container-high/40 backdrop-blur-md">
              <div className="text-tertiary mb-2">
                <span className="material-symbols-outlined text-3xl">groups</span>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">Elite</div>
              <div className="text-xs uppercase tracking-wider text-outline">Roster Management</div>
            </div>
          </div>
        </div>
      </section>

      {/* Right Section: Sign Up Form */}
      <section className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-24 bg-background">
        <div className="w-full max-w-md z-10">
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Join the Elite</h1>
            <p className="text-on-surface-variant">Create your professional profile to start optimizing.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Full Name</label>
              <div className="relative group">
                <Input 
                  className="w-full h-14 bg-surface-container-highest border-none rounded-xl px-4 text-on-surface focus-visible:ring-primary/30 transition-all placeholder:text-outline/50"
                  placeholder="Enter your full name" 
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Email Address</label>
              <div className="relative group">
                <Input 
                  className="w-full h-14 bg-surface-container-highest border-none rounded-xl px-4 text-on-surface focus-visible:ring-primary/30 transition-all placeholder:text-outline/50"
                  placeholder="coach@ballhub.com" 
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            {/* Role Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Select Your Role</label>
              <div className="grid gap-3 grid-cols-2">
                <Button 
                  type="button"
                  onClick={() => setRole('COACH')}
                  variant="ghost"
                  className={`group h-auto flex flex-col items-center justify-center py-4 px-2 rounded-xl transition-all active:scale-95 ${
                    role === 'COACH' 
                      ? 'border border-primary/40 bg-primary-container/10' 
                      : 'border border-outline-variant/15 hover:bg-surface-container bg-surface-container-high'
                  }`}
                >
                  <span 
                    className={`material-symbols-outlined transition-colors ${role === 'COACH' ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}`}
                    style={role === 'COACH' ? { fontVariationSettings: '"FILL" 1' } : {}}
                  >
                    sports_soccer
                  </span>
                  <span className={`text-[10px] font-bold tracking-wider uppercase mt-2 ${role === 'COACH' ? 'text-primary' : 'text-outline'}`}>
                    Coach
                  </span>
                </Button>
                
                <Button 
                  type="button"
                  onClick={() => setRole('PLAYER')}
                  variant="ghost"
                  className={`group h-auto flex flex-col items-center justify-center py-4 px-2 rounded-xl transition-all active:scale-95 ${
                    role === 'PLAYER' 
                      ? 'border border-primary/40 bg-primary-container/10' 
                      : 'border border-outline-variant/15 hover:bg-surface-container bg-surface-container-high'
                  }`}
                >
                  <span 
                    className={`material-symbols-outlined transition-colors ${role === 'PLAYER' ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}`}
                    style={role === 'PLAYER' ? { fontVariationSettings: '"FILL" 1' } : {}}
                  >
                    person
                  </span>
                  <span className={`text-[10px] font-bold tracking-wider uppercase mt-2 ${role === 'PLAYER' ? 'text-primary' : 'text-outline'}`}>
                    Player
                  </span>
                </Button>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">Secure Password</label>
              <div className="relative group">
                <Input 
                  className="w-full h-14 bg-surface-container-highest border-none rounded-xl px-4 text-on-surface focus-visible:ring-primary/30 transition-all placeholder:text-outline/50"
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-white"
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 py-2">
              <div className="flex items-center h-5">
                <input 
                  type="checkbox" 
                  required
                  className="w-5 h-5 rounded bg-surface-container-highest border-outline-variant/20 text-primary-container focus:ring-offset-background focus:ring-primary transition-all cursor-pointer" 
                />
              </div>
              <label className="text-sm text-on-surface-variant leading-tight">
                I agree to the <a href="#" className="text-primary-container hover:underline">Terms of Service</a> and <a href="#" className="text-primary-container hover:underline">Privacy Policy</a>.
              </label>
            </div>

            {/* CTA */}
            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-14 signature-gradient text-on-primary font-bold rounded-xl shadow-lg shadow-primary-container/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isLoading ? 'Processing...' : 'Create Account'}</span>
                {!isLoading && <span className="material-symbols-outlined">arrow_forward</span>}
              </Button>
            </div>

            {/* Footer Link */}
            <div className="text-center pt-4">
              <p className="text-on-surface-variant text-sm">
                Already part of the roster? 
                <Link to="/login" className="text-primary font-bold hover:text-white ml-1 transition-colors">
                  Log In
                </Link>
              </p>
            </div>
          </form>
        </div>
      </section>

      {/* Visual Accents (Editorial Detail) */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent z-50"></div>
      <div className="fixed bottom-0 left-0 p-8 hidden md:block z-30 pointer-events-none">
        <div className="text-[10px] tracking-[0.3em] font-black uppercase text-outline-variant/40 vertical-text" style={{ writingMode: 'vertical-rl' }}>
          ESTABLISHED 2024 • SYSTEM v2.0
        </div>
      </div>
    </main>
  );
};