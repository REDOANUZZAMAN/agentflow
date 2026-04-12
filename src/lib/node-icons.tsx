'use client';

import React from 'react';
import {
  MousePointerClick, Clock, Link2, Brain, Image, Video, Mic,
  MessageCircle, Camera as CameraIcon, Briefcase, Music, Mail, Send,
  Globe, Search, Bug, FolderOpen, FileText, Pencil, FileOutput,
  ScrollText, Drama, Camera, Film, AudioLines, Target, Clapperboard,
  GitBranch, Repeat, Timer, Zap, Bot, Package, Settings, HelpCircle,
  Share2, Hash,
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
