'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/* ================================================================
   AGENTFLOW — PREMIUM LANDING PAGE
   Design quality bar: Linear, Vercel, Framer
   ================================================================ */

// ─── Nav ────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${scrolled ? 'bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]' : 'bg-transparent'}`}>
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <span className="text-[14px] font-semibold tracking-tight text-[var(--foreground)]">AgentFlow</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Features</a>
          <a href="#how-it-works" className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">How it works</a>
          <a href="#pricing" className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Pricing</a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/signin" className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Sign in</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Get started</Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-14 overflow-hidden noise-overlay">
      {/* Gradient blobs */}
      <div className="gradient-blob gradient-blob-violet w-[600px] h-[600px] -top-[200px] left-1/2 -translate-x-1/2 opacity-20" />
      <div className="gradient-blob gradient-blob-fuchsia w-[400px] h-[400px] top-[100px] -right-[100px] opacity-10" />
      <div className="gradient-blob gradient-blob-blue w-[300px] h-[300px] top-[200px] -left-[100px] opacity-10" />

      <div className="relative z-10 text-center max-w-[720px] mx-auto">
        {/* Eyebrow */}
        <div className="badge badge-violet mb-6 animate-reveal" style={{ animationDelay: '0ms' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
          Now in beta
        </div>

        {/* Headline */}
        <h1 className="text-display text-[var(--foreground)] mb-5 animate-reveal" style={{ animationDelay: '100ms' }}>
          Build AI agents<br />
          <span className="text-[var(--text-secondary)]">by talking.</span>
        </h1>

        {/* Subhead */}
        <p className="text-body-lg text-[var(--text-secondary)] mb-8 max-w-[480px] mx-auto animate-reveal" style={{ animationDelay: '200ms' }}>
          Describe what you want in plain English. Watch your agent assemble itself, run it, and see exactly what happened.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-3 mb-8 animate-reveal" style={{ animationDelay: '300ms' }}>
          <Link href="/signup" className="btn btn-primary btn-lg">
            Start building free
          </Link>
          <a href="#how-it-works" className="btn btn-ghost btn-lg text-[var(--text-secondary)]">
            See how it works →
          </a>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-2 text-[12px] text-[var(--text-muted)] animate-reveal" style={{ animationDelay: '400ms' }}>
          <div className="flex -space-x-2">
            {['#8B5CF6','#3B82F6','#10B981','#F59E0B'].map((c,i) => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-[var(--background)]" style={{ background: c }} />
            ))}
          </div>
          <span>Loved by 1,200+ creators</span>
        </div>
      </div>

      {/* Hero visual — browser mockup */}
      <div className="relative z-10 mt-16 mb-8 max-w-[1000px] w-full mx-auto animate-reveal" style={{ animationDelay: '500ms' }}>
        <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-lg bg-[var(--bg-elevated)]">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-sunken)] border-b border-[var(--border-subtle)]">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]/60" />
            </div>
            <div className="flex-1 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-[var(--background)] text-[11px] text-[var(--text-muted)]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                app.agentflow.ai
              </div>
            </div>
          </div>
          {/* App preview */}
          <div className="h-[420px] bg-[var(--background)] flex items-center justify-center relative overflow-hidden">
            {/* Simulated 3-panel layout */}
            <div className="flex w-full h-full">
              {/* Chat panel */}
              <div className="w-[30%] border-r border-[var(--border-subtle)] p-4 flex flex-col gap-3">
                <div className="w-16 h-2 rounded bg-[var(--border-subtle)]" />
                <div className="flex-1 flex flex-col justify-end gap-2">
                  <div className="self-end bg-[var(--primary)]/20 rounded-lg px-3 py-2 max-w-[80%]">
                    <div className="w-32 h-2 rounded bg-[var(--primary)]/40" />
                  </div>
                  <div className="self-start bg-[var(--bg-elevated)] rounded-lg px-3 py-2 max-w-[80%] space-y-1.5">
                    <div className="w-40 h-2 rounded bg-[var(--border)]" />
                    <div className="w-28 h-2 rounded bg-[var(--border)]" />
                  </div>
                  <div className="flex gap-2 mt-1">
                    <div className="badge badge-violet text-[9px] px-2 py-0.5">add node</div>
                    <div className="badge badge-violet text-[9px] px-2 py-0.5">add node</div>
                    <div className="badge badge-green text-[9px] px-2 py-0.5">connect</div>
                  </div>
                </div>
                <div className="h-8 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sunken)]" />
              </div>
              {/* Canvas panel */}
              <div className="flex-1 relative p-8">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, var(--border-subtle) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                {/* Simulated nodes */}
                <div className="relative flex flex-col items-center gap-4 pt-4">
                  <MockNode emoji="⏰" label="Schedule" x={0} color="#8B5CF6" />
                  <svg className="w-px h-6 text-[var(--primary)]"><line x1="0" y1="0" x2="0" y2="24" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" /></svg>
                  <MockNode emoji="🧠" label="Claude AI" x={0} color="#3B82F6" />
                  <svg className="w-px h-6 text-[var(--primary)]"><line x1="0" y1="0" x2="0" y2="24" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" /></svg>
                  <MockNode emoji="📧" label="Send Email" x={0} color="#10B981" />
                </div>
              </div>
              {/* Inspector panel */}
              <div className="w-[25%] border-l border-[var(--border-subtle)] p-4">
                <div className="flex gap-2 mb-4">
                  <div className="w-12 h-2 rounded bg-[var(--primary)]/40" />
                  <div className="w-10 h-2 rounded bg-[var(--border)]" />
                  <div className="w-8 h-2 rounded bg-[var(--border)]" />
                </div>
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                      <div className="w-20 h-2 rounded bg-[var(--border)]" />
                      <div className="ml-auto w-8 h-2 rounded bg-[var(--border-subtle)]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockNode({ emoji, label, x, color }: { emoji: string; label: string; x: number; color: string }) {
  return (
    <div className="relative bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[10px] px-5 py-3 flex items-center gap-2.5 shadow-md" style={{ transform: `translateX(${x}px)` }}>
      <span className="text-base">{emoji}</span>
      <span className="text-[13px] font-medium text-[var(--foreground)]">{label}</span>
      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}40` }} />
    </div>
  );
}

// ─── Features ───────────────────────────────────────────────────────
function Features() {
  const features = [
    { icon: '💬', title: 'Chat-first building', desc: 'Just talk. Describe what you want and watch the AI build it. No drag-and-drop learning curve.' },
    { icon: '👁️', title: 'Visible backend', desc: 'Every API call, every prompt, every dollar spent — streaming live. No black boxes.' },
    { icon: '🚀', title: 'Ships finished work', desc: 'Generates images, videos, sends emails, posts to social — real output, not demos.' },
  ];

  return (
    <section id="features" className="relative py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <p className="text-tiny text-[var(--primary)] uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-h1 text-[var(--foreground)] mb-4">Everything you need,<br />nothing you don&apos;t</h2>
          <p className="text-body-lg text-[var(--text-secondary)] max-w-[480px] mx-auto">Three core ideas that make AgentFlow different from every other automation tool.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="card card-interactive relative overflow-hidden group">
              {/* Subtle gradient glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-glow)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="text-2xl mb-4">{f.icon}</div>
                <h3 className="text-h3 text-[var(--foreground)] mb-2">{f.title}</h3>
                <p className="text-body text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ───────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Describe your idea', desc: '"Send me a daily joke by email every morning" — one sentence is all it takes.', visual: '💬' },
    { num: '02', title: 'Watch it build live', desc: 'Nodes appear on the canvas in real-time. Schedule → AI → Email — connected and configured.', visual: '🔨' },
    { num: '03', title: 'Get finished output', desc: 'Hit run. See every step execute. Get real results in your inbox, on social, wherever.', visual: '✅' },
  ];

  return (
    <section id="how-it-works" className="relative py-24 px-6 bg-[var(--bg-sunken)]">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <p className="text-tiny text-[var(--primary)] uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-h1 text-[var(--foreground)]">Three steps. One minute.</h2>
        </div>

        <div className="space-y-16">
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-16 ${i % 2 === 1 ? 'flex-row-reverse' : ''}`}>
              <div className="flex-1">
                <div className="text-tiny text-[var(--primary)] font-mono mb-2">{s.num}</div>
                <h3 className="text-h2 text-[var(--foreground)] mb-3">{s.title}</h3>
                <p className="text-body-lg text-[var(--text-secondary)] leading-relaxed max-w-[400px]">{s.desc}</p>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="w-[320px] h-[200px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-center text-6xl shadow-md">
                  {s.visual}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ────────────────────────────────────────────────────────
