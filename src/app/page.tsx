"use client";

import { useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";

const TTL_OPTIONS = [
  { value: "600",    label: "10m" },
  { value: "3600",   label: "1h"  },
  { value: "86400",  label: "24h" },
  { value: "604800", label: "7d"  },
];

export default function Home() {
  const [content,      setContent]      = useState("");
  const [ttl,          setTtl]          = useState("86400");
  const [oneTime,      setOneTime]      = useState(false);
  const [secret,       setSecret]       = useState("");
  const [useShortCode, setUseShortCode] = useState(false);
  const [error,        setError]        = useState("");
  const [path,         setPath]         = useState<string | null>(null);
  const [locked,       setLocked]       = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);

  const url = useMemo(() => path ? `https://copyit.pipeops.app/${path}` : "", [path]);
  const cmd = useMemo(() => {
    if (!url) return "";
    return locked && secret ? `curl -fsSL "${url}?secret=${secret}"` : `curl -fsSL ${url}`;
  }, [url, locked, secret]);

  async function createLink() {
    if (!content.trim()) { setError("Content cannot be empty."); return; }
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          ttl_seconds: Number(ttl),
          one_time: oneTime,
          secret: secret || undefined,
          use_short_code: useShortCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create snippet");
      setPath(data.path);
      setLocked(data.locked ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07070b] text-[#e4e4e7] font-mono">

      {/* Ambient glow backdrop */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-violet-700/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-indigo-900/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-violet-500" style={{ boxShadow: "0 0 8px rgba(139,92,246,0.8)" }} />
          <span className="text-sm font-bold tracking-[0.2em] text-white">COPYIT</span>
        </div>
        <a href="#how" className="text-xs text-[#52525b] hover:text-violet-400 transition-colors tracking-widest">
          DOCS
        </a>
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-xl px-4 pt-16 pb-32">

        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-3">
            Share secrets,<br />not screenshots.
          </h1>
          <p className="text-sm text-[#71717a]">
            Paste once. Retrieve from anywhere with{" "}
            <code className="text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded">curl</code>.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d12] p-6 shadow-2xl shadow-black/60">

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Paste content — credentials, tokens, configs, env files..."
            spellCheck={false}
            className="w-full h-40 bg-transparent text-[#d4d4d8] placeholder-[#3f3f46] text-sm resize-none outline-none leading-relaxed"
          />

          <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-5">

            {/* TTL pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-[#52525b] tracking-widest mr-1">TTL</span>
              {TTL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTtl(opt.value)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    ttl === opt.value
                      ? "border-violet-500/60 bg-violet-500/15 text-violet-300"
                      : "border-white/[0.08] text-[#71717a] hover:border-white/20 hover:text-[#d4d4d8]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <Toggle label="One-time link" value={oneTime} onChange={setOneTime} />
              <Toggle label="Short code"    value={useShortCode} onChange={setUseShortCode} />
            </div>

            {/* Secret input */}
            <div>
              <label className="text-[10px] text-[#52525b] tracking-widest block mb-2">
                SECRET <span className="text-[#3f3f46]">— optional lock</span>
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/30 px-4 py-2.5 focus-within:border-violet-500/40 transition-colors">
                <LockIcon locked={!!secret} />
                <input
                  type="password"
                  value={secret}
                  onChange={e => setSecret(e.target.value)}
                  placeholder="leave blank for no lock"
                  autoComplete="off"
                  className="flex-1 bg-transparent text-sm text-[#e4e4e7] placeholder-[#3f3f46] outline-none"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-xs text-red-400 border border-red-500/20 bg-red-500/10 rounded-xl px-4 py-2.5">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={createLink}
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: isLoading
                  ? "rgba(139,92,246,0.3)"
                  : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                boxShadow: isLoading ? "none" : "0 0 24px rgba(109,40,217,0.35)",
              }}
            >
              {isLoading ? "Creating..." : path ? "Create New Link" : "Create Secure Link →"}
            </button>
          </div>
        </div>

        {/* Output card */}
        {path && (
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-[#0d0d12] p-6 shadow-2xl shadow-black/60">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[10px] tracking-widest text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-2.5 py-1">
                LIVE
              </span>
              {locked && (
                <span className="text-[10px] tracking-widest text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-full px-2.5 py-1">
                  LOCKED
                </span>
              )}
              {oneTime && (
                <span className="text-[10px] tracking-widest text-violet-400 border border-violet-500/30 bg-violet-500/10 rounded-full px-2.5 py-1">
                  ONE-TIME
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-[#52525b] tracking-widest mb-1.5">URL</div>
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/30 px-4 py-2.5">
                  <span className="flex-1 text-sm text-white break-all">{url}</span>
                  <CopyButton text={url} label="COPY" />
                </div>
              </div>

              <div>
                <div className="text-[10px] text-[#52525b] tracking-widest mb-1.5">CURL</div>
                <div className="flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-2.5">
                  <code className="flex-1 text-sm text-violet-300 break-all">{cmd}</code>
                  <CopyButton text={cmd} label="COPY" />
                </div>
              </div>

              {locked && (
                <p className="text-[11px] text-[#52525b] pt-1">
                  Share the URL and secret separately. Recipients on any machine just append{" "}
                  <code className="text-violet-400">?secret=…</code> to curl.
                </p>
              )}
            </div>
          </div>
        )}

        {/* How it works */}
        <div id="how" className="mt-24">
          <p className="text-[10px] tracking-widest text-[#52525b] text-center mb-8">HOW IT WORKS</p>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { n: "01", title: "Paste",    desc: "Drop anything. Set a secret and TTL." },
              { n: "02", title: "Share",    desc: "Send the URL or short 4-char code." },
              { n: "03", title: "Retrieve", desc: "curl it from Kali, Proxmox, or any shell." },
            ].map(s => (
              <div key={s.n} className="rounded-2xl border border-white/[0.05] bg-[#0d0d12] p-4 text-center">
                <div className="text-xs text-violet-500/40 font-bold mb-2">{s.n}</div>
                <div className="text-sm text-white font-bold mb-1">{s.title}</div>
                <div className="text-[11px] text-[#71717a] leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/[0.05] bg-black/40 p-5">
            <div className="text-[10px] text-[#52525b] tracking-widest mb-3">EXAMPLE — KALI / PROXMOX / SSH</div>
            <pre className="text-xs text-emerald-400 leading-relaxed overflow-x-auto">{`# Create link in browser → get code, e.g. WXN3

# Pull raw content on remote:
curl -fsSL "https://copyit.pipeops.app/WXN3?secret=hunter2"

# Pipe straight into a file:
curl -fsSL "https://copyit.pipeops.app/WXN3?secret=hunter2" > .env

# Kali one-liner with pbcopy:
curl -fsSL "https://copyit.pipeops.app/WXN3?secret=hunter2" | xclip -sel clip`}</pre>
          </div>
        </div>
      </main>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-2.5 text-xs transition-colors"
    >
      <div
        className="relative w-9 h-5 rounded-full border transition-all"
        style={{
          background: value ? "rgba(139,92,246,0.3)" : "transparent",
          borderColor: value ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.12)",
        }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
          style={{
            left: value ? "18px" : "2px",
            background: value ? "#a78bfa" : "#3f3f46",
            boxShadow: value ? "0 0 8px rgba(139,92,246,0.6)" : "none",
          }}
        />
      </div>
      <span style={{ color: value ? "#c4b5fd" : "#71717a" }}>{label}</span>
    </button>
  );
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={locked ? "#a78bfa" : "#3f3f46"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, transition: "stroke 0.2s" }}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d={locked ? "M7 11V7a5 5 0 0 1 10 0v4" : "M7 11V7a5 5 0 0 1 9.9-1"} />
    </svg>
  );
}
