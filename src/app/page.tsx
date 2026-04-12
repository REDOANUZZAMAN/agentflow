'use client';

import { useState } from 'react';
import Link from 'next/link';

const features = [
  { icon: '💬', title: 'Chat-driven builder', desc: 'Describe what you want in plain English — the AI builds it for you' },
  { icon: '👁️', title: 'Visible backend', desc: 'Every API call, log, and variable streams live. No black box.' },
  { icon: '🎨', title: 'Visual canvas', desc: 'Watch your workflow assemble in real-time on an interactive canvas' },
  { icon: '🎬', title: 'Script-to-video', desc: 'Turn scripts into full videos with AI-generated shots and voiceover' },
  { icon: '📚', title: 'Asset library', desc: 'All generated images, videos, and files organized and searchable' },
  { icon: '⚡', title: 'Run anywhere', desc: 'Schedule, webhook, or manual — run your agents however you want' },
];

const steps = [
  { num: '01', title: 'Tell the AI what you want', desc: '"Send me a daily joke by email every morning at 8am"', color: 'from-violet-500 to-fuchsia-500' },
  { num: '02', title: 'Watch it build live', desc: 'Nodes appear on the canvas as the AI creates your workflow step by step', color: 'from-fuchsia-500 to-pink-500' },
  { num: '03', title: 'Run it and see everything', desc: 'Every API call, prompt, and response visible in the inspector', color: 'from-pink-500 to-rose-500' },
];

const useCases = [
  { emoji: '📰', title: 'Daily news summary to your inbox', desc: 'AI reads top news, writes a summary, emails it to you' },
  { emoji: '📸', title: 'Auto-generate Instagram reels', desc: 'Script → image → video → caption → post. Fully automated.' },
  { emoji: '🎬', title: 'Turn a script into a full video', desc: 'Parse scenes, generate shots, add voiceover, compile' },
  { emoji: '🔍', title: 'Monitor websites for changes', desc: 'Watch any page and get alerts when something changes' },
];

const pricing = [
  { name: 'Free', price: '$0', period: '/forever', features: ['50 runs/month', '2 workflows', 'Community support', 'Basic node library'], cta: 'Start free', popular: false },
  { name: 'Pro', price: '$19', period: '/month', features: ['Unlimited workflows', '1,000 runs/month', 'All integrations', 'Priority support', 'Custom nodes'], cta: 'Start free trial', popular: true },
  { name: 'Team', price: '$49', period: '/month', features: ['Everything in Pro', 'Team collaboration', '5,000 runs/month', 'Dedicated support', 'Custom branding'], cta: 'Contact sales', popular: false },
];

