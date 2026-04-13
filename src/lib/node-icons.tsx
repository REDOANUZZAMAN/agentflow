'use client';

import React from 'react';
import {
  MousePointerClick, Clock, Link2, Brain, Image, Video, Mic,
  MessageCircle, Camera as CameraIcon, Briefcase, Music, Mail, Send,
  Globe, Search, Bug, FolderOpen, FileText, Pencil, FileOutput,
  ScrollText, Drama, Camera, Film, AudioLines, Target, Clapperboard,
  GitBranch, Repeat, Timer, Zap, Bot, Package, Settings, HelpCircle,
  Share2, Hash, Laugh, Newspaper, Sparkles, Eye, Workflow,
} from 'lucide-react';

// ─── Node Color Map ──────────────────────────────────────────
// Each node type gets a unique color: { icon: tailwind text color, bg: tailwind bg color, ring: ring color }
export interface NodeColor {
  icon: string;   // e.g. 'text-amber-400'
  bg: string;     // e.g. 'bg-amber-500/15'
  ring: string;   // e.g. 'ring-amber-500/30'
  gradient: string; // gradient for canvas node header
}

const NODE_COLOR_MAP: Record<string, NodeColor> = {
  // Triggers — warm amber/orange
  manual_trigger:    { icon: 'text-amber-400',   bg: 'bg-amber-500/15',   ring: 'ring-amber-500/30',   gradient: 'from-amber-500/20 to-orange-500/20' },
  schedule_trigger:  { icon: 'text-orange-400',  bg: 'bg-orange-500/15',  ring: 'ring-orange-500/30',  gradient: 'from-orange-500/20 to-yellow-500/20' },
  webhook_trigger:   { icon: 'text-yellow-400',  bg: 'bg-yellow-500/15',  ring: 'ring-yellow-500/30',  gradient: 'from-yellow-500/20 to-amber-500/20' },
  // AI — purple/indigo
  claude_chat:       { icon: 'text-purple-400',  bg: 'bg-purple-500/15',  ring: 'ring-purple-500/30',  gradient: 'from-purple-500/20 to-indigo-500/20' },
  image_gen:         { icon: 'text-fuchsia-400', bg: 'bg-fuchsia-500/15', ring: 'ring-fuchsia-500/30', gradient: 'from-fuchsia-500/20 to-pink-500/20' },
  video_gen:         { icon: 'text-pink-400',    bg: 'bg-pink-500/15',    ring: 'ring-pink-500/30',    gradient: 'from-pink-500/20 to-rose-500/20' },
  voice_gen:         { icon: 'text-violet-400',  bg: 'bg-violet-500/15',  ring: 'ring-violet-500/30',  gradient: 'from-violet-500/20 to-purple-500/20' },
  // Social — blues/cyans
  post_x:            { icon: 'text-sky-400',     bg: 'bg-sky-500/15',     ring: 'ring-sky-500/30',     gradient: 'from-sky-500/20 to-blue-500/20' },
  post_instagram:    { icon: 'text-pink-400',    bg: 'bg-pink-500/15',    ring: 'ring-pink-500/30',    gradient: 'from-pink-500/20 to-rose-500/20' },
  post_linkedin:     { icon: 'text-blue-400',    bg: 'bg-blue-500/15',    ring: 'ring-blue-500/30',    gradient: 'from-blue-500/20 to-indigo-500/20' },
  post_tiktok:       { icon: 'text-rose-400',    bg: 'bg-rose-500/15',    ring: 'ring-rose-500/30',    gradient: 'from-rose-500/20 to-red-500/20' },
  // Communications — green/emerald
  send_email:        { icon: 'text-emerald-400', bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/30', gradient: 'from-emerald-500/20 to-green-500/20' },
  send_telegram:     { icon: 'text-cyan-400',    bg: 'bg-cyan-500/15',    ring: 'ring-cyan-500/30',    gradient: 'from-cyan-500/20 to-sky-500/20' },
  // Web — teal/orange
  http_request:      { icon: 'text-orange-400',  bg: 'bg-orange-500/15',  ring: 'ring-orange-500/30',  gradient: 'from-orange-500/20 to-amber-500/20' },
  web_search:        { icon: 'text-teal-400',    bg: 'bg-teal-500/15',    ring: 'ring-teal-500/30',    gradient: 'from-teal-500/20 to-cyan-500/20' },
  web_scraper:       { icon: 'text-slate-400',   bg: 'bg-slate-500/15',   ring: 'ring-slate-500/30',   gradient: 'from-slate-500/20 to-gray-500/20' },
  // Files — warm yellows
  file_read:         { icon: 'text-yellow-400',  bg: 'bg-yellow-500/15',  ring: 'ring-yellow-500/30',  gradient: 'from-yellow-500/20 to-amber-500/20' },
  file_write:        { icon: 'text-lime-400',    bg: 'bg-lime-500/15',    ring: 'ring-lime-500/30',    gradient: 'from-lime-500/20 to-green-500/20' },
  file_generate:     { icon: 'text-amber-400',   bg: 'bg-amber-500/15',   ring: 'ring-amber-500/30',   gradient: 'from-amber-500/20 to-yellow-500/20' },
  // Video Pipeline — vivid rainbow
  script_parser:     { icon: 'text-cyan-400',    bg: 'bg-cyan-500/15',    ring: 'ring-cyan-500/30',    gradient: 'from-cyan-500/20 to-teal-500/20' },
  element_reference: { icon: 'text-fuchsia-400', bg: 'bg-fuchsia-500/15', ring: 'ring-fuchsia-500/30', gradient: 'from-fuchsia-500/20 to-pink-500/20' },
  photo_generator:   { icon: 'text-rose-400',    bg: 'bg-rose-500/15',    ring: 'ring-rose-500/30',    gradient: 'from-rose-500/20 to-orange-500/20' },
  video_generator:   { icon: 'text-red-400',     bg: 'bg-red-500/15',     ring: 'ring-red-500/30',     gradient: 'from-red-500/20 to-amber-500/20' },
  voiceover_generator: { icon: 'text-sky-400',   bg: 'bg-sky-500/15',     ring: 'ring-sky-500/30',     gradient: 'from-sky-500/20 to-blue-500/20' },
  music_generator:   { icon: 'text-indigo-400',  bg: 'bg-indigo-500/15',  ring: 'ring-indigo-500/30',  gradient: 'from-indigo-500/20 to-violet-500/20' },
  project_orchestrator: { icon: 'text-emerald-400', bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/30', gradient: 'from-emerald-500/20 to-cyan-500/20' },
  final_video_compiler: { icon: 'text-red-400',  bg: 'bg-red-500/15',     ring: 'ring-red-500/30',     gradient: 'from-rose-500/20 to-red-500/20' },
  // Logic — violet
  if_else:           { icon: 'text-violet-400',  bg: 'bg-violet-500/15',  ring: 'ring-violet-500/30',  gradient: 'from-violet-500/20 to-purple-500/20' },
  loop:              { icon: 'text-indigo-400',  bg: 'bg-indigo-500/15',  ring: 'ring-indigo-500/30',  gradient: 'from-indigo-500/20 to-violet-500/20' },
  wait:              { icon: 'text-gray-400',    bg: 'bg-gray-500/15',    ring: 'ring-gray-500/30',    gradient: 'from-gray-500/20 to-slate-500/20' },
};

const DEFAULT_NODE_COLOR: NodeColor = {
  icon: 'text-gray-400',
  bg: 'bg-gray-500/15',
  ring: 'ring-gray-500/30',
  gradient: 'from-gray-500/20 to-zinc-500/20',
};

/**
 * Get the color scheme for a node type.
 */
export function getNodeColor(nodeType: string): NodeColor {
  return NODE_COLOR_MAP[nodeType] || DEFAULT_NODE_COLOR;
}

// Map node types to Lucide icons (replaces emoji strings)
const NODE_ICON_MAP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  // Triggers
  manual_trigger: MousePointerClick,
  schedule_trigger: Clock,
  webhook_trigger: Link2,
  // AI
  claude_chat: Brain,
  image_gen: Image,
  video_gen: Video,
  voice_gen: Mic,
  // Social
  post_x: Hash,
  post_instagram: CameraIcon,
  post_linkedin: Briefcase,
  post_tiktok: Music,
  // Communications
  send_email: Mail,
  send_telegram: Send,
  // Web
  http_request: Globe,
  web_search: Search,
  web_scraper: Bug,
  // Files
  file_read: FileText,
  file_write: Pencil,
  file_generate: FileOutput,
  // Video Pipeline
  script_parser: ScrollText,
  element_reference: Drama,
  photo_generator: Camera,
  video_generator: Film,
  voiceover_generator: AudioLines,
  music_generator: Music,
  project_orchestrator: Target,
  final_video_compiler: Clapperboard,
  // Logic
  if_else: GitBranch,
  loop: Repeat,
  wait: Timer,
};

// Category icons
const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Triggers: Zap,
  AI: Bot,
  Social: Share2,
  Communications: Mail,
  Web: Globe,
  Files: FolderOpen,
  'Video Pipeline': Film,
  Logic: Settings,
};