function Pricing() {
  const plans = [
    { name: 'Free', price: '$0', period: '/forever', features: ['50 runs/month', '3 workflows', 'Community support', 'All node types'], cta: 'Get started', highlighted: false },
    { name: 'Pro', price: '$19', period: '/mo', features: ['Unlimited runs', 'Unlimited workflows', 'Priority support', 'API access', 'Custom nodes', 'Team collaboration'], cta: 'Start free trial', highlighted: true },
    { name: 'Team', price: '$49', period: '/mo', features: ['Everything in Pro', '5 team members', 'Shared workflows', 'Admin dashboard', 'SSO / SAML', 'Dedicated support'], cta: 'Contact sales', highlighted: false },
  ];

  return (
    <section id="pricing" className="relative py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <p className="text-tiny text-[var(--primary)] uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-h1 text-[var(--foreground)] mb-4">Simple, transparent pricing</h2>
          <p className="text-body-lg text-[var(--text-secondary)]">Start free. Upgrade when you&apos;re ready.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-[900px] mx-auto">
          {plans.map((p, i) => (
            <div key={i} className={`card relative flex flex-col ${p.highlighted ? 'border-[var(--primary)] shadow-glow' : ''}`} style={p.highlighted ? { boxShadow: 'var(--shadow-glow)' } : {}}>
              {p.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="badge badge-violet">Most popular</div>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-body-lg font-semibold text-[var(--foreground)] mb-1">{p.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-h1 text-[var(--foreground)]">{p.price}</span>
                  <span className="text-small text-[var(--text-muted)]">{p.period}</span>
                </div>
              </div>
              <ul className="flex-1 space-y-3 mb-8">
                {p.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2.5 text-body text-[var(--text-secondary)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className={`btn w-full ${p.highlighted ? 'btn-primary' : 'btn-secondary'}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ──────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/5 to-transparent" />
      <div className="gradient-blob gradient-blob-violet w-[500px] h-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10" />
      <div className="relative z-10 text-center max-w-[480px] mx-auto">
        <h2 className="text-h1 text-[var(--foreground)] mb-4">Ready to build your first agent?</h2>
        <p className="text-body-lg text-[var(--text-secondary)] mb-8">One sentence. One agent. Zero code.</p>
        <Link href="/signup" className="btn btn-primary btn-lg">
          Start free →
        </Link>
        <p className="text-tiny text-[var(--text-muted)] mt-4">No credit card required · 50 free runs/month</p>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] py-12 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="text-tiny uppercase tracking-widest text-[var(--text-muted)] mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="text-small text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-small text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Pricing</a></li>
              <li><a href="#" className="text-small text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Changelog</a></li>
              <li><a href="#" className="text-small text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Docs</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-tiny uppercase tracking-widest text-[var(--text-muted)] mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-small text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">About</a></li>
              <li><a href="#" className="text-small text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Blog</a></li>
              <li><a href="#" className="text-small text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-tiny uppercase tracking-widest text-[var(--text-muted)] mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-small text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Templates</a></li>
              <li><a href="#" className="text-small text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Community</a></li>
              <li><a href="#" className="text-small text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Support</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-tiny uppercase tracking-widest text-[var(--text-muted)] mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-small text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Privacy</a></li>
              <li><a href="#" className="text-small text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="flex items-center justify-between pt-8 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-[var(--primary)] flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <span className="text-tiny text-[var(--text-muted)]">© 2026 AgentFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="#" className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ───────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  );
}
