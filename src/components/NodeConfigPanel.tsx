'use client';

import React, { useState, useEffect } from 'react';
import { X, Play, Trash2, Copy, EyeOff, Eye, HelpCircle, StickyNote } from 'lucide-react';
import { useApp } from '@/lib/context';
import { getNodeMeta, type NodeType } from '@/lib/types';

export default function NodeConfigPanel() {
  const { state, dispatch } = useApp();
  const selectedNode = state.nodes.find((n) => n.id === state.selectedNodeId);

  if (!selectedNode) return null;

  const meta = getNodeMeta(selectedNode.data.type);
  const config = selectedNode.data.config || {};

  const updateConfig = (key: string, value: unknown) => {
    dispatch({
      type: 'UPDATE_NODE',
      payload: {
        id: selectedNode.id,
        data: {
          config: { ...config, [key]: value },
        },
      },
    });
  };

  const updateLabel = (label: string) => {
    dispatch({
      type: 'UPDATE_NODE',
      payload: { id: selectedNode.id, data: { label } },
    });
  };

  const deleteNode = () => {
    dispatch({ type: 'DELETE_NODE', payload: selectedNode.id });
    dispatch({ type: 'SET_SELECTED_NODE', payload: null });
  };

  const duplicateNode = () => {
    const newId = `node_${Date.now()}_dup`;
    dispatch({
      type: 'ADD_NODE',
      payload: {
        id: newId,
        type: 'workflowNode',
        position: {
          x: selectedNode.position.x + 30,
          y: selectedNode.position.y + 30,
        },
        data: { ...selectedNode.data },
      },
    });
    dispatch({ type: 'SET_SELECTED_NODE', payload: newId });
  };

  const configFields = getConfigFields(selectedNode.data.type);

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
        <span className="text-xl">{selectedNode.data.emoji}</span>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={selectedNode.data.label}
            onChange={(e) => updateLabel(e.target.value)}
            className="text-sm font-semibold text-[var(--foreground)] bg-transparent border-none outline-none w-full hover:bg-[var(--card)] focus:bg-[var(--card)] rounded px-1 -ml-1 transition-colors"
          />
          <p className="text-[10px] text-[var(--muted-foreground)]">{meta.category} • {meta.description}</p>
        </div>
        <button
          onClick={() => dispatch({ type: 'SET_SELECTED_NODE', payload: null })}
          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[var(--secondary)] transition-colors"
        >
          <X className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
        </button>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--border)]">
        <ActionBtn icon={<Play className="w-3 h-3" />} label="Test" onClick={() => {}} />
        <ActionBtn icon={<Copy className="w-3 h-3" />} label="Duplicate" onClick={duplicateNode} />
        <ActionBtn icon={<Trash2 className="w-3 h-3" />} label="Delete" onClick={deleteNode} destructive />
      </div>

      {/* Config fields */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {configFields.map((field) => (
          <ConfigField
            key={field.key}
            field={field}
            value={config[field.key]}
            onChange={(val) => updateConfig(field.key, val)}
          />
        ))}

        {configFields.length === 0 && (
          <div className="text-center py-8 text-xs text-[var(--muted-foreground)]">
            <p>This node has no configuration options.</p>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-[11px] font-medium text-[var(--muted-foreground)] flex items-center gap-1 mb-1">
            <StickyNote className="w-3 h-3" /> Notes
          </label>
          <textarea
            value={(config._notes as string) || ''}
            onChange={(e) => updateConfig('_notes', e.target.value)}
            placeholder="Add notes about this node..."
            className="w-full px-3 py-2 text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-[var(--primary)] resize-none min-h-[60px]"
          />
        </div>
      </div>

      {/* Node ID footer */}
      <div className="px-4 py-2 border-t border-[var(--border)] text-[9px] text-[var(--muted-foreground)]/50 font-mono truncate">
        ID: {selectedNode.id}
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, destructive }: {
  icon: React.ReactNode; label: string; onClick: () => void; destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] rounded-md border transition-colors ${
        destructive
          ? 'border-[var(--destructive)]/20 text-[var(--destructive)] hover:bg-[var(--destructive)]/10'
          : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
      }`}
    >
      {icon} {label}
    </button>
  );
}

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'toggle' | 'select' | 'json' | 'readonly_connections';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

function ConfigField({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  switch (field.type) {
    case 'text':
      return (
        <div>
          <label className="text-[11px] font-medium text-[var(--muted-foreground)] mb-1 block">
            {field.label} {field.required && <span className="text-[var(--destructive)]">*</span>}
          </label>
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-1.5 text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-[var(--primary)]"
          />
        </div>
      );
    case 'textarea':
      return (
        <div>
          <label className="text-[11px] font-medium text-[var(--muted-foreground)] mb-1 block">
            {field.label} {field.required && <span className="text-[var(--destructive)]">*</span>}
          </label>
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-[var(--primary)] resize-none min-h-[80px]"
          />
        </div>
      );
    case 'number':
      return (
        <div>
          <label className="text-[11px] font-medium text-[var(--muted-foreground)] mb-1 block">{field.label}</label>
          <input
            type="number"
            value={(value as number) || ''}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={field.placeholder}
            className="w-full px-3 py-1.5 text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-[var(--primary)]"
          />
        </div>
      );
    case 'toggle':
      return (
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-[var(--muted-foreground)]">{field.label}</label>
          <button
            onClick={() => onChange(!value)}
            className={`w-8 h-4 rounded-full transition-colors ${value ? 'bg-[var(--primary)]' : 'bg-[var(--secondary)]'}`}
          >
            <div className={`w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${value ? 'translate-x-4' : ''}`} />
          </button>
        </div>
      );
    case 'select': {
      const isEmpty = !value && field.required;
      return (
        <div>
          <label className="text-[11px] font-medium text-[var(--muted-foreground)] mb-1 block">
            {field.label} {field.required && <span className="text-[var(--destructive)]">*</span>}
          </label>
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-1.5 text-xs bg-[var(--card)] border rounded-lg text-[var(--foreground)] outline-none focus:border-[var(--primary)] ${
              isEmpty ? 'border-red-500/60 ring-1 ring-red-500/20' : 'border-[var(--border)]'
            }`}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {isEmpty && (
            <p className="text-[9px] text-red-400 mt-0.5">⚠️ Required — select a model to run this node</p>
          )}
        </div>
      );
    }
    case 'readonly_connections':
      return (
        <div className="border border-dashed border-[var(--border)] rounded-lg p-3 bg-[var(--card)]/50">
          <label className="text-[11px] font-medium text-[var(--muted-foreground)] mb-1 block">
            🔗 {field.label}
          </label>
          <p className="text-[10px] text-[var(--muted-foreground)] leading-relaxed">
            {field.placeholder}
          </p>
        </div>
      );
    default:
      return null;
  }
}

