'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { 
  Zap, MessageSquare, GitBranch, Eye, ArrowRight, 
  Bot, Workflow, Play, Shield, Clock, Mail,
  Share2, Camera, Globe, FileText, Brain,
  ChevronRight, Sparkles, MousePointerClick,
  Search, Repeat, Timer, Mic, Image, Video
} from 'lucide-react';

/* ───────── animated intersection observer hook ───────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ───────── animated counter ───────── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.max(1, Math.floor(target / 40));
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(id); }
      else setCount(start);
    }, 30);
    return () => clearInterval(id);
  }, [visible, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ───────── data ───────── */
const nodeTypes = [
  { icon: Clock, label: 'Schedule', color: '#a78bfa', desc: 'Cron & interval triggers' },
  { icon: Globe, label: 'Webhook', color: '#60a5fa', desc: 'Receive external events' },
  { icon: Brain, label: 'Claude AI', color: '#f472b6', desc: 'LLM text generation' },
  { icon: Mail, label: 'Send Email', color: '#34d399', desc: 'SMTP & Resend' },
  { icon: Share2, label: 'Post to X', color: '#38bdf8', desc: 'Auto-tweet content' },
  { icon: Camera, label: 'Instagram', color: '#fb923c', desc: 'Photo & reel posts' },
  { icon: FileText, label: 'Read File', color: '#a3e635', desc: 'CSV, JSON, TXT' },
  { icon: GitBranch, label: 'If / Else', color: '#fbbf24', desc: 'Conditional logic' },
  { icon: Search, label: 'Web Search', color: '#c084fc', desc: 'Google & Bing' },
  { icon: Repeat, label: 'Loop', color: '#f87171', desc: 'Iterate over items' },
  { icon: Image, label: 'Image Gen', color: '#2dd4bf', desc: 'AI image creation' },
  { icon: Mic, label: 'Voice Gen', color: '#e879f9', desc: 'Text-to-speech' },
];

const features = [
  {
    icon: Bot,
    title: 'AI Builder Agent',
    desc: 'Powered by Claude. It understands your intent, asks clarifying questions, and builds the entire workflow for you.',
  },
  {
    icon: Eye,
    title: 'Full Transparency',
    desc: 'Every API call, LLM prompt, response, and cost is visible in the Inspector panel. Learn as you build.',
  },
  {
    icon: Shield,
    title: 'Friendly Errors',
    desc: 'No cryptic errors. Instead of "401 Unauthorized", you\'ll see "Your Twitter login expired -- click here to reconnect."',
  },
  {
    icon: MousePointerClick,
    title: 'Drag & Drop Canvas',
    desc: 'Watch nodes appear automatically, or drag them yourself. Click any node to see and edit its configuration.',
  },
];

const stats = [
  { value: 12, suffix: '+', label: 'Node Types' },
  { value: 50, suffix: 'ms', label: 'Avg Latency' },
  { value: 100, suffix: '%', label: 'Transparent' },
  { value: 0, suffix: '', label: 'Lines of Code', display: '0' },
];

