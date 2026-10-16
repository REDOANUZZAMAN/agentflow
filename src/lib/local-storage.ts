/**
 * Local (VPS) media storage — replaces Cloudinary.
 *
 * Files live under MEDIA_DIR and are served by /api/files/[...path].
 * ffmpeg/ffprobe do the work Cloudinary transformations used to do:
 * reading duration/size, trimming audio, joining clips and muxing audio onto video.
 *
 * PUBLIC_BASE_URL must be reachable from the internet: fal.ai downloads our photos
 * as the source image for image-to-video.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const run = promisify(execFile);

export const MEDIA_DIR = process.env.MEDIA_DIR || '/var/lib/agentflow/media';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

export interface StoredFile {
  id: string;            // path relative to MEDIA_DIR — stored where cloudinaryId used to be
  url: string;           // public URL
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;     // seconds (audio / video)
  thumbnailUrl?: string; // videos only: <same name>.jpg
}

export type MediaKind = 'image' | 'video' | 'audio';

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a',
};
const DEFAULT_EXT: Record<MediaKind, string> = { image: 'png', video: 'mp4', audio: 'mp3' };

export function publicUrl(id: string): string {
  return `${PUBLIC_BASE_URL}/api/files/${id.split('/').map(encodeURIComponent).join('/')}`;
}

/** Absolute path for a stored id, refusing anything that escapes MEDIA_DIR. */
export function resolveMediaPath(id: string): string | null {
  const full = path.resolve(/*turbopackIgnore: true*/ MEDIA_DIR, id);
  return full.startsWith(path.resolve(/*turbopackIgnore: true*/ MEDIA_DIR) + path.sep) ? full : null;
}

function safeSegment(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'file';
}

