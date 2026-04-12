'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else router.push('/dashboard');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><Link href="/" className="inline-flex items-center gap-2"><div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">⚡</div><span className="text-white font-bold text-xl">AgentFlow</span></Link></div>
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Set new password</h1>
          <p className="text-gray-400 mb-6">Enter your new password below</p>
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4 text-red-400 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">New password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition" placeholder="••••••••" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm password</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition" placeholder="••••••••" /></div>
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">{loading ? 'Updating...' : 'Update password'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