/* ───────── component ───────── */
export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const heroSection = useInView(0.1);
  const previewSection = useInView(0.1);
  const howSection = useInView(0.1);
  const nodesSection = useInView(0.1);
  const featuresSection = useInView(0.1);
  const statsSection = useInView(0.1);
  const ctaSection = useInView(0.1);

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] overflow-x-hidden">
      {/* ─── Ambient background particles ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute w-[600px] h-[600px] top-[-200px] left-[-100px] rounded-full bg-purple-600/[0.04] blur-[150px] animate-[drift_20s_ease-in-out_infinite]" />
        <div className="absolute w-[500px] h-[500px] top-[40%] right-[-150px] rounded-full bg-indigo-600/[0.03] blur-[130px] animate-[drift_25s_ease-in-out_infinite_reverse]" />
        <div className="absolute w-[400px] h-[400px] bottom-[-100px] left-[30%] rounded-full bg-violet-600/[0.03] blur-[120px] animate-[drift_22s_ease-in-out_infinite]" />
      </div>

      {/* ─── Matte grain overlay ─── */}
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.015]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundSize: '128px 128px' }}
      />

      {/* ─── Nav ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
        <div className="mx-4 mt-3 rounded-2xl border border-white/[0.06] bg-[var(--color-bg)]/60 backdrop-blur-2xl shadow-lg shadow-black/10">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white/90 to-white/60 bg-clip-text text-transparent">
                AgentFlow
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/signin"
                className="px-5 py-2 text-sm text-white/50 hover:text-white/80 transition-colors duration-300"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="group relative px-5 py-2 text-sm font-medium text-white rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 transition-opacity duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative">Get Started Free</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative pt-36 pb-16 px-6 z-10" ref={heroSection.ref}>
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/15 bg-purple-500/[0.06] backdrop-blur-sm text-purple-300/80 text-sm mb-10 transition-all duration-1000 ${heroSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span className="tracking-wide">AI-Powered Agent Builder</span>
          </div>
          
          {/* Heading */}
          <h1 className={`text-5xl sm:text-6xl md:text-8xl font-bold leading-[0.95] mb-8 tracking-tight transition-all duration-1000 delay-200 ${heroSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="block bg-gradient-to-b from-white via-white/90 to-white/40 bg-clip-text text-transparent">
              Build AI Agents
            </span>
            <span className="block mt-2 bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }}>
              Just by Talking
            </span>
          </h1>
          
          {/* Subheading */}
          <p className={`text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-12 leading-relaxed font-light transition-all duration-1000 delay-400 ${heroSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Describe what you want in plain English. Watch your AI agent assemble 
            itself on a visual canvas in real time. No code. No complexity.
          </p>

          {/* CTA buttons */}
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 transition-all duration-1000 delay-500 ${heroSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <Link
              href="/signup"
              className="group relative px-10 py-4 text-white rounded-2xl font-semibold text-lg overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
              <span className="relative flex items-center gap-2">
                Start Building
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </Link>
            <Link
              href="/signin"
              className="group px-10 py-4 border border-white/[0.06] hover:border-white/[0.12] rounded-2xl font-medium text-lg transition-all duration-500 hover:bg-white/[0.03] text-white/60 hover:text-white/80 flex items-center gap-2.5 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
              Watch Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Canvas Preview ─── */}
      <section className="relative px-6 pb-28 z-10" ref={previewSection.ref}>
        <div className={`relative max-w-5xl mx-auto transition-all duration-1200 ${previewSection.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-[0.97]'}`}>
          {/* Outer glow ring */}
          <div className="absolute -inset-px rounded-[22px] bg-gradient-to-b from-white/[0.08] to-transparent" />
          
          <div className="relative rounded-[22px] border border-white/[0.06] bg-[var(--color-elevated)]/40 backdrop-blur-2xl overflow-hidden shadow-2xl shadow-black/30">
            {/* Title bar */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.04] bg-white/[0.02]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-white/[0.06] hover:bg-red-400/60 transition-colors duration-300" />
                <div className="w-3 h-3 rounded-full bg-white/[0.06] hover:bg-yellow-400/60 transition-colors duration-300" />
                <div className="w-3 h-3 rounded-full bg-white/[0.06] hover:bg-green-400/60 transition-colors duration-300" />
              </div>
              <span className="text-[11px] text-white/20 ml-1 tracking-wider uppercase font-medium">AgentFlow Builder</span>
            </div>
            
            {/* 3-panel layout */}
            <div className="flex h-[400px]">
              {/* Chat panel */}
              <div className="w-[300px] border-r border-white/[0.04] p-5 flex flex-col">
                <div className="text-[10px] font-semibold text-purple-400/60 mb-4 flex items-center gap-1.5 tracking-widest uppercase">
                  <MessageSquare className="w-3 h-3" /> Chat
                </div>
                <div className="space-y-3 flex-1">
                  <div className={`bg-purple-500/[0.08] border border-purple-500/10 rounded-xl p-3 text-xs text-purple-200/80 leading-relaxed transition-all duration-700 delay-300 ${previewSection.visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                    Send me a daily joke by email every morning
                  </div>
                  <div className={`bg-white/[0.03] border border-white/[0.04] rounded-xl p-3 text-xs text-white/40 leading-relaxed transition-all duration-700 delay-500 ${previewSection.visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                    I&apos;ll build that for you! Creating a Schedule trigger for 8am, connecting it to Claude AI for the joke, then sending via Email...
                  </div>
                  <div className={`flex gap-2 mt-3 transition-all duration-700 delay-700 ${previewSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    <span className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-500/[0.08] border border-emerald-500/10 text-emerald-400/80 cursor-pointer hover:bg-emerald-500/[0.12] transition-colors duration-300">Run Workflow</span>
                    <span className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-purple-500/[0.08] border border-purple-500/10 text-purple-400/80 cursor-pointer hover:bg-purple-500/[0.12] transition-colors duration-300">Edit Node</span>
                  </div>
                </div>
              </div>
              
              {/* Canvas */}
              <div className="flex-1 relative bg-[var(--color-sunken)]/30 p-6">
                <div className="text-[10px] font-semibold text-indigo-400/60 mb-4 flex items-center gap-1.5 tracking-widest uppercase">
                  <Workflow className="w-3 h-3" /> Canvas
                </div>
                {/* Dot grid */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                
                <div className="flex items-center justify-center h-full gap-6 relative">
                  {/* Schedule node */}
                  <div className={`bg-[var(--color-elevated)]/60 backdrop-blur border border-purple-500/15 rounded-2xl p-4 text-center shadow-xl shadow-purple-900/10 transition-all duration-700 delay-400 hover:border-purple-500/30 hover:scale-105 hover:shadow-purple-500/15 ${previewSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                      <Clock className="w-5 h-5 text-purple-400/80" />
                    </div>
                    <div className="text-[11px] font-semibold text-white/70">Schedule</div>
                    <div className="text-[9px] text-white/25 mt-0.5">8:00 AM daily</div>
                  </div>
                  
                  {/* Connection */}
                  <svg className={`w-16 h-8 transition-all duration-700 delay-600 ${previewSection.visible ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 64 32">
                    <path d="M0 16 L54 16" stroke="url(#grad1)" strokeWidth="1.5" fill="none" strokeDasharray="4 3" className="animate-[dashFlow_2s_linear_infinite]" />
                    <polygon points="54,12 62,16 54,20" fill="rgba(139,92,246,0.3)" />
                    <defs>
                      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(168,85,247,0.3)" />
                        <stop offset="100%" stopColor="rgba(129,140,248,0.3)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Claude node */}
                  <div className={`bg-[var(--color-elevated)]/60 backdrop-blur border border-pink-500/15 rounded-2xl p-4 text-center shadow-xl shadow-pink-900/10 transition-all duration-700 delay-600 hover:border-pink-500/30 hover:scale-105 hover:shadow-pink-500/15 ${previewSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center mx-auto mb-2">
                      <Brain className="w-5 h-5 text-pink-400/80" />
                    </div>
                    <div className="text-[11px] font-semibold text-white/70">Claude AI</div>
                    <div className="text-[9px] text-white/25 mt-0.5">Generate joke</div>
                  </div>
                  
                  {/* Connection */}
                  <svg className={`w-16 h-8 transition-all duration-700 delay-800 ${previewSection.visible ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 64 32">
                    <path d="M0 16 L54 16" stroke="url(#grad2)" strokeWidth="1.5" fill="none" strokeDasharray="4 3" className="animate-[dashFlow_2s_linear_infinite]" />
                    <polygon points="54,12 62,16 54,20" fill="rgba(52,211,153,0.3)" />
                    <defs>
                      <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(244,114,182,0.3)" />
                        <stop offset="100%" stopColor="rgba(52,211,153,0.3)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Email node */}
                  <div className={`bg-[var(--color-elevated)]/60 backdrop-blur border border-emerald-500/15 rounded-2xl p-4 text-center shadow-xl shadow-emerald-900/10 transition-all duration-700 delay-800 hover:border-emerald-500/30 hover:scale-105 hover:shadow-emerald-500/15 ${previewSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                      <Mail className="w-5 h-5 text-emerald-400/80" />
                    </div>
                    <div className="text-[11px] font-semibold text-white/70">Send Email</div>
                    <div className="text-[9px] text-white/25 mt-0.5">To: you@mail.com</div>
                  </div>
                </div>
              </div>
              
              {/* Inspector */}
              <div className="w-[220px] border-l border-white/[0.04] p-5">
                <div className="text-[10px] font-semibold text-emerald-400/60 mb-4 flex items-center gap-1.5 tracking-widest uppercase">
                  <Eye className="w-3 h-3" /> Inspector
                </div>
                <div className="space-y-2.5">
                  {[
                    { status: '200', label: 'Claude API', time: '142ms', delay: 'delay-500' },
                    { status: '200', label: 'Resend Email', time: '89ms', delay: 'delay-700' },
                  ].map((item, i) => (
                    <div key={i} className={`bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 transition-all duration-700 ${item.delay} ${previewSection.visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400/70 font-mono text-[10px] font-bold">{item.status}</span>
                        <span className="text-white/15 text-[9px]">{item.time}</span>
                      </div>
                      <div className="text-white/30 text-[10px] mt-0.5">{item.label}</div>
                    </div>
                  ))}
                  <div className={`bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 transition-all duration-700 delay-[900ms] ${previewSection.visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
                    <div className="text-purple-400/60 text-[10px] font-medium">Cost: $0.003</div>
                    <div className="text-white/20 text-[9px] mt-0.5">247 tokens used</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Shadow underneath */}
          <div className="absolute -bottom-12 left-[10%] right-[10%] h-24 bg-purple-600/[0.06] rounded-full blur-[60px]" />
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-16 px-6 z-10 relative" ref={statsSection.ref}>
        <div className="max-w-4xl mx-auto">
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 transition-all duration-1000 ${statsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {stats.map((stat, i) => (
              <div key={i} className="text-center group" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-b from-white/80 to-white/30 bg-clip-text text-transparent">
                  {stat.label === 'Lines of Code' ? '0' : <Counter target={stat.value} suffix={stat.suffix} />}
                </div>
                <div className="text-xs text-white/25 mt-1 tracking-wider uppercase">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-28 px-6 z-10 relative" ref={howSection.ref}>
        <div className="max-w-5xl mx-auto">
          <div className={`text-center mb-20 transition-all duration-1000 ${howSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-white/80 to-white/40 bg-clip-text text-transparent">How It Works</span>
            </h2>
            <p className="text-white/30 text-lg font-light">Three simple steps. Zero code required.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: MessageSquare, step: '01', title: 'Describe Your Agent', desc: 'Tell the AI what you want in plain English. "Make me an agent that summarizes daily news and emails it to me."', accent: 'purple' },
              { icon: Workflow, step: '02', title: 'Watch It Build', desc: 'See your workflow assemble live on the visual canvas. Every node, connection, and config appears in real time.', accent: 'indigo' },
              { icon: Play, step: '03', title: 'Run & Inspect', desc: 'Hit Run and watch every API call, response, and log stream live. Full transparency into what your agent does.', accent: 'emerald' },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`group relative p-8 rounded-3xl border border-white/[0.04] bg-white/[0.01] backdrop-blur-sm hover:bg-white/[0.03] hover:border-white/[0.08] transition-all duration-700 hover:scale-[1.02] ${howSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${300 + i * 150}ms` }}
              >
                <div className="text-6xl font-bold text-white/[0.02] absolute top-6 right-6 group-hover:text-white/[0.04] transition-colors duration-500">
                  {item.step}
                </div>
                <div className={`w-14 h-14 rounded-2xl bg-${item.accent}-500/[0.06] border border-${item.accent}-500/10 flex items-center justify-center mb-6 group-hover:bg-${item.accent}-500/[0.1] group-hover:border-${item.accent}-500/20 transition-all duration-500`}>
                  <item.icon className={`w-6 h-6 text-${item.accent}-400/60 group-hover:text-${item.accent}-400/80 transition-colors duration-500`} />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white/80">{item.title}</h3>
                <p className="text-sm text-white/30 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Node Library ─── */}
      <section className="py-28 px-6 z-10 relative border-t border-white/[0.03]" ref={nodesSection.ref}>
        <div className="max-w-5xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-1000 ${nodesSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-white/80 to-white/40 bg-clip-text text-transparent">Node Library</span>
            </h2>
            <p className="text-white/30 text-lg font-light">Triggers, AI, social, email, web, logic -- all ready to use.</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {nodeTypes.map((node, i) => (
              <div
                key={node.label}
                className={`group flex items-center gap-3.5 p-4 rounded-2xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.08] transition-all duration-500 cursor-default hover:scale-[1.03] ${nodesSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${200 + i * 60}ms` }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110"
                  style={{ backgroundColor: `${node.color}08`, border: `1px solid ${node.color}15` }}
                >
                  <node.icon className="w-5 h-5 transition-colors duration-500" style={{ color: `${node.color}99` }} />
                </div>
                <div>
                  <div className="text-sm font-medium text-white/70 group-hover:text-white/90 transition-colors duration-300">{node.label}</div>
                  <div className="text-[10px] text-white/20">{node.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-28 px-6 z-10 relative border-t border-white/[0.03]" ref={featuresSection.ref}>
        <div className="max-w-5xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-1000 ${featuresSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-white/80 to-white/40 bg-clip-text text-transparent">Built for Everyone</span>
            </h2>
            <p className="text-white/30 text-lg font-light">No technical knowledge needed. The AI handles the complexity.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`group flex gap-5 p-7 rounded-3xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.08] transition-all duration-700 hover:scale-[1.01] ${featuresSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${300 + i * 120}ms` }}
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-500/[0.06] border border-purple-500/10 flex items-center justify-center shrink-0 group-hover:bg-purple-500/[0.1] group-hover:border-purple-500/20 transition-all duration-500">
                  <feature.icon className="w-5 h-5 text-purple-400/60 group-hover:text-purple-400/80 transition-colors duration-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1.5 text-white/80">{feature.title}</h3>
                  <p className="text-sm text-white/30 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-32 px-6 z-10 relative border-t border-white/[0.03]" ref={ctaSection.ref}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative">
            {/* Ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-purple-600/[0.06] rounded-full blur-[100px] pointer-events-none" />
            
            <h2 className={`text-4xl md:text-6xl font-bold mb-8 relative z-10 tracking-tight transition-all duration-1000 ${ctaSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <span className="bg-gradient-to-r from-white/80 via-purple-200/60 to-white/40 bg-clip-text text-transparent">
                Ready to build your first agent?
              </span>
            </h2>
            <p className={`text-lg text-white/30 mb-12 relative z-10 font-light transition-all duration-1000 delay-200 ${ctaSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              Just type what you want. The AI does the rest.
            </p>
            <Link
              href="/signup"
              className={`group relative z-10 inline-flex items-center gap-2.5 px-12 py-5 text-white rounded-2xl font-semibold text-lg overflow-hidden transition-all duration-700 delay-400 hover:shadow-2xl hover:shadow-purple-500/20 hover:scale-[1.03] active:scale-[0.98] ${ctaSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative">Get Started Free</span>
              <ChevronRight className="w-5 h-5 relative group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.03] py-10 px-6 z-10 relative">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/80 to-indigo-600/80 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white/80" />
            </div>
            <span className="text-sm font-semibold text-white/20">AgentFlow</span>
          </div>
          <p className="text-[11px] text-white/15 tracking-wider">
            Built with Next.js, React Flow & Claude AI
          </p>
        </div>
      </footer>

      {/* ─── Global keyframes ─── */}
      <style jsx global>{`
        @keyframes drift {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(30px, -20px); }
          50% { transform: translate(-20px, 30px); }
          75% { transform: translate(20px, 20px); }
        }
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes dashFlow {
          0% { stroke-dashoffset: 14; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