/**
 * Get the Lucide icon component for a node type.
 * Falls back to HelpCircle for unknown types.
 */
export function getNodeIcon(nodeType: string): React.ComponentType<{ className?: string; strokeWidth?: number }> {
  return NODE_ICON_MAP[nodeType] || HelpCircle;
}

/**
 * Get the Lucide icon component for a category name.
 */
export function getCategoryIcon(categoryName: string): React.ComponentType<{ className?: string; strokeWidth?: number }> {
  return CATEGORY_ICON_MAP[categoryName] || Package;
}

/**
 * Render a node icon as JSX with consistent sizing.
 */
export function NodeIcon({ type, className = 'w-4 h-4', strokeWidth = 1.5 }: { type: string; className?: string; strokeWidth?: number }) {
  const Icon = getNodeIcon(type);
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

/**
 * Render a category icon as JSX.
 */
export function CategoryIcon({ name, className = 'w-4 h-4', strokeWidth = 1.5 }: { name: string; className?: string; strokeWidth?: number }) {
  const Icon = getCategoryIcon(name);
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

// ─── Workflow Icon (maps emoji strings to Lucide icons) ─────

// Maps old emoji characters AND new [text] markers to Lucide icons
const WORKFLOW_EMOJI_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  // Old emoji characters (from Supabase stored data)
  '🤖': Bot,
  '😂': Laugh,
  '📰': Newspaper,
  '✨': Sparkles,
  '🔍': Search,
  '🎬': Film,
  '⚡': Zap,
  '🧠': Brain,
  '📧': Mail,
  '🐦': Hash,
  '🔗': Link2,
  '⏰': Clock,
  '🎯': Target,
  '📸': Camera,
  '🎵': Music,
  '💼': Briefcase,
  '🌐': Globe,
  '📁': FolderOpen,
  '🎥': Film,
  '⚙️': Settings,
  // New [text] markers
  '[bot]': Bot,
  '[joke]': Laugh,
  '[news]': Newspaper,
  '[sparkle]': Sparkles,
  '[search]': Search,
  '[video]': Film,
  '[zap]': Zap,
  '[brain]': Brain,
  '[email]': Mail,
  '[bird]': Hash,
  '[link]': Link2,
  '[clock]': Clock,
  '[target]': Target,
  '[photo]': Camera,
  '[music]': Music,
  '[briefcase]': Briefcase,
  '[globe]': Globe,
  '[folder]': FolderOpen,
  '[camera]': Film,
  '[gear]': Settings,
  '[eye]': Eye,
};

/**
 * Get Lucide icon for a workflow emoji string (handles old emojis + new text markers).
 * Falls back to Bot icon.
 */
export function getWorkflowIcon(emoji: string): React.ComponentType<{ className?: string }> {
  if (!emoji) return Bot;
  const trimmed = emoji.trim();
  return WORKFLOW_EMOJI_MAP[trimmed] || Bot;
}

/**
 * Render a workflow icon as JSX. Maps any emoji string to a Lucide icon.
 */
export function WorkflowIcon({ emoji, className = 'w-4 h-4' }: { emoji?: string; className?: string }) {
  const Icon = getWorkflowIcon(emoji || '');
  return <Icon className={className} />;
}
