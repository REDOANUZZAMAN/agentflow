'use client';

import Link from 'next/link';
import { 
  Zap, MessageSquare, GitBranch, Eye, ArrowRight, 
  Bot, Workflow, Play, Shield, Clock, Mail,
  Share2, Camera, Globe, FileText, Brain,
  ChevronRight, Sparkles, MousePointerClick
} from 'lucide-react';

const nodeTypes = [
  { icon: Clock, label: 'Schedule', color: '#a78bfa' },
  { icon: Globe, label: 'Webhook', color: '#60a5fa' },
  { icon: Brain, label: 'Claude AI', color: '#f472b6' },
  { icon: Mail, label: 'Send Email', color: '#34d399' },
  { icon: Share2, label: 'Post to X', color: '#38bdf8' },
  { icon: Camera, label: 'Instagram', color: '#fb923c' },
  { icon: FileText, label: 'Read File', color: '#a3e635' },
  { icon: GitBranch, label: 'If / Else', color: '#fbbf24' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[var(--color-bg)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">
              AgentFlow
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-purple-500/20"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 left-1/3 w-[400px] h-[300px] bg-indigo-600/8 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 text-sm mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Agent Builder
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            <span className="bg-gradient-to-b from-white to-purple-200 bg-clip-text text-transparent">
              Build AI Agents
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Just by Talking
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Describe what you want in plain English. Watch your AI agent assemble 
            itself on a visual canvas in real time. No code. No complexity. Just results.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/signup"
              className="group px-8 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-lg transition-all shadow-xl shadow-purple-500/25 flex items-center gap-2"
            >
              Start Building
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/signin"
              className="px-8 py-3.5 border border-white/10 hover:border-white/20 rounded-xl font-medium text-lg transition-all hover:bg-white/5 flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Watch Demo
            </Link>
          </div>

          {/* Canvas Preview */}
          <div className="relative max-w-4xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-[var(--color-elevated)]/80 backdrop-blur-xl overflow-hidden shadow-2xl shadow-purple-900/20">
              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-[var(--color-text-secondary)] ml-2">AgentFlow Builder</span>
              </div>
              
              {/* 3-panel layout mock */}
              <div className="flex h-[380px]">
                {/* Chat panel */}
                <div className="w-[280px] border-r border-white/5 p-4 flex flex-col">
                  <div className="text-xs font-medium text-purple-400 mb-3 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" /> Chat
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2.5 text-xs text-purple-200">
                      Send me a daily joke by email every morning
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-lg p-2.5 text-xs text-[var(--color-text-secondary)]">
                      I&apos;ll build that for you! Creating a Schedule trigger for 8am, connecting it to Claude AI for the joke, then sending via Email...
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 rounded text-[10px] bg-green-500/10 border border-green-500/20 text-green-400 cursor-pointer">Run Workflow</span>
                      <span className="px-2 py-1 rounded text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 cursor-pointer">Edit Node</span>
                    </div>
                  </div>
                </div>
                
                {/* Canvas panel */}
                <div className="flex-1 relative bg-[var(--color-sunken)]/50 p-6">
                  <div className="text-xs font-medium text-indigo-400 mb-3 flex items-center gap-1.5">
                    <Workflow className="w-3 h-3" /> Canvas
                  </div>
                  {/* Mock nodes */}
                  <div className="flex items-center justify-center h-full gap-8">
                    {/* Schedule node */}
                    <div className="bg-[var(--color-elevated)] border border-purple-500/30 rounded-xl p-3 text-center shadow-lg shadow-purple-500/10 animate-pulse" style={{animationDuration: '3s'}}>
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto mb-1.5">
                        <Clock className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="text-[10px] font-medium">Schedule</div>
                      <div className="text-[8px] text-[var(--color-text-secondary)]">8:00 AM daily</div>
                    </div>
                    
                    {/* Connection line */}
                    <div className="w-12 h-px bg-gradient-to-r from-purple-500/50 to-indigo-500/50 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[5px] border-l-indigo-500/50 border-y-[3px] border-y-transparent" />
                    </div>
                    
                    {/* Claude node */}
                    <div className="bg-[var(--color-elevated)] border border-pink-500/30 rounded-xl p-3 text-center shadow-lg shadow-pink-500/10 animate-pulse" style={{animationDuration: '3s', animationDelay: '0.5s'}}>
                      <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center mx-auto mb-1.5">
                        <Brain className="w-4 h-4 text-pink-400" />
                      </div>
                      <div className="text-[10px] font-medium">Claude AI</div>
                      <div className="text-[8px] text-[var(--color-text-secondary)]">Generate joke</div>
                    </div>
                    
                    {/* Connection line */}
                    <div className="w-12 h-px bg-gradient-to-r from-pink-500/50 to-green-500/50 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[5px] border-l-green-500/50 border-y-[3px] border-y-transparent" />
                    </div>
                    
                    {/* Email node */}
                    <div className="bg-[var(--color-elevated)] border border-green-500/30 rounded-xl p-3 text-center shadow-lg shadow-green-500/10 animate-pulse" style={{animationDuration: '3s', animationDelay: '1s'}}>
                      <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center mx-auto mb-1.5">
                        <Mail className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="text-[10px] font-medium">Send Email</div>
                      <div className="text-[8px] text-[var(--color-text-secondary)]">To: you@mail.com</div>
                    </div>
                  </div>
                </div>
                
                {/* Inspector panel */}
                <div className="w-[200px] border-l border-white/5 p-4">
                  <div className="text-xs font-medium text-emerald-400 mb-3 flex items-center gap-1.5">
                    <Eye className="w-3 h-3" /> Inspector
                  </div>
                  <div className="space-y-2">
                    <div className="bg-white/3 rounded p-2 text-[9px]">
                      <div className="text-green-400 font-mono">200 OK</div>
                      <div className="text-[var(--color-text-secondary)]">Claude API - 142ms</div>
                    </div>
                    <div className="bg-white/3 rounded p-2 text-[9px]">
                      <div className="text-green-400 font-mono">200 OK</div>
                      <div className="text-[var(--color-text-secondary)]">Resend Email - 89ms</div>
                    </div>
                    <div className="bg-white/3 rounded p-2 text-[9px]">
                      <div className="text-purple-400">Cost: $0.003</div>
                      <div className="text-[var(--color-text-secondary)]">Total tokens: 247</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Glow under preview */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[60%] h-20 bg-purple-600/15 rounded-full blur-[60px]" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">
              How It Works
            </h2>
            <p className="text-[var(--color-text-secondary)] text-lg">Three simple steps. Zero code required.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageSquare,
                step: '01',
                title: 'Describe Your Agent',
                desc: 'Tell the AI what you want in plain English. "Make me an agent that summarizes daily news and emails it to me."',
                color: 'purple',
              },
              {
                icon: Workflow,
                step: '02', 
                title: 'Watch It Build',
                desc: 'See your workflow assemble live on the visual canvas. Every node, connection, and config appears in real time.',
                color: 'indigo',
              },
              {
                icon: Play,
                step: '03',
                title: 'Run & Inspect',
                desc: 'Hit Run and watch every API call, response, and log stream live. Full transparency into what your agent does.',
                color: 'emerald',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group relative p-6 rounded-2xl border border-white/5 bg-[var(--color-elevated)]/50 hover:border-purple-500/20 transition-all duration-300"
              >
                <div className="text-5xl font-bold text-white/[0.03] absolute top-4 right-4">
                  {item.step}
                </div>
                <div className={`w-12 h-12 rounded-xl bg-${item.color}-500/10 border border-${item.color}-500/20 flex items-center justify-center mb-4`}>
                  <item.icon className={`w-6 h-6 text-${item.color}-400`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Node Library */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
              Powerful Node Library
            </h2>
            <p className="text-[var(--color-text-secondary)] text-lg">
              Triggers, AI, social media, email, web scraping, logic -- all ready to use.
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {nodeTypes.map((node) => (
              <div
                key={node.label}
                className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-[var(--color-elevated)]/30 hover:border-white/10 transition-all group cursor-default"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${node.color}15`, border: `1px solid ${node.color}30` }}
                >
                  <node.icon className="w-5 h-5" style={{ color: node.color }} />
                </div>
                <span className="text-sm font-medium">{node.label}</span>
              </div>
            ))}
          </div>
          
          <p className="text-center text-sm text-[var(--color-text-secondary)] mt-6">
            + HTTP Request, Web Search, Web Scraper, Image Gen, Video Gen, Voice Gen, Loops, Wait, and more...
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
              Built for Everyone
            </h2>
            <p className="text-[var(--color-text-secondary)] text-lg">No technical knowledge needed. The AI handles the complexity.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
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
                title: 'Friendly Error Messages',
                desc: 'No cryptic errors. Instead of "401 Unauthorized", you\'ll see "Your Twitter login expired -- click here to reconnect."',
              },
              {
                icon: MousePointerClick,
                title: 'Drag & Drop Canvas',
                desc: 'Watch nodes appear automatically, or drag them yourself. Click any node to see and edit its configuration.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex gap-4 p-6 rounded-2xl border border-white/5 bg-[var(--color-elevated)]/30 hover:border-purple-500/15 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <feature.icon className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />
            <h2 className="text-3xl md:text-5xl font-bold mb-6 relative z-10">
              <span className="bg-gradient-to-r from-purple-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
                Ready to build your first agent?
              </span>
            </h2>
            <p className="text-lg text-[var(--color-text-secondary)] mb-10 relative z-10">
              Just type what you want. The AI does the rest.
            </p>
            <Link
              href="/signup"
              className="group relative z-10 inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-lg transition-all shadow-xl shadow-purple-500/25"
            >
              Get Started Free
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">AgentFlow</span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Built with Next.js, React Flow & Claude AI
          </p>
        </div>
      </footer>
    </div>
  );
}
