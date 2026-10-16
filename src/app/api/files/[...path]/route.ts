import { NextRequest } from 'next/server';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { resolveMediaPath } from '@/lib/local-storage';

// Public on purpose: <img>/<video> tags and fal.ai (image-to-video source) fetch these.
// Names are per-run and randomised, so they are not guessable.

const TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const full = resolveMediaPath(path.map(decodeURIComponent).join('/'));
  if (!full) return new Response('Not found', { status: 404 });

  let size: number;
  try {
    const st = await stat(full);
    if (!st.isFile()) throw new Error('not a file');
    size = st.size;
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const ext = full.split('.').pop()?.toLowerCase() || '';
  const headers: Record<string, string> = {
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
  };

  // Range requests let browsers seek inside videos
  const range = req.headers.get('range')?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    const start = range[1] ? parseInt(range[1], 10) : Math.max(size - parseInt(range[2] || '0', 10), 0);
    const end = range[1] && range[2] ? Math.min(parseInt(range[2], 10), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    const body = Readable.toWeb(createReadStream(full, { start, end })) as ReadableStream;
    return new Response(body, {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
    });
  }

  const body = Readable.toWeb(createReadStream(full)) as ReadableStream;
  return new Response(body, { headers: { ...headers, 'Content-Length': String(size) } });
}
