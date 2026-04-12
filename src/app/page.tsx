'use client';

import { useState, useEffect, useRef } from 'react';
import { Zap, Mail, Sparkles, Check, Clock, Users, ArrowRight } from 'lucide-react';

/* ================================================================
   AGENTFLOW — COMING SOON / WAITLIST PAGE
   Purple gradient, countdown, email capture, premium icons
   ================================================================ */

// ─── Config ─────────────────────────────────────────────────────
const LAUNCH_DATE = new Date('2026-06-01T00:00:00Z');

function useCountdown(target: Date) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => target); // SSR-safe: use target so diff=0
  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = mounted ? Math.max(0, target.getTime() - now.getTime()) : 0;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    isLive: mounted && diff <= 0,
    mounted,
  };
}

export default function ComingSoonPage() {
  const { days, hours, minutes, seconds, isLive, mounted } = useCountdown(LAUNCH_DATE);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'exists' | 'error'>('idle');
  const [waitlistCount, setWaitlistCount] = useState(337);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch waitlist count on mount
  useEffect(() => {
    // In production, fetch from Supabase: SELECT count(*) FROM waitlist
    // For now, use a realistic baseline
    setWaitlistCount(337);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setStatus('loading');

    try {
      // TODO: Wire to Supabase waitlist table
      // const { error } = await supabase.from('waitlist').insert({ email, referrer: window.location.href });
      // if (error?.code === '23505') { setStatus('exists'); return; }
      // if (error) throw error;
      
      await new Promise(r => setTimeout(r, 1200)); // Simulated delay
      setStatus('success');
      setWaitlistCount(prev => prev + 1);
      setTimeout(() => { setStatus('idle'); setEmail(''); }, 4000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* ─── Background ──────────────────────────────────────────── */}
      <div className="fixed inset-0 bg-[#1A1030]" />
      
      {/* Gradient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute w-[700px] h-[700px] rounded-full top-[-200px] left-[-100px] opacity-40" style={{ background: 'radial-gradient(circle, #5B3A9E 0%, transparent 70%)', filter: 'blur(80px)', animation: 'orbFloat1 35s ease-in-out infinite' }} />
        <div className="absolute w-[500px] h-[500px] rounded-full top-[30%] right-[-100px] opacity-30" style={{ background: 'radial-gradient(circle, #7B4BE8 0%, transparent 70%)', filter: 'blur(100px)', animation: 'orbFloat2 40s ease-in-out infinite' }} />
        <div className="absolute w-[600px] h-[600px] rounded-full bottom-[-200px] left-[30%] opacity-35" style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)', filter: 'blur(90px)', animation: 'orbFloat3 30s ease-in-out infinite' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full top-[20%] left-[40%] opacity-20" style={{ background: 'radial-gradient(circle, #D946EF 0%, transparent 70%)', filter: 'blur(120px)', animation: 'orbFloat1 45s ease-in-out infinite reverse' }} />
        <div className="absolute w-[300px] h-[300px] rounded-full bottom-[20%] right-[20%] opacity-25" style={{ background: 'radial-gradient(circle, #2E1F4A 0%, transparent 70%)', filter: 'blur(80px)', animation: 'orbFloat2 38s ease-in-out infinite reverse' }} />
      </div>

      {/* Noise texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '128px' }} />

      {/* ─── Content ─────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[560px] mx-auto px-6 text-center">
        
        {/* Logo */}
        <div className="mb-8 animate-cs-reveal" style={{ animationDelay: '0ms' }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] shadow-[0_0_40px_rgba(139,92,246,0.4)] mb-4">
            <Zap className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
          <div className="text-[18px] font-semibold tracking-tight text-white/90">AgentFlow</div>
        </div>

        {/* Headline */}
        <h1 className="text-[64px] md:text-[72px] font-bold leading-[1.05] tracking-[-0.02em] mb-5 animate-cs-reveal" style={{ animationDelay: '100ms', color: '#E8DEFF', textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
          Coming Soon
        </h1>

        {/* Subheadline */}
        <p className="text-[16px] leading-[1.6] max-w-[480px] mx-auto mb-10 animate-cs-reveal" style={{ animationDelay: '200ms', color: 'rgba(232, 222, 255, 0.7)' }}>
          Build AI agents by talking. Describe what you want, watch it assemble itself, and see every step happen live. Be the first to know when we launch.
        </p>

        {/* Countdown */}
        {mounted && !isLive && (
          <div className="inline-flex items-center gap-5 px-8 py-4 rounded-full mb-10 animate-cs-reveal" style={{ animationDelay: '300ms', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(12px)' }}>
            <CountdownUnit value={days} label="d" />
            <Dot />
            <CountdownUnit value={hours} label="h" />
            <Dot />
            <CountdownUnit value={minutes} label="m" />
            <Dot />
            <CountdownUnit value={seconds} label="s" pulse />
          </div>
        )}

        {mounted && isLive && (
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full mb-10 animate-cs-reveal" style={{ animationDelay: '300ms', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[14px] font-medium text-emerald-300">We&apos;re live!</span>
            <a href="/signup" className="text-[14px] font-semibold text-white ml-2 flex items-center gap-1 hover:underline">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Email signup */}
        <form onSubmit={handleSubmit} className="animate-cs-reveal" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center rounded-xl p-1.5" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <div className="flex items-center flex-1 px-3">
              <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(232, 222, 255, 0.4)' }} />
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 bg-transparent border-none outline-none text-[14px] text-white px-3 py-2.5"
                style={{ caretColor: '#A78BFA' }}
                disabled={status === 'loading' || status === 'success'}
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold uppercase tracking-[0.05em] text-white transition-all duration-150"
              style={{
                background: status === 'success' ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #A78BFA, #8B5CF6)',
                opacity: status === 'loading' ? 0.7 : 1,
              }}
            >
              {status === 'loading' ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              ) : status === 'success' ? (
                <><Check className="w-4 h-4" /> On the list!</>
              ) : status === 'exists' ? (
                <><Check className="w-4 h-4" /> Already joined</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Notify me</>
              )}
            </button>
          </div>
          {status === 'error' && (
            <p className="text-[12px] mt-2" style={{ color: '#F87171' }}>Something went wrong. Please try again.</p>
          )}
        </form>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-2.5 mt-8 animate-cs-reveal" style={{ animationDelay: '500ms' }}>
          <div className="flex -space-x-2.5">
            {['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'].map((color, i) => (
              <div key={i} className="w-7 h-7 rounded-full border-[1.5px] border-[#1A1030]" style={{ background: color }} />
            ))}
          </div>
          <p className="text-[13px]" style={{ color: 'rgba(232, 222, 255, 0.6)' }}>
            <span className="font-semibold text-white/80">{waitlistCount}</span> people joined
          </p>
        </div>
      </div>

      {/* ─── Animations ──────────────────────────────────────────── */}
      <style jsx>{`
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-25px, 25px) scale(1.08); }
          66% { transform: translate(20px, -10px) scale(0.92); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(15px, 30px) scale(0.97); }
          66% { transform: translate(-30px, -20px) scale(1.03); }
        }
        @keyframes csReveal {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-cs-reveal {
          animation: csReveal 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        @keyframes pulse-tick {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .pulse-tick {
          animation: pulse-tick 1s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Countdown Subcomponents ────────────────────────────────────────
function CountdownUnit({ value, label, pulse }: { value: number; label: string; pulse?: boolean }) {
  return (
    <div className={`flex items-baseline gap-1 ${pulse ? 'pulse-tick' : ''}`}>
      <span className="text-[28px] font-bold text-white tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[11px]" style={{ color: 'rgba(232, 222, 255, 0.5)' }}>{label}</span>
    </div>
  );
}

function Dot() {
  return <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(232, 222, 255, 0.3)' }} />;
}
