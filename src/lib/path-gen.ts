import crypto from 'crypto';

// Excludes 0/O/1/I to avoid ambiguity when reading/typing codes
const SHORT_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateShortCode(): string {
  const bytes = crypto.randomBytes(4);
  return Array.from(bytes).map(b => SHORT_CODE_CHARS[b % SHORT_CODE_CHARS.length]).join('');
}

export const words = [
  "solar", "maple", "drift", "echo", "cinder", "meadow", "frost", "ember",
  "atlas", "harbor", "lumen", "vantage", "quartz", "summit", "anchor", "delta",
  "prairie", "beacon", "cobalt", "ridge", "forest", "signal", "vector", "relay",
  "orbit", "emberglow", "nova", "zenith", "vertex", "alpine", "blaze", "crest",
  "dune", "forge", "glide", "helix", "ion", "jade", "krypton", "logic",
  "matrix", "nexus", "omega", "pulse", "qubit", "rune", "shard", "tracer",
  "umbra", "void", "warp", "xenon", "yield", "zero", "aero", "breeze",
  "cloud", "dash", "edge", "flare", "grid", "halo", "iris", "jump",
  "kite", "link", "mesh", "node", "optic", "path", "quant", "ray",
  "spark", "tide", "unit", "vault", "wave", "axis", "bytes", "core"
];

export function generatePath(wordCount = 4): string {
  const source = [...new Set(words)]; // Ensure uniqueness
  // Fisher-Yates shuffle
  for (let i = source.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [source[i], source[j]] = [source[j], source[i]];
  }

  return source.slice(0, wordCount).join("-");
}