function getConfigFields(type: NodeType | string): FieldDef[] {
  switch (type) {
    case 'schedule_trigger':
      return [
        { key: 'schedule', label: 'Schedule', type: 'text', placeholder: 'e.g. every day at 8am', required: true },
        { key: 'cron', label: 'Cron Expression', type: 'text', placeholder: '0 8 * * *' },
        { key: 'timezone', label: 'Timezone', type: 'text', placeholder: 'America/New_York' },
      ];
    case 'manual_trigger':
      return [
        { key: '_runHint', label: 'Click "▶ Run Workflow" in the top bar or press Ctrl+Enter to trigger this workflow.', type: 'text', placeholder: '' },
      ];
    case 'webhook_trigger':
      return [
        { key: 'path', label: 'Webhook Path', type: 'text', placeholder: '/my-webhook' },
        { key: 'method', label: 'HTTP Method', type: 'select', options: [
          { value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' }, { value: 'DELETE', label: 'DELETE' },
        ]},
      ];
    case 'claude_chat':
      return [
        { key: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'What should Claude do?', required: true },
        { key: 'model', label: 'Model', type: 'select', options: [
          { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4' },
          { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (fast)' },
        ]},
        { key: 'temperature', label: 'Temperature', type: 'number', placeholder: '0.7' },
        { key: 'maxTokens', label: 'Max Tokens', type: 'number', placeholder: '1024' },
      ];
    case 'send_email':
      return [
        { key: 'to', label: 'To', type: 'text', placeholder: 'recipient@example.com', required: true },
        { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Email subject', required: true },
        { key: 'body', label: 'Body', type: 'textarea', placeholder: 'Email body (supports {{ expressions }})' },
      ];
    case 'post_x':
      return [
        { key: 'text', label: 'Tweet Text', type: 'textarea', placeholder: 'What to post (max 280 chars)', required: true },
        { key: 'imageUrl', label: 'Image URL', type: 'text', placeholder: 'Optional image URL' },
      ];
    case 'post_instagram':
    case 'post_linkedin':
    case 'post_tiktok':
      return [
        { key: 'text', label: 'Post Text', type: 'textarea', placeholder: 'Post content', required: true },
        { key: 'mediaUrl', label: 'Media URL', type: 'text', placeholder: 'Image or video URL' },
      ];
    case 'send_telegram':
      return [
        { key: 'chatId', label: 'Chat ID', type: 'text', placeholder: 'Telegram chat ID', required: true },
        { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Message text', required: true },
      ];
    case 'http_request':
      return [
        { key: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/data', required: true },
        { key: 'method', label: 'Method', type: 'select', options: [
          { value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' }, { value: 'DELETE', label: 'DELETE' },
        ]},
        { key: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Authorization": "Bearer ..."}' },
        { key: 'body', label: 'Request Body', type: 'textarea', placeholder: '{}' },
      ];
    case 'web_search':
      return [
        { key: 'query', label: 'Search Query', type: 'text', placeholder: 'What to search for', required: true },
        { key: 'maxResults', label: 'Max Results', type: 'number', placeholder: '5' },
      ];
    case 'web_scraper':
      return [
        { key: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com', required: true },
        { key: 'selector', label: 'CSS Selector', type: 'text', placeholder: '.article-content' },
      ];
    case 'if_else':
      return [
        { key: 'condition', label: 'Condition', type: 'textarea', placeholder: 'e.g. {{ $input.status }} === "success"', required: true },
      ];
    case 'loop':
      return [
        { key: 'items', label: 'Items Expression', type: 'text', placeholder: '{{ $input.items }}', required: true },
      ];
    case 'wait':
      return [
        { key: 'duration', label: 'Duration (seconds)', type: 'number', placeholder: '60', required: true },
      ];
    case 'image_gen':
      return [
        { key: 'prompt', label: 'Image Prompt', type: 'textarea', placeholder: 'Describe the image...', required: true },
        { key: 'size', label: 'Size', type: 'select', options: [
          { value: '1024x1024', label: '1024×1024' }, { value: '512x512', label: '512×512' },
        ]},
      ];
    // Video Pipeline nodes
    case 'script_parser':
      return [
        { key: 'script', label: 'Script Text', type: 'textarea', placeholder: 'Paste your full script here or upload a .txt file...', required: true },
        { key: 'format', label: 'Script Format', type: 'select', options: [
          { value: 'auto', label: 'Auto-detect' }, { value: 'structured', label: 'Structured (scenes/shots)' },
          { value: 'freeform', label: 'Freeform (AI restructures)' },
        ]},
      ];
    case 'element_reference':
      return [
        { key: 'elementName', label: 'Element Name', type: 'text', placeholder: '@Hacker, @HackerRoom, etc.', required: true },
        { key: 'description', label: 'Visual Description', type: 'textarea', placeholder: 'Describe how this character/location should look consistently...', required: true },
        { key: 'model', label: 'Generation Model', type: 'select', required: true, options: [
          { value: 'fal-ai/nano-banana-2', label: '⚡ Nano Banana 2 (default, fast, $0.04)' },
          { value: 'fal-ai/nano-banana-2/edit', label: '🎨 Nano Banana 2 Edit (with refs, $0.04)' },
          { value: 'fal-ai/bytedance/seedream/v4.5/text-to-image', label: '✨ Seedream 4.5 (4K, text-in-image, $0.06)' },
          { value: 'fal-ai/bytedance/seedream/v4.5/edit', label: '🌟 Seedream 4.5 Edit (up to 10 refs, $0.08)' },
        ]},
        { key: 'referenceImageUrl', label: 'Reference Image URL', type: 'text', placeholder: 'Optional: URL of an existing reference image' },
      ];
    case 'photo_generator':
      return [
        { key: 'prompt', label: 'Photo Prompt', type: 'textarea', placeholder: 'Describe the shot photo...', required: true },
        { key: 'negativePrompt', label: 'Negative Prompt', type: 'textarea', placeholder: 'What to avoid...' },
        { key: 'model', label: 'Model', type: 'select', required: true, options: [
          { value: 'fal-ai/nano-banana-2', label: '⚡ Nano Banana 2 (default, $0.04)' },
          { value: 'fal-ai/nano-banana-2/edit', label: '🎨 Nano Banana 2 Edit (with refs, $0.04)' },
          { value: 'fal-ai/bytedance/seedream/v4.5/text-to-image', label: '✨ Seedream 4.5 (4K, $0.06)' },
          { value: 'fal-ai/bytedance/seedream/v4.5/edit', label: '🌟 Seedream 4.5 Edit (10 refs, $0.08)' },
        ]},
        { key: 'width', label: 'Width', type: 'number', placeholder: '1920' },
        { key: 'height', label: 'Height', type: 'number', placeholder: '1080' },
        { key: '_connectedElements', label: 'Connected Element References', type: 'readonly_connections', placeholder: 'Connect Element Reference nodes on the canvas → they will be used automatically at run time.' },
      ];
    case 'video_generator':
      return [
        { key: 'prompt', label: 'Video Prompt', type: 'textarea', placeholder: 'Describe the motion/action...', required: true },
        { key: 'negativePrompt', label: 'Negative Prompt', type: 'textarea', placeholder: 'What to avoid...' },
        { key: 'model', label: 'Model', type: 'select', required: true, options: [
          { value: 'fal-ai/kling-video/o3/pro/image-to-video', label: '🎬 Kling O3 Pro Image→Video (default, $0.95)' },
          { value: 'fal-ai/kling-video/o3/pro/text-to-video', label: '📝 Kling O3 Pro Text→Video ($0.95)' },
          { value: 'fal-ai/kling-video/o3/pro/reference-to-video', label: '🧬 Kling O3 Pro Reference→Video ($1.20)' },
        ]},
        { key: 'duration', label: 'Duration (seconds)', type: 'number', placeholder: '5' },
        { key: 'firstFrameUrl', label: 'First Frame Image URL', type: 'text', placeholder: 'Auto-filled from Photo Generator' },
      ];
    case 'voiceover_generator':
      return [
        { key: 'text', label: 'Voiceover Text', type: 'textarea', placeholder: 'The dialogue or narration text...', required: true },
        { key: 'voice', label: 'Voice', type: 'select', options: [
          { value: 'Rachel', label: 'Rachel (female)' }, { value: 'Adam', label: 'Adam (male)' },
          { value: 'Bella', label: 'Bella (female)' }, { value: 'Charlie', label: 'Charlie (male)' },
          { value: 'Diana', label: 'Diana (female)' },
        ]},
        { key: 'model', label: 'TTS Model', type: 'select', options: [
          { value: 'fal-ai/elevenlabs/tts/turbo-v2.5', label: '🗣️ ElevenLabs Turbo v2.5 ($0.03)' },
          { value: 'fal-ai/elevenlabs/text-to-dialogue/eleven-v3', label: '🎭 ElevenLabs v3 Dialogue ($0.05)' },
        ]},
      ];
    case 'music_generator':
      return [
        { key: 'prompt', label: 'Music Description', type: 'textarea', placeholder: 'Describe the mood, genre, tempo...', required: true },
        { key: 'durationMs', label: 'Duration (ms)', type: 'number', placeholder: '30000' },
        { key: 'model', label: 'Model', type: 'select', options: [
          { value: 'fal-ai/elevenlabs/music', label: '🎵 ElevenLabs Music ($0.10)' },
        ]},
      ];
    case 'project_orchestrator':
      return [
        { key: 'projectName', label: 'Project Name', type: 'text', placeholder: 'My Video Project', required: true },
        { key: 'photoModel', label: 'Default Photo Model', type: 'select', options: [
          { value: 'fal-ai/nano-banana-2', label: '⚡ Nano Banana 2 (fast)' },
          { value: 'fal-ai/bytedance/seedream/v4.5/text-to-image', label: '✨ Seedream 4.5 (4K)' },
        ]},
        { key: 'videoModel', label: 'Default Video Model', type: 'select', options: [
          { value: 'fal-ai/kling-video/o3/pro/image-to-video', label: '🎬 Kling O3 Pro' },
          { value: 'fal-ai/kling-video/o3/pro/text-to-video', label: '📝 Kling O3 Text' },
        ]},
        { key: 'voiceModel', label: 'Default Voice Model', type: 'select', options: [
          { value: 'fal-ai/elevenlabs/tts/turbo-v2.5', label: '🗣️ ElevenLabs Turbo v2.5' },
          { value: 'fal-ai/elevenlabs/text-to-dialogue/eleven-v3', label: '🎭 ElevenLabs v3 Dialogue' },
        ]},
        { key: 'cloudinaryFolder', label: 'Cloudinary Folder', type: 'text', placeholder: 'projects/{projectId}' },
      ];
    case 'final_video_compiler':
      return [
        { key: 'projectId', label: 'Project ID', type: 'text', placeholder: 'Auto-generated at runtime', required: false },
        { key: 'transition', label: 'Transition', type: 'select', options: [
          { value: 'cut', label: 'Cut (instant)' }, { value: 'fade', label: 'Fade' },
          { value: 'dissolve', label: 'Dissolve' }, { value: 'wipe', label: 'Wipe' },
        ]},
        { key: 'backgroundMusicUrl', label: 'Background Music URL', type: 'text', placeholder: 'https://... (optional)' },
        { key: 'addCaptions', label: 'Burn Captions', type: 'select', options: [
          { value: 'no', label: 'No captions' }, { value: 'yes', label: 'Yes — from voiceover text' },
        ]},
        { key: 'outputResolution', label: 'Output Resolution', type: 'select', options: [
          { value: '1920x1080', label: '1080p (1920×1080)' }, { value: '1280x720', label: '720p (1280×720)' },
          { value: '3840x2160', label: '4K (3840×2160)' }, { value: '1080x1920', label: 'Vertical 1080×1920' },
        ]},
        { key: 'outputFormat', label: 'Output Format', type: 'select', options: [
          { value: 'mp4', label: 'MP4 (H.264)' }, { value: 'webm', label: 'WebM (VP9)' },
          { value: 'mov', label: 'MOV (ProRes)' },
        ]},
        { key: 'mode', label: 'Compilation Mode', type: 'select', options: [
          { value: 'cloudinary', label: 'Cloudinary (fast, free)' }, { value: 'ffmpeg', label: 'FFmpeg (advanced)' },
        ]},
      ];
    default:
      return [
        { key: 'input', label: 'Input', type: 'textarea', placeholder: 'Configuration...' },
      ];
  }
}
