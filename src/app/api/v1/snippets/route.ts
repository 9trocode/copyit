import { NextResponse } from 'next/server';
import { query, hashSecret } from '@/lib/db';
import { generatePath, generateShortCode } from '@/lib/path-gen';
import { v4 as uuidv4 } from 'uuid';
import { redis } from '@/lib/redis';

// Rudimentary Rate Limiter since PRD requested one
async function isRateLimited(ip: string) {
  if (!redis) return false;
  const key = `rate-limit:create:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60); // 1 minute window
  }
  return count > 30; // Max 30 creates per minute per IP
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (await isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { content, ttl_seconds, one_time, secret, use_short_code } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid content' }, { status: 400 });
    }

    if (Buffer.byteLength(content, 'utf8') > 1024 * 1024) {
      return NextResponse.json({ error: 'Content size exceeds 1MB limit' }, { status: 413 });
    }

    const ttlSeconds = Math.max(60, Math.min(parseInt(ttl_seconds) || 86400, 604800));
    const isOneTime = Boolean(one_time);
    const secretHash = secret && typeof secret === 'string' && secret.length > 0
      ? hashSecret(secret)
      : null;

    let snippetPath = '';
    let inserted = false;
    let attempts = 0;
    let expiresAtIso = '';

    while (!inserted && attempts < 5) {
      snippetPath = use_short_code ? generateShortCode() : generatePath();
      const id = uuidv4();
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      expiresAtIso = expiresAt.toISOString();

      try {
        const existing = await query(`SELECT id FROM snippets WHERE path = ?`, [snippetPath]) as { rows?: unknown[] };
        if (existing.rows && existing.rows.length > 0) {
          attempts++;
          continue;
        }

        await query(
          `INSERT INTO snippets (id, path, content, ttl_seconds, is_one_time, secret_hash, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, snippetPath, content, ttlSeconds, isOneTime ? 1 : 0, secretHash, expiresAtIso]
        );
        inserted = true;
      } catch (err: unknown) {
        throw err;
      }
    }

    if (!inserted) {
      throw new Error('Failed to generate unique path after 5 attempts');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://copyit.pipeops.app';
    const locked = Boolean(secretHash);

    return NextResponse.json({
      path: snippetPath,
      url: `${baseUrl}/${snippetPath}`,
      locked,
      expires_at: expiresAtIso,
      created_at: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating snippet:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
