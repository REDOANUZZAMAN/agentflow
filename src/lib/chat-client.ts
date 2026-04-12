/**
 * Chat Client — connects to Railway backend (Claude API proxy)
 * 
 * Flow: initChat() → get jobId → streamChat(jobId) → SSE events
 * The Railway backend runs outside China so it can access Claude directly.
 */

import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_CHAT_API_URL || 'https://revvenbackendserver-production.up.railway.app';

async function getAuthHeader(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return `Bearer ${session.access_token}`;
    }
  } catch {
    // No auth available
  }
  return null;
}

export interface InitChatParams {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  conversationId?: string;
  isFirstMessage?: boolean;
  memories?: any[];
  userMessageContent?: string;
  userMessageImages?: any[];
  userMessageAttachments?: any[];
}

export interface InitChatResponse {
  jobId: string;
  userMessageId?: string;
  status: string;
}

export interface StreamCallbacks {
  onChunk?: (text: string) => void;
  onThinking?: (text: string) => void;
  onSearch?: (text: string) => void;
  onStatus?: (data: any) => void;
  onToolCall?: (data: any) => void;
  onDone?: (data: any) => void;
  onError?: (err: any) => void;
}

/**
 * Initialize a chat job on the Railway backend
 */
export async function initChat(params: InitChatParams): Promise<InitChatResponse> {
  const auth = await getAuthHeader();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth) {
    headers['Authorization'] = auth;
  }

  const res = await fetch(`${API_URL}/api/chat/init`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages: params.messages,
      model: params.model || 'claude-sonnet-4-6',
      conversationId: params.conversationId || crypto.randomUUID(),
      isFirstMessage: params.isFirstMessage ?? params.messages.length <= 1,
      userMessageContent: params.userMessageContent || params.messages[params.messages.length - 1]?.content,
      ...params.memories && { memories: params.memories },
      ...params.userMessageImages && { userMessageImages: params.userMessageImages },
      ...params.userMessageAttachments && { userMessageAttachments: params.userMessageAttachments },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Railway init failed (${res.status}): ${errText}`);
  }

  return res.json();
}

/**
 * Stream chat response via Server-Sent Events
 */
export function streamChat(jobId: string, callbacks: StreamCallbacks): Promise<void> {
  return new Promise<void>(async (resolve, reject) => {
    let token = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || '';
    } catch {
      // No auth
    }

    const url = token
      ? `${API_URL}/api/chat/stream/${jobId}?token=${token}`
      : `${API_URL}/api/chat/stream/${jobId}`;

    const es = new EventSource(url);

    es.addEventListener('chunk', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        callbacks.onChunk?.(data.text);
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener('thinking', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        callbacks.onThinking?.(data.text);
      } catch { /* ignore */ }
    });

    es.addEventListener('search', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        callbacks.onSearch?.(data.text);
      } catch { /* ignore */ }
    });

    es.addEventListener('status', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        callbacks.onStatus?.(data);
      } catch { /* ignore */ }
    });

    es.addEventListener('tool_call', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        callbacks.onToolCall?.(data);
      } catch { /* ignore */ }
    });

    es.addEventListener('done', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        callbacks.onDone?.(data);
      } catch { /* ignore */ }
      es.close();
      resolve();
    });

    // IMPORTANT: 'error_event', not 'error' (browser EventSource conflict)
    es.addEventListener('error_event', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        callbacks.onError?.(data);
      } catch { /* ignore */ }
      es.close();
      reject(new Error('Stream error'));
    });

    es.onerror = () => {
      es.close();
      reject(new Error('Connection lost to Railway backend'));
    };
  });
}

/**
 * Poll chat job status (fallback if SSE fails)
 */
export async function pollChatStatus(jobId: string): Promise<any> {
  const auth = await getAuthHeader();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth) headers['Authorization'] = auth;

  const res = await fetch(`${API_URL}/api/chat/status`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jobId }),
  });
  return res.json();
}

/**
 * Check Railway backend health
 */
export async function checkRailwayHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      return data.status === 'ok';
    }
  } catch {
    // Backend unreachable
  }
  return false;
}