// Unique relative id: <folder>/<name>_<timestamp>_<rand>.<ext>  (never overwrites)
function newId(folder: string, name: string, ext: string): string {
  const dir = folder.split('/').map(safeSegment).join('/');
  return `${dir}/${safeSegment(name)}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
}

async function probe(file: string): Promise<{ width?: number; height?: number; duration?: number }> {
  try {
    const { stdout } = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
    const info = JSON.parse(stdout);
    const v = (info.streams || []).find((s: any) => s.codec_type === 'video');
    const duration = parseFloat(info.format?.duration);
    return { width: v?.width, height: v?.height, duration: Number.isFinite(duration) ? duration : undefined };
  } catch {
    return {};
  }
}

async function ffmpeg(args: string[]) {
  try {
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { maxBuffer: 16 * 1024 * 1024 });
  } catch (err: any) {
    throw new Error(`ffmpeg failed: ${(err.stderr || err.message || '').toString().trim().slice(-400)}`);
  }
}

async function finish(id: string, kind: MediaKind): Promise<StoredFile> {
  const full = resolveMediaPath(id)!;
  const [{ size }, meta] = await Promise.all([stat(full), probe(full)]);
  const out: StoredFile = { id, url: publicUrl(id), bytes: size, ...meta };
  if (kind === 'image') delete out.duration;
  if (kind === 'video') {
    const thumbId = id.replace(/\.\w+$/, '.jpg');
    try {
      await ffmpeg(['-ss', '0', '-i', full, '-frames:v', '1', '-vf', 'scale=480:-2', resolveMediaPath(thumbId)!]);
      out.thumbnailUrl = publicUrl(thumbId);
    } catch { /* thumbnail is optional */ }
  }
  return out;
}

async function reserve(folder: string, name: string, ext: string): Promise<{ id: string; full: string }> {
  const id = newId(folder, name, ext);
  const full = resolveMediaPath(id);
  if (!full) throw new Error(`Invalid media path: ${id}`);
  await mkdir(path.dirname(full), { recursive: true });
  return { id, full };
}

/** Download a remote file (e.g. a fal.ai result) into storage. */
export async function saveFromUrl(url: string, folder: string, name: string, kind: MediaKind): Promise<StoredFile> {
  const res = await fetch(url, { signal: AbortSignal.timeout(5 * 60_000) });
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  const type = (res.headers.get('content-type') || '').split(';')[0].trim();
  const urlExt = new URL(url).pathname.match(/\.([a-z0-9]{2,4})$/i)?.[1]?.toLowerCase();
  const ext = EXT_BY_TYPE[type] || urlExt || DEFAULT_EXT[kind];
  const { id, full } = await reserve(folder, name, ext);
  await writeFile(full, Buffer.from(await res.arrayBuffer()));
  return finish(id, kind);
}

/** Cut audio to at most `maxSeconds` (replaces Cloudinary du_). */
export async function trimAudio(sourceId: string, maxSeconds: number, folder: string): Promise<StoredFile> {
  const { id, full } = await reserve(folder, 'voiceover_trimmed', 'mp3');
  await ffmpeg(['-i', resolveMediaPath(sourceId)!, '-t', maxSeconds.toFixed(2), '-c:a', 'libmp3lame', '-q:a', '2', full]);
  return finish(id, 'audio');
}

/** Join video clips in order into one silent mp4, normalised to the first clip's size (replaces fl_splice). */
export async function concatVideos(ids: string[], folder: string): Promise<StoredFile> {
  const inputs = ids.map(i => resolveMediaPath(i)!);
  const first = await probe(inputs[0]);
  const W = (first.width || 1280) & ~1, H = (first.height || 720) & ~1;
  const chains = inputs.map((_, i) =>
    `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v${i}]`);
  const filter = `${chains.join(';')};${inputs.map((_, i) => `[v${i}]`).join('')}concat=n=${inputs.length}:v=1:a=0[out]`;
  const { id, full } = await reserve(folder, 'spliced_video', 'mp4');
  await ffmpeg([...inputs.flatMap(f => ['-i', f]), '-filter_complex', filter, '-map', '[out]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-movflags', '+faststart', full]);
  return finish(id, 'video');
}

/**
 * Join voiceovers into one track. When `slotSeconds[i]` is given, each clip is padded with
 * silence (or cut) to exactly that length, so narration stays lined up with its shot.
 */
export async function concatAudio(ids: string[], folder: string, slotSeconds?: Array<number | undefined>): Promise<StoredFile> {
  const inputs = ids.map(i => resolveMediaPath(i)!);
  const chains = inputs.map((_, i) => {
    const slot = slotSeconds?.[i];
    const fit = slot && slot > 0 ? `,apad=whole_dur=${slot.toFixed(2)},atrim=0:${slot.toFixed(2)}` : '';
    return `[${i}:a]aresample=44100,aformat=channel_layouts=stereo${fit}[a${i}]`;
  });
  const filter = `${chains.join(';')};${inputs.map((_, i) => `[a${i}]`).join('')}concat=n=${inputs.length}:v=0:a=1[out]`;
  const { id, full } = await reserve(folder, 'spliced_audio', 'mp3');
  await ffmpeg([...inputs.flatMap(f => ['-i', f]), '-filter_complex', filter, '-map', '[out]', '-c:a', 'libmp3lame', '-q:a', '2', full]);
  return finish(id, 'audio');
}

/** Put an audio track onto a video; output keeps the video's length (replaces l_video + fl_layer_apply). */
export async function muxAudio(videoId: string, audioId: string, folder: string): Promise<StoredFile> {
  const { id, full } = await reserve(folder, 'final_with_audio', 'mp4');
  await ffmpeg(['-i', resolveMediaPath(videoId)!, '-i', resolveMediaPath(audioId)!, '-filter_complex', '[1:a]apad[a]',
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', full]);
  return finish(id, 'video');
}

/** Copy of a stored file under a new folder/name (used for the "final" asset of silent videos). */
export async function copyAs(sourceId: string, folder: string, name: string, kind: MediaKind): Promise<StoredFile> {
  const ext = sourceId.split('.').pop() || DEFAULT_EXT[kind];
  const { id, full } = await reserve(folder, name, ext);
  await ffmpeg(['-i', resolveMediaPath(sourceId)!, '-c', 'copy', '-movflags', '+faststart', full]);
  return finish(id, kind);
}
