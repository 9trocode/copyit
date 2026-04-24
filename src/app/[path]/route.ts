
import { query, verifySecret } from '@/lib/db';
import { redis } from '@/lib/redis';

async function isRateLimited(ip: string) {
  if (!redis) return false;
  const key = `rate-limit:get:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60);
  }
  return count > 120;
}

function unlockPageHtml(snippetPath: string, error?: string) {
  const errorBlock = error
    ? `<div style="color:#ff4444;border:1px solid #ff4444;padding:8px;margin-bottom:12px;font-size:12px;">${error}</div>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>COPYIT — UNLOCK /${snippetPath}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#000;color:#00ff00;font-family:'Courier New',monospace;font-size:14px;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
  .card{border:1px solid #00ff00;padding:32px;max-width:480px;width:100%}
  h1{font-size:18px;margin-bottom:4px;color:#00ff00}
  .sub{color:#666;font-size:12px;margin-bottom:24px}
  label{display:block;font-size:12px;color:#999;margin-bottom:6px;font-weight:bold}
  input[type=password]{width:100%;background:#000;border:1px solid #00ff00;color:#00ff00;padding:10px;font-family:inherit;font-size:14px;outline:none;margin-bottom:16px}
  input[type=password]:focus{border-color:#00ff88}
  button{background:transparent;border:2px solid #00ff00;color:#00ff00;padding:8px 20px;font-family:inherit;font-size:14px;font-weight:bold;cursor:pointer;transition:all .15s}
  button:hover{background:#00ff00;color:#000}
  .path{color:#666;font-size:11px;margin-top:20px;border-top:1px solid #222;padding-top:12px}
  .curl-hint{margin-top:16px;font-size:11px;color:#555}
  .curl-hint code{color:#888;background:#111;padding:4px 6px;display:block;margin-top:4px;word-break:break-all}
</style>
</head>
<body>
<div class="card">
  <h1>COPYIT — LOCKED</h1>
  <div class="sub">[ ENTER SECRET TO UNLOCK ]</div>
  ${errorBlock}
  <form method="GET" action="/${snippetPath}">
    <label for="secret">--secret</label>
    <input type="password" id="secret" name="secret" placeholder="enter secret key..." autofocus autocomplete="off">
    <button type="submit">[ UNLOCK ]</button>
  </form>
  <div class="path">PATH: /${snippetPath}</div>
  <div class="curl-hint">
    curl access:
    <code>curl -fsSL "https://copyit.pipeops.app/${snippetPath}?secret=YOUR_SECRET"</code>
  </div>
</div>
</body>
</html>`;
}

function contentPageHtml(snippetPath: string, content: string) {
  const escaped = content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>COPYIT — /${snippetPath}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#000;color:#00ff00;font-family:'Courier New',monospace;font-size:14px;min-height:100vh;padding:24px}
  header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;border-bottom:1px solid #222;padding-bottom:12px}
  h1{font-size:16px;color:#00ff00}
  .status{font-size:11px;color:#666}
  pre{background:#0a0a0a;border:1px solid #222;padding:20px;white-space:pre-wrap;word-break:break-all;color:#00ff00;font-size:13px;line-height:1.5;max-width:100%}
  button{background:transparent;border:1px solid #00ff00;color:#00ff00;padding:6px 14px;font-family:inherit;font-size:12px;cursor:pointer;margin-top:12px}
  button:hover{background:#00ff00;color:#000}
  button.done{border-color:#666;color:#666}
  .warn{font-size:11px;color:#555;margin-top:12px}
</style>
</head>
<body>
<header>
  <h1>COPYIT</h1>
  <span class="status">STATUS: DECRYPTED | PATH: /${snippetPath}</span>
</header>
<pre id="content">${escaped}</pre>
<button id="copy-btn" onclick="copyContent()">[ COPY TO CLIPBOARD ]</button>
<div class="warn">Content will not be shown again after navigating away.</div>
<script>
function copyContent(){
  const text=${JSON.stringify(content)};
  navigator.clipboard.writeText(text).then(()=>{
    const btn=document.getElementById('copy-btn');
    btn.textContent='[ COPIED ]';
    btn.classList.add('done');
  });
}
</script>
</body>
</html>`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string }> }
) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (await isRateLimited(ip)) {
    return new Response('Too many requests\n', { status: 429 });
  }

  const { path: snippetPath } = await params;

  if (!snippetPath || snippetPath.length < 4) {
    return new Response('Invalid path\n', { status: 400 });
  }

  try {
    const result = await query(
      `SELECT id, content, is_one_time, is_consumed, expires_at, secret_hash
       FROM snippets
       WHERE path = ?`,
      [snippetPath]
    ) as { rows: Record<string, unknown>[] };

    if (result.rows.length === 0) {
      return new Response('Snippet not found or expired.\n', { status: 404 });
    }

    const snippet = result.rows[0];

    if (new Date(snippet.expires_at as string) < new Date()) {
      return new Response('Snippet expired.\n', { status: 404 });
    }

    if (snippet.is_one_time && snippet.is_consumed) {
      return new Response('This one-time snippet has already been consumed.\n', { status: 410 });
    }

    const userAgent = request.headers.get('user-agent') || '';
    const isCurl = userAgent.toLowerCase().includes('curl') || userAgent.toLowerCase().includes('wget');
    const url = new URL(request.url);
    const isRaw = url.searchParams.get('raw') === '1';
    const providedSecret = url.searchParams.get('secret') || '';

    // Handle secret verification
    if (snippet.secret_hash) {
      if (!providedSecret) {
        if (isCurl) {
          return new Response(
            `Locked snippet. Provide secret:\ncurl -fsSL "${url.origin}/${snippetPath}?secret=YOUR_SECRET"\n`,
            { status: 401, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Locked': 'true' } }
          );
        }
        // Browser: serve unlock form
        return new Response(unlockPageHtml(snippetPath), {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      }

      const valid = verifySecret(providedSecret, snippet.secret_hash as string);
      if (!valid) {
        if (isCurl || isRaw) {
          return new Response('Invalid secret.\n', { status: 403 });
        }
        return new Response(unlockPageHtml(snippetPath, 'ERR: Invalid secret. Try again.'), {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      }
    }

    if (snippet.is_one_time && !snippet.is_consumed) {
      await query(`UPDATE snippets SET is_consumed = 1 WHERE id = ?`, [snippet.id]);
    }

    const content = snippet.content as string;

    if (isCurl || isRaw) {
      return new Response(content, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    // Browser: serve content page
    return new Response(contentPageHtml(snippetPath, content), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    });

  } catch (error) {
    console.error('Error retrieving snippet:', error);
    return new Response('Internal Server Error\n', { status: 500 });
  }
}
