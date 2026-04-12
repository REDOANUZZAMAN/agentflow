import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  const checks: Record<string, { status: string; detail?: string }> = {};

  // Check Claude API
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey || apiKey.length < 10) {
      checks.claude = { status: 'skipped', detail: 'No API key set — using demo mode' };
    } else {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Say "ok" in one word' }],
      });
      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      checks.claude = { status: 'ok', detail: `API working! Model: claude-sonnet-4-6, Response: "${text.trim()}"` };
    }
  } catch (err: any) {
    const errMsg = err.message || String(err);
    if (errMsg.includes('401') || errMsg.includes('authentication')) {
      checks.claude = { status: 'error', detail: 'Invalid API key (401 Unauthorized)' };
    } else if (errMsg.includes('403') || errMsg.includes('forbidden')) {
      checks.claude = { status: 'error', detail: 'API key forbidden (403). Key may be disabled, expired, or lack permissions.' };
    } else if (errMsg.includes('429')) {
      checks.claude = { status: 'warning', detail: 'Rate limited (429). Key works but hit rate limit.' };
    } else {
      checks.claude = { status: 'error', detail: errMsg };
    }
  }

  // Check OpenRouter API
  try {
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!orKey || orKey.length < 10) {
      checks.openrouter = { status: 'skipped', detail: 'No API key set' };
    } else {
      const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${orKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'AgentFlow',
        },
        body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Say "ok" in one word' }],
        }),
      });
      if (orResponse.ok) {
        const orData = await orResponse.json();
        const orText = orData.choices?.[0]?.message?.content || '';
        checks.openrouter = { status: 'ok', detail: `API working! Model: claude-sonnet-4 via OpenRouter, Response: "${orText.trim()}"` };
      } else {
        const errText = await orResponse.text();
        checks.openrouter = { status: 'error', detail: `OpenRouter ${orResponse.status}: ${errText.slice(0, 200)}` };
      }
    }
  } catch (err: any) {
    checks.openrouter = { status: 'error', detail: err.message };
  }

  // Check Supabase connection
  try {
    const { data, error } = await supabase.from('workflows').select('id').limit(1);
    if (error) {
      // Table might not exist yet - that's OK, connection still works
      if (error.code === '42P01') {
        checks.supabase = { status: 'connected', detail: 'Tables not created yet. Run supabase-schema.sql in your SQL Editor.' };
      } else {
        checks.supabase = { status: 'error', detail: error.message };
      }
    } else {
      checks.supabase = { status: 'ok', detail: `Connected. ${data?.length ?? 0} workflow(s) found.` };
    }
  } catch (err: any) {
    checks.supabase = { status: 'error', detail: err.message };
  }

  // Check env vars
  checks.env = {
    status: 'ok',
    detail: JSON.stringify({
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '[ok] set' : '[x] missing',
      SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '[ok] set' : '[x] missing',
      ANTHROPIC_KEY: process.env.ANTHROPIC_API_KEY ? '[ok] set' : '[warn] optional',
      OPENROUTER_KEY: process.env.OPENROUTER_API_KEY ? '[ok] set' : '[warn] optional',
      FAL_KEY: process.env.FAL_API_KEY && process.env.FAL_API_KEY !== 'your_fal_api_key_here' ? '[ok] set' : '[warn] optional',
      CLOUDINARY: process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' ? '[ok] set' : '[warn] optional',
    }),
  };

  const allOk = Object.values(checks).every((c) => c.status === 'ok' || c.status === 'connected');

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
}
