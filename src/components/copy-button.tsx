"use client";

import { useState } from "react";

type CopyButtonProps = {
  text: string;
  label?: string;
  className?: string;
};

export function CopyButton({ text, label = "COPY", className = "" }: CopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("error");
    } finally {
      window.setTimeout(() => setStatus("idle"), 1400);
    }
  }

  const display =
    status === "copied" ? "[ DONE ]" :
    status === "error"  ? "[ ERR! ]" :
    `[ ${label} ]`;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`flex-shrink-0 font-mono text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-lg border transition-all ${
        status === "copied"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          : status === "error"
          ? "border-red-500/40 bg-red-500/10 text-red-400"
          : "border-white/10 text-[#71717a] hover:border-violet-500/40 hover:text-violet-400 hover:bg-violet-500/10"
      } ${className}`}
    >
      {display}
    </button>
  );
}
