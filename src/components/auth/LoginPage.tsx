import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Briefcase,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  CheckCircle
} from 'lucide-react';
import { authService, SUPER_ADMIN_EMAIL } from '../../services/auth/authService';
import { AppUser } from '../../types/settings';
import { DEVELOPER_CREDIT } from '../../services/native/whatsappShare';

interface LoginPageProps {
  onLoginSuccess: (user: AppUser) => void;
  onBackToHome: () => void;
  officeName: string;
  ntn: string;
  address: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onBackToHome,
  officeName,
  ntn,
  address
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.login(email, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMsg(result.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setErrorMsg(`Authentication error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
      {/* Top Header */}
      <header className="px-4 sm:px-8 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <button
          type="button"
          onClick={onBackToHome}
          className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 hover:text-white transition cursor-pointer min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="text-[11px] font-mono text-emerald-400">
          NTN: {ntn}
        </div>
      </header>

      {/* Login Box */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Logo & Office Title */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg font-bold mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {officeName}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              NTN: {ntn} • {address}
            </p>
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-semibold uppercase tracking-wider">
              Secure Staff Portal
            </div>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Credential Hint / Auto-Fill */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-2.5 text-[11px] text-slate-300 flex items-center justify-between gap-2">
            <div>
              <span className="text-slate-400 block text-[10px]">Super Admin Login:</span>
              <span className="font-mono text-emerald-400 font-medium">ahmeddodataxcrm@gmail.com</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail('ahmeddodataxcrm@gmail.com');
                setPassword('Admin123');
                setErrorMsg('');
              }}
              className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-100 text-[10px] font-semibold cursor-pointer transition shrink-0"
            >
              Auto-Fill
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Authorized Email Address <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ahmeddodataxcrm@gmail.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your security password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-md transition cursor-pointer disabled:opacity-50 min-h-[46px]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Tax Portal'}</span>
            </button>
          </form>

          {/* Offline Security Notice */}
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Offline Encrypted Storage & Local Auth</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Authorized personnel only. All access is audited in the local security ledger.
            </p>
          </div>
        </div>
      </div>

      {/* Footer with Developer Credit */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 px-4 text-center text-xs text-slate-400 space-y-1.5">
        <div className="font-semibold text-slate-300">
          {officeName} • NTN: {ntn}
        </div>
        <div className="text-[11px] text-emerald-400 font-medium">
          {DEVELOPER_CREDIT}
        </div>
      </footer>
    </div>
  );
};
