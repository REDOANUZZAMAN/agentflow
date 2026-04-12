'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Rocket } from 'lucide-react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err: any) {
      setError(err.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Left — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight">AgentFlow</span>
          </Link>

          <h1 className="text-h2 text-[var(--foreground)] mb-1">Create your account</h1>
          <p className="text-body text-[var(--text-secondary)] mb-8">Start building AI agents in under a minute.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-small font-medium text-[var(--text-secondary)] mb-1.5 block">Email</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input-field pl-10" required />
              </div>
            </div>

            <div>
              <label className="text-small font-medium text-[var(--text-secondary)] mb-1.5 block">Password</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="input-field pl-10 pr-10" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              <p className="text-tiny text-[var(--text-muted)] mt-1.5">Must be at least 6 characters</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-[var(--destructive)]/10 border border-[var(--destructive)]/20">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--destructive)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span className="text-small text-[var(--destructive)]">{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading || success} className={`btn w-full h-10 ${success ? 'bg-[var(--success)] text-white' : 'btn-primary'}`}>
              {loading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              ) : success ? (
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Account created
                </span>
              ) : 'Create account'}
            </button>
          </form>


          <p className="text-center text-small text-[var(--text-muted)] mt-8">
            Already have an account? <Link href="/signin" className="text-[var(--primary)] hover:underline">Sign in →</Link>
          </p>

          <p className="text-center text-tiny text-[var(--text-muted)] mt-4">
            By creating an account, you agree to our <a href="#" className="underline hover:text-[var(--text-secondary)]">Terms</a> and <a href="#" className="underline hover:text-[var(--text-secondary)]">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* Right — Hero visual */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-[var(--bg-sunken)] overflow-hidden">
        <div className="gradient-blob gradient-blob-violet w-[500px] h-[500px] opacity-15" />
        <div className="gradient-blob gradient-blob-blue w-[300px] h-[300px] bottom-[20%] left-[10%] opacity-10" />
        <div className="relative z-10 text-center max-w-[360px]">
          <div className="mb-6"><Rocket className="w-14 h-14 text-[var(--primary)] mx-auto drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]" strokeWidth={1.5} /></div>
          <h2 className="text-h3 text-[var(--foreground)] mb-3">Zero to agent in 60 seconds</h2>
          <p className="text-body text-[var(--text-secondary)] leading-relaxed mb-8">
            No learning curve. No setup. Just describe what you want and watch it happen.
          </p>
          <div className="space-y-3">
            {['50 free runs/month', 'No credit card required', 'All node types included'].map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 text-small text-[var(--text-secondary)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
