#!/usr/bin/env node
// Dump plain-text frames (no ANSI) for embedding in the README.
// Output: stdout, multiple frames separated by FF FRAME N FF blocks.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { W, H, createWorld, advanceFrame } = await import(join(__dirname, '..', 'src', 'scene.mjs'));

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(99);
const world = createWorld();
const phaseRef = { phase: 0 };

const requested = [3, 8, 13, 18];
const out = [];
for (let tick = 0; tick <= 20; tick++) {
  const grid = advanceFrame(world, rng, tick, phaseRef);
  if (requested.includes(tick)) {
    let frame = '';
    for (let r = 0; r < H; r++) {
      let line = '';
      for (let c = 0; c < W; c++) line += grid[r][c].ch;
      frame += line.replace(/\s+$/, '') + '\n';
    }
    out.push({ tick, frame });
  }
}

for (const { tick, frame } of out) {
  console.log(`### FRAME tick=${tick}`);
  console.log(frame.trimEnd());
  console.log('');
}
