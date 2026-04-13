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
