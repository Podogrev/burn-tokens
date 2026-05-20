#!/usr/bin/env node
// Token Furnace — ANSI renderer.
// In a real TTY the script plays a live animation.
// In a captured (non-TTY) context like Claude Code's Bash tool it prints ONE
// colored static frame plus a meme receipt line, then writes the payload. No
// cursor tricks, no external windows — the chat sees a single nice still.
//
// --finish mode is invoked AFTER the Read step. It deletes the payload and
// prints the final receipt with elapsed time and burned token count, which
// is the only user-visible line of the whole skill.

import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const META_PATH = platform() === 'win32'
  ? join(tmpdir(), 'burn-tokens-meta.json')
  : '/tmp/burn-tokens-meta.json';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { W, H, PALETTE_HEX, baseCls, createWorld, advanceFrame, tempForTick } = await import(
  join(__dirname, 'src', 'scene.mjs')
);
const { writePayload, PAYLOAD_PATH } = await import(join(__dirname, 'src', 'payload.mjs'));

const FPS_MS = 90;

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const has = (n) => args.includes(n);
const getArg = (n, fb) => {
  const i = args.indexOf(n);
  return i < 0 ? fb : (args[i + 1] ?? fb);
};

if (has('--help') || has('-h')) {
  process.stdout.write(
`burn-tokens — Token Furnace

Usage:
  furnace.mjs [options]
  furnace.mjs --finish

Options:
  --target N        approximate tokens to write to the payload (default 100000)
  --duration SECS   animation duration (default 6, only used in TTY mode)
  --inline          force live animation even when stdout is not a TTY
  --no-payload      skip the payload file
  --forever         loop animation until Ctrl-C
  --finish          cleanup mode: delete payload + print elapsed-time receipt
  -h, --help        this help

Behavior:
  - In a real terminal: live animation, ~6s, then payload written.
  - In a captured stdout (e.g. Claude Code Bash tool): one static colored frame
    is printed and the payload is written. No animation, no extra noise.
  - --finish is called after the Read step to delete the payload and print the
    final receipt line: "🔥 100,000 tokens · 2.4s".
`);
  process.exit(0);
}

// ── --finish: cleanup + receipt ────────────────────────────────────────────
if (has('--finish')) {
  let meta = { startMs: Date.now(), target: 100000 };
  if (existsSync(META_PATH)) {
    try { meta = { ...meta, ...JSON.parse(readFileSync(META_PATH, 'utf8')) }; } catch {}
  }
  const elapsed = (Date.now() - meta.startMs) / 1000;
  const { PAYLOAD_PATH } = await import(join(__dirname, 'src', 'payload.mjs'));
  for (const p of [PAYLOAD_PATH, META_PATH]) {
    try { if (existsSync(p)) unlinkSync(p); } catch {}
  }
  const fmtElapsed = elapsed < 10 ? `${elapsed.toFixed(2)}s` : `${elapsed.toFixed(1)}s`;
  process.stdout.write(`🔥 ${meta.target.toLocaleString('en-US')} tokens · ${fmtElapsed}\n`);
  process.exit(0);
}

const TARGET = parseInt(getArg('--target', '100000'), 10);
const FOREVER = has('--forever');
const NO_PAYLOAD = has('--no-payload');
const FORCE_INLINE = has('--inline');
const DURATION_MS = (parseFloat(getArg('--duration', '6')) || 6) * 1000;

const isTTY = !!process.stdout.isTTY;
const interactive = isTTY || FORCE_INLINE;

// ── ANSI ────────────────────────────────────────────────────────────────────
const hexToRgb = (hex) => {
  const m = hex.replace('#', '');
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
};
const ansi = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return `\x1b[38;2;${r};${g};${b}m`;
};
const ANSI_BG = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return `\x1b[48;2;${r};${g};${b}m`;
};
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const HIDE = '\x1b[?25l';
const SHOW = '\x1b[?25h';
const HOME = '\x1b[H';
const CLEAR = '\x1b[2J';

const ANSI_PALETTE = Object.fromEntries(Object.entries(PALETTE_HEX).map(([k, v]) => [k, ansi(v)]));

