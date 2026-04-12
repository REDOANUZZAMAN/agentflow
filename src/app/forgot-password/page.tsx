'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) setError(error.message); else setSent(true);
    setLoading(false);
  };

  if (sent) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#12121a] border border-white/10 rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
        <p className="text-gray-400 mb-6">We sent a password reset link to <strong className="text-white">{email}</strong></p>
        <Link href="/signin" className="text-violet-400 hover:text-violet-300 text-sm">Back to sign in</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><Link href="/" className="inline-flex items-center gap-2"><div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">⚡</div><span className="text-white font-bold text-xl">AgentFlow</span></Link></div>
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Reset password</h1>
          <p className="text-gray-400 mb-6">Enter your email and we&apos;ll send you a reset link</p>
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4 text-red-400 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition" placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-gray-400 mt-6"><Link href="/signin" className="text-violet-400 hover:text-violet-300">← Back to sign in</Link></p>
      </div>
    </div>
  );
}
