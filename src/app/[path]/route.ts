
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

const BASE_STYLES = `
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#07070b;color:#e4e4e7;font-family:'JetBrains Mono','Fira Code','Cascadia Code','Consolas','Menlo',monospace;font-size:14px;min-height:100vh}
    .glow{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0}
    .glow-1{position:absolute;top:-100px;left:50%;transform:translateX(-50%);width:600px;height:400px;background:rgba(109,40,217,0.1);filter:blur(120px);border-radius:50%}
    .glow-2{position:absolute;bottom:0;right:0;width:350px;height:280px;background:rgba(67,56,202,0.08);filter:blur(100px);border-radius:50%}
    header{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.05)}
    .logo{display:flex;align-items:center;gap:8px}
    .dot{width:8px;height:8px;border-radius:50%;background:#8b5cf6;box-shadow:0 0 8px rgba(139,92,246,0.8)}
    .logo-text{font-size:13px;font-weight:700;letter-spacing:0.2em;color:#fff}
    a{text-decoration:none;color:#52525b;font-size:11px;letter-spacing:0.15em;transition:color .15s}
    a:hover{color:#a78bfa}
    main{position:relative;z-index:1;max-width:520px;margin:0 auto;padding:56px 16px 80px}
    .card{background:#0d0d12;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:28px;box-shadow:0 24px 48px rgba(0,0,0,0.5)}
    .badge{display:inline-flex;align-items:center;font-size:10px;font-weight:700;letter-spacing:0.15em;border-radius:999px;padding:4px 10px;margin-bottom:20px}
    .badge-locked{background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);color:#fbbf24}
    .badge-live{background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);color:#34d399}
    .badge-error{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#f87171}
    h1{font-size:22px;font-weight:700;color:#fff;margin-bottom:6px}
    .subtitle{font-size:12px;color:#71717a;margin-bottom:24px}
    label{display:block;font-size:10px;letter-spacing:0.15em;color:#52525b;margin-bottom:8px}
    .input-wrap{display:flex;align-items:center;gap:10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:10px 14px;margin-bottom:16px;transition:border-color .15s}
    .input-wrap:focus-within{border-color:rgba(139,92,246,0.4)}
    .lock-icon{color:#3f3f46;flex-shrink:0;transition:color .2s}
    .input-wrap:focus-within .lock-icon{color:#a78bfa}
    input[type=password]{flex:1;background:transparent;border:none;outline:none;color:#e4e4e7;font-family:inherit;font-size:14px}
    input[type=password]::placeholder{color:#3f3f46}
    .btn{width:100%;padding:12px;border-radius:12px;border:none;font-family:inherit;font-size:13px;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#7c3aed,#6d28d9);box-shadow:0 0 24px rgba(109,40,217,0.35);transition:opacity .15s}
    .btn:hover{opacity:0.9}
    .error-block{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#f87171}
    .hint{margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);font-size:11px;color:#3f3f46}
    .hint code{display:block;margin-top:6px;color:#71717a;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:8px 12px;word-break:break-all}
    pre{background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;white-space:pre-wrap;word-break:break-all;color:#d4d4d8;font-size:13px;line-height:1.7;max-width:100%}
    .copy-btn{display:inline-flex;align-items:center;margin-top:14px;background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#71717a;font-family:inherit;font-size:10px;font-weight:700;letter-spacing:0.15em;padding:6px 14px;cursor:pointer;transition:all .15s}
    .copy-btn:hover{border-color:rgba(139,92,246,0.4);color:#a78bfa;background:rgba(139,92,246,0.08)}
    .copy-btn.done{border-color:rgba(16,185,129,0.3);color:#34d399;background:rgba(16,185,129,0.08)}
    .warn{margin-top:12px;font-size:11px;color:#3f3f46}
    .path-pill{margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.05);font-size:11px;color:#52525b}
  </style>`;

function unlockPageHtml(snippetPath: string, error?: string) {
  const errorBlock = error
    ? `<div class="error-block">${error}</div>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Copyit — Unlock /${snippetPath}</title>
${BASE_STYLES}
</head>
<body>
<div class="glow"><div class="glow-1"></div><div class="glow-2"></div></div>
<header>
  <div class="logo"><div class="dot"></div><span class="logo-text">COPYIT</span></div>
  <a href="/">Home</a>
</header>
<main>
  <div class="card">
    <div class="badge badge-locked">LOCKED</div>
    <h1>Enter secret to unlock</h1>
    <p class="subtitle">This snippet is protected. Provide the secret to reveal its contents.</p>
    ${errorBlock}
    <form method="GET" action="/${snippetPath}">
      <label for="secret">SECRET</label>
      <div class="input-wrap">
        <svg class="lock-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <input type="password" id="secret" name="secret" placeholder="enter secret key…" autofocus autocomplete="off">
      </div>
      <button class="btn" type="submit">Unlock →</button>
    </form>
    <div class="hint">
      curl access:
      <code>curl -fsSL "https://copyit.pipeops.app/${snippetPath}?secret=YOUR_SECRET"</code>
    </div>
  </div>
</main>
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
<title>Copyit — /${snippetPath}</title>
${BASE_STYLES}
</head>
<body>
<div class="glow"><div class="glow-1"></div><div class="glow-2"></div></div>
<header>
  <div class="logo"><div class="dot"></div><span class="logo-text">COPYIT</span></div>
  <a href="/">New snippet</a>
</header>
<main>
  <div class="card">
    <div class="badge badge-live">LIVE</div>
    <h1>Snippet ready</h1>
    <p class="subtitle">/${snippetPath}</p>
    <pre id="content">${escaped}</pre>
    <button class="copy-btn" id="copy-btn" onclick="copyContent()">COPY TO CLIPBOARD</button>
    <p class="warn">Navigate away and the content won't be re-shown.</p>
  </div>
</main>
<script>
function copyContent(){
  navigator.clipboard.writeText(${JSON.stringify(content)}).then(()=>{
    const b=document.getElementById('copy-btn');
    b.textContent='COPIED';
    b.classList.add('done');
    setTimeout(()=>{b.textContent='COPY TO CLIPBOARD';b.classList.remove('done')},2000);
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