function gridToANSI(g) {
  let out = '';
  for (let r = 0; r < H; r++) {
    let cur = null;
    let line = '';
    for (let c = 0; c < W; c++) {
      const { ch, cls } = g[r][c];
      const b = baseCls(cls);
      if (b !== cur) {
        line += b === null ? RESET : ANSI_PALETTE[b] || '';
        cur = b;
      }
      line += ch;
    }
    out += line + RESET + '\n';
  }
  return out;
}

function centerInside(s, width) {
  if (s.length >= width) return s.slice(0, width);
  const pad = width - s.length;
  const left = Math.floor(pad / 2);
  return ' '.repeat(left) + s + ' '.repeat(pad - left);
}

function header() {
  return (
    ANSI_PALETTE.frameC + '┌' + '─'.repeat(W - 2) + '┐\n' +
    '│' + ANSI_PALETTE.title + centerInside('claude-code ─ skill: burn-tokens ─ /dev/furnace', W - 2) + ANSI_PALETTE.frameC + '│\n' +
    '└' + '─'.repeat(W - 2) + '┘' + RESET + '\n'
  );
}

function footer(displayCounter, tick, blink) {
  const tempK = tempForTick(tick);
  const burnedStr = String(displayCounter).padStart(6, '0');
  const cursor = blink ? '▌' : ' ';
  const left = `▮ furnace temp: ${tempK}° K`;
  const right = `tokens burned: ${burnedStr}${cursor}`;
  const gap = Math.max(2, W - left.length - right.length);
  return ANSI_PALETTE.footer + left + ' '.repeat(gap) + right + RESET + '\n';
}

// ── one-shot still frame for non-TTY (Claude Code chat) ─────────────────────
function stillFrame(target, tick) {
  const world = createWorld();
  const phaseRef = { phase: 0 };
  // Warm up so flame and particles look populated.
  let grid;
  for (let t = 0; t <= tick; t++) grid = advanceFrame(world, Math.random, t, phaseRef);
  // Pin counter to the target so the meme reads cleanly in the still.
  const counter = target;
  const receipt =
    ANSI_PALETTE.ember + BOLD +
    `✦ ${counter.toLocaleString('en-US')} tokens shoveled into the furnace` +
    RESET;
  return header() + gridToANSI(grid) + footer(counter, tick, true) + '\n' + receipt + '\n';
}

if (!interactive) {
  // One static frame goes straight to chat. No cursor tricks, no animation.
  process.stdout.write(stillFrame(TARGET, 16));
  if (!NO_PAYLOAD) {
    try { writePayload(TARGET); } catch (e) {
      process.stderr.write(`burn-tokens: payload write failed: ${e.message}\n`);
    }
    // Stash start time + target for the --finish call to compute elapsed.
    try {
      writeFileSync(META_PATH, JSON.stringify({ startMs: Date.now(), target: TARGET }));
    } catch {}
  }
  process.exit(0);
}

// ── animation loop (TTY) ────────────────────────────────────────────────────
const world = createWorld();
const phaseRef = { phase: 0 };
let tick = 0;
const startedAt = Date.now();

const cleanupOnce = (() => {
  let done = false;
  return (code = 0) => {
    if (done) return;
    done = true;
    process.stdout.write(SHOW + RESET + '\n');
    if (!NO_PAYLOAD) {
      try { writePayload(TARGET); } catch { /* ignore */ }
    }
    process.exit(code);
  };
})();

process.on('SIGINT', () => cleanupOnce(130));
process.on('SIGTERM', () => cleanupOnce(143));

process.stdout.write(HIDE + CLEAR + HOME);

function loop() {
  const grid = advanceFrame(world, Math.random, tick, phaseRef);
  const blink = Math.floor(tick / 5) % 2 === 0;

  const elapsed = Date.now() - startedAt;
  const progress = Math.min(1, elapsed / DURATION_MS);
  const displayCounter = NO_PAYLOAD ? world.burned : Math.round(progress * TARGET);

  process.stdout.write(HOME);
  process.stdout.write(header() + gridToANSI(grid) + footer(displayCounter, tick, blink));

  tick++;

  if (FOREVER) return;
  if (elapsed >= DURATION_MS) cleanupOnce(0);
}

loop();
const iv = setInterval(loop, FPS_MS);
process.stdout.on('error', () => { clearInterval(iv); cleanupOnce(0); });

void PAYLOAD_PATH;
void ANSI_BG;