const faqs = [
  { q: 'Do I need to code?', a: 'Not at all! Just describe what you want in plain English. The AI builds everything for you. You can see and tweak the visual workflow, but you never need to write code.' },
  { q: 'What can it actually generate?', a: 'AgentFlow can generate text, images, videos, voiceovers, and more using AI. It can also send emails, post to social media, scrape websites, and call any API.' },
  { q: 'Where is my data stored?', a: 'Your data is stored securely in our cloud infrastructure powered by Supabase. All data is encrypted at rest and in transit. You can export or delete your data at any time.' },
  { q: 'Can I cancel anytime?', a: 'Yes! No contracts, no commitments. Cancel your subscription anytime and keep access until the end of your billing period.' },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">⚡</div>
            <span className="font-bold text-lg">AgentFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition">Features</a>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition">Pricing</a>
            <a href="#faq" className="text-sm text-gray-400 hover:text-white transition">FAQ</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/signin" className="text-sm text-gray-300 hover:text-white transition px-4 py-2">Sign in</Link>
            <Link href="/signup" className="text-sm font-medium bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-2 rounded-lg transition">Get Started Free</Link>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
            <div className="w-5 h-0.5 bg-white mb-1" /><div className="w-5 h-0.5 bg-white mb-1" /><div className="w-5 h-0.5 bg-white" />
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden bg-[#12121a] border-t border-white/5 p-4 space-y-3">
            <a href="#features" className="block text-sm text-gray-300" onClick={() => setMobileMenu(false)}>Features</a>
            <a href="#pricing" className="block text-sm text-gray-300" onClick={() => setMobileMenu(false)}>Pricing</a>
            <a href="#faq" className="block text-sm text-gray-300" onClick={() => setMobileMenu(false)}>FAQ</a>
            <Link href="/signin" className="block text-sm text-gray-300">Sign in</Link>
            <Link href="/signup" className="block text-sm font-medium bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 rounded-lg text-center">Get Started Free</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-6">
            ✨ Now in public beta
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            Build AI agents by{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">chatting.</span>
            <br />No code needed.
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Describe what you want, watch it build itself on a visual canvas.
            Generate videos, post to socials, automate anything.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl font-medium text-sm transition shadow-lg shadow-violet-500/25">
              Start building free →
            </Link>
            <button className="w-full sm:w-auto px-8 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-medium text-sm text-gray-300 transition">
              ▶️ Watch demo
            </button>
          </div>

          {/* Hero visual placeholder */}
          <div className="relative max-w-5xl mx-auto">
            <div className="aspect-[16/9] rounded-2xl bg-gradient-to-br from-[#12121a] to-[#1a1a2e] border border-white/10 overflow-hidden shadow-2xl">
              <div className="h-full flex">
                {/* Chat mockup */}
                <div className="w-1/4 border-r border-white/5 p-4 flex flex-col">
                  <div className="text-xs font-medium text-gray-400 mb-3">💬 Chat</div>
                  <div className="space-y-2 flex-1">
                    <div className="bg-violet-500/10 rounded-lg p-2 text-xs text-gray-300">&quot;Send me a daily joke by email&quot;</div>
                    <div className="bg-[#1a1a2e] rounded-lg p-2 text-xs text-gray-400">Building your workflow... ✨</div>
                  </div>
                </div>
                {/* Canvas mockup */}
                <div className="flex-1 p-6 relative">
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 w-40 h-12 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center gap-2 text-xs text-gray-300">
                    <span>⏰</span> Schedule
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-16 bg-gradient-to-b from-violet-500/30 to-fuchsia-500/30" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-4 w-40 h-12 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl flex items-center justify-center gap-2 text-xs text-gray-300">
                    <span>🧠</span> Claude AI
                  </div>
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-1 h-16 bg-gradient-to-b from-fuchsia-500/30 to-pink-500/30" />
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-40 h-12 bg-pink-500/10 border border-pink-500/20 rounded-xl flex items-center justify-center gap-2 text-xs text-gray-300">
                    <span>📧</span> Send Email
                  </div>
                </div>
                {/* Inspector mockup */}
                <div className="w-1/4 border-l border-white/5 p-4">
                  <div className="text-xs font-medium text-gray-400 mb-3">📊 Inspector</div>
                  <div className="space-y-1.5">
                    <div className="h-2 bg-green-500/20 rounded-full w-full" />
                    <div className="h-2 bg-green-500/20 rounded-full w-3/4" />
                    <div className="h-2 bg-yellow-500/20 rounded-full w-1/2 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-px bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-pink-500/20 rounded-2xl blur-xl -z-10" />
          </div>

          <p className="text-xs text-gray-500 mt-6">Trusted by 1,200+ creators building AI agents</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need to build AI agents</h2>
            <p className="text-gray-400 max-w-xl mx-auto">No code, no complexity. Just chat and watch the magic happen.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-[#12121a] border border-white/5 rounded-2xl p-6 hover:border-violet-500/20 transition">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-transparent via-violet-500/[0.02] to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-gray-400">Three steps. That&apos;s it.</p>
          </div>
          <div className="space-y-8">
            {steps.map(s => (
              <div key={s.num} className="flex items-start gap-6 bg-[#12121a] border border-white/5 rounded-2xl p-6 sm:p-8">
                <div className={`text-3xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent flex-shrink-0`}>{s.num}</div>
                <div>
                  <h3 className="font-semibold text-white text-lg mb-2">{s.title}</h3>
                  <p className="text-gray-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">What will you build?</h2>
            <p className="text-gray-400">Click any use case to start with a pre-built template</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {useCases.map(uc => (
              <Link key={uc.title} href="/signup" className="bg-[#12121a] border border-white/5 rounded-2xl p-6 hover:border-violet-500/20 transition group">
                <div className="text-3xl mb-3">{uc.emoji}</div>
                <h3 className="font-semibold text-white mb-1 group-hover:text-violet-400 transition">{uc.title}</h3>
                <p className="text-sm text-gray-400">{uc.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 bg-gradient-to-b from-transparent via-fuchsia-500/[0.02] to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple pricing</h2>
            <p className="text-gray-400">Start free, upgrade when you need more</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricing.map(p => (
              <div key={p.name} className={`bg-[#12121a] border rounded-2xl p-8 ${p.popular ? 'border-violet-500/50 ring-1 ring-violet-500/20 relative' : 'border-white/5'}`}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full text-xs font-medium">Most popular</div>}
                <h3 className="font-bold text-lg text-white mb-1">{p.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-white">{p.price}</span>
                  <span className="text-gray-500 text-sm">{p.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-green-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`block w-full text-center py-2.5 rounded-lg font-medium text-sm transition ${p.popular ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white' : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="bg-[#12121a] border border-white/5 rounded-xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="font-medium text-white text-sm">{f.q}</span>
                  <span className={`text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openFaq === i && <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to build your first AI agent?</h2>
          <p className="text-gray-400 mb-8">No credit card required. Start building in seconds.</p>
          <Link href="/signup" className="inline-block px-10 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl font-medium transition shadow-lg shadow-violet-500/25">
            Start building free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-md flex items-center justify-center text-white text-xs font-bold">⚡</div>
            <span className="text-sm font-bold text-gray-400">AgentFlow</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <a href="#" className="hover:text-gray-300 transition">Twitter</a>
            <a href="#" className="hover:text-gray-300 transition">GitHub</a>
            <a href="#" className="hover:text-gray-300 transition">Privacy</a>
            <a href="#" className="hover:text-gray-300 transition">Terms</a>
            <a href="#" className="hover:text-gray-300 transition">Contact</a>
          </div>
          <div className="text-xs text-gray-600">© 2025 AgentFlow. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
