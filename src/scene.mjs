// Pure scene module — shared by furnace.mjs (ANSI runner) and tools/render-svg.mjs (SVG generator).
// No I/O, no globals beyond the particle arrays each consumer creates via createWorld().

export const W = 64;
export const H = 22;

export const DOOR = { r0: 10, r1: 12, c0: 28, c1: 34 };

export const PALETTE_HEX = {
  bg:       '#100c08',
  frameC:   '#6b513c',
  body:     '#efe1c4',
  coal:     '#8a7868',
  coalHi:   '#c4b39e',
  label:    '#c9b89a',
  token:    '#7fd4ff',
  ember:    '#ff7a18',
  flame:    '#ffb347',
  spark:    '#ffe066',
  smoke:    '#7d6b5a',
  bricks:   '#4a382a',
  dim:      '#7a6650',
  prompt:   '#ff7a18',
  title:    '#9c8b73',
  footer:   '#7c6a52',
};

export function baseCls(cls) { return cls ? cls.split(' ')[0] : null; }

export function makeGrid() {
  const g = new Array(H);
  for (let r = 0; r < H; r++) {
    g[r] = new Array(W);
    for (let c = 0; c < W; c++) g[r][c] = { ch: ' ', cls: null };
  }
  return g;
}

export function put(g, r, c, ch, cls) {
  if (r < 0 || r >= H || c < 0 || c >= W) return;
  g[r][c] = { ch, cls };
}

export function stamp(g, r, c, block, cls) {
  const lines = block.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch !== ' ') put(g, r + i, c + j, ch, cls);
    }
  }
}

export function compose(layers) {
  const g = makeGrid();
  for (const L of layers) {
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const cell = L[r][c];
        if (cell.ch !== ' ') g[r][c] = cell;
      }
    }
  }
  return g;
}

// ── stokers ─────────────────────────────────────────────────────────────────
const stokerL_up = [
  '             ',
  '  \\____      ',
  '       \\ O   ',
  '        /|   ',
  '        / \\  ',
].join('\n');
const stokerL_down = [
  '             ',
  '             ',
  '   O_________',
  '  /|         ',
  '  / \\        ',
].join('\n');
const stokerR_up = [
  '             ',
  '      ____/  ',
  '   O /       ',
  '   |\\        ',
  '   / \\       ',
].join('\n');
const stokerR_down = [
  '             ',
  '             ',
  '_________O   ',
  '         |\\  ',
  '        / \\  ',
].join('\n');

const coalBase = [
  '  &&%  ',
  ' &%@%& ',
  '&%@@%&%',
  '%@@%@@&',
].join('\n');
const coalHi = [
  '  ·    ',
  ' *   · ',
  '·   *  ',
  '   ·   ',
].join('\n');

export function buildBG(phase) {
  const g = makeGrid();
  stamp(g, 4, 30, ' __ \n|  |\n|__|', 'frameC');

  put(g, 7, 19, '┌', 'frameC');
  for (let c = 20; c <= 43; c++) put(g, 7, c, '─', 'frameC');
  put(g, 7, 44, '┐', 'frameC');

  for (let r = 8; r <= 14; r++) {
    put(g, r, 19, '│', 'frameC');
    put(g, r, 44, '│', 'frameC');
  }

  put(g, 15, 19, '└', 'frameC');
  for (let c = 20; c <= 43; c++) put(g, 15, c, '─', 'frameC');
  put(g, 15, 44, '┘', 'frameC');

  put(g, 9, 27, '╔', 'frameC');
  for (let c = 28; c <= 34; c++) put(g, 9, c, '═', 'frameC');
  put(g, 9, 35, '╗', 'frameC');
  for (let r = 10; r <= 12; r++) {
    put(g, r, 27, '║', 'frameC');
    put(g, r, 35, '║', 'frameC');
  }
  put(g, 13, 27, '╚', 'frameC');
  for (let c = 28; c <= 34; c++) put(g, 13, c, '═', 'frameC');
  put(g, 13, 35, '╝', 'frameC');

  const bricks = '▓██▓██▓██▓██▓██▓██▓██▓██▓█';
  for (let i = 0; i < bricks.length && 19 + i <= 44; i++) put(g, 16, 19 + i, bricks[i], 'bricks');
  for (let c = 19; c <= 44; c++) put(g, 17, c, '═', 'bricks');

  stamp(g, 14, 1, coalBase, 'coal');
  stamp(g, 14, 57, coalBase, 'coal');
  stamp(g, 14, 1, coalHi, 'coalHi');
  stamp(g, 14, 57, coalHi, 'coalHi');

  const left = phase === 0 ? stokerL_up : stokerL_down;
  const right = phase === 0 ? stokerR_down : stokerR_up;
  stamp(g, 12, 7, left, 'body');
  stamp(g, 12, 44, right, 'body');

  const prompt = '$ ';
  const cmd = 'claude burn-tokens --aggressive';
  const full = prompt + cmd;
  const lc = Math.floor((W - full.length) / 2);
  for (let i = 0; i < prompt.length; i++) put(g, 19, lc + i, prompt[i], 'prompt');
  for (let i = 0; i < cmd.length; i++) put(g, 19, lc + prompt.length + i, cmd[i], 'label');

  const tagL = 'context';
  const tagR = 'history';
  for (let i = 0; i < tagL.length; i++) put(g, 18, 1 + i, tagL[i], 'dim');
  for (let i = 0; i < tagR.length; i++) put(g, 18, 56 + i, tagR[i], 'dim');

  return g;
}

// ── flame ───────────────────────────────────────────────────────────────────
const FLAME_MID = ['(', '{', 'Ѫ', 'Ѧ', 'ѫ', 'ʌ', '∧', 'Ѩ', 'ω', '∂'];
const FLAME_TIPS = ["'", '.', '`', '¨', 'ˆ', ','];
const EMBER_GLY = ['▓', '▒', '█', '▓', '▒', '░'];

export function renderFlame(intensity, rng) {
  const g = makeGrid();
  const { r0, r1, c0, c1 } = DOOR;
  for (let c = c0; c <= c1; c++) put(g, r1, c, EMBER_GLY[Math.floor(rng() * EMBER_GLY.length)], 'ember');
  for (let r = r1 - 1; r >= r0; r--) {
    for (let c = c0; c <= c1; c++) {
      if (rng() < 0.55 + intensity * 0.15) {
        put(g, r, c, FLAME_MID[Math.floor(rng() * FLAME_MID.length)], 'flame');
      }
    }
  }
  for (let c = c0; c <= c1; c++) {
    if (rng() < 0.55) put(g, r0, c, FLAME_TIPS[Math.floor(rng() * FLAME_TIPS.length)], 'spark');
  }
  return g;
}

// ── particles ───────────────────────────────────────────────────────────────
const SMOKE_GLY = ['·', '.', '°', '˚', '∘', ',', "'"];
const SPARK_GLY = ['*', '˙', '·', '✦', "'", '✧'];
const WORDS = ['tok', '</s>', '42', '≈', '$$', '···', '</>', '[EOS]', '256', '∞', 'λ', '#'];

export function createWorld() {
  return { sparks: [], smokes: [], tokens: [], burned: 0 };
}

const randRange = (rng, a, b) => a + rng() * (b - a);
const pickFrom = (rng, a) => a[Math.floor(rng() * a.length)];

function spawnSpark(world, rng, x, y) {
  world.sparks.push({
    x: x ?? randRange(rng, DOOR.c0, DOOR.c1),
    y: y ?? DOOR.r0,
    vx: randRange(rng, -0.18, 0.18),
    vy: -randRange(rng, 0.25, 0.55),
    life: randRange(rng, 8, 16),
    g: pickFrom(rng, SPARK_GLY),
  });
}

function spawnSmoke(world, rng) {
  world.smokes.push({
    x: randRange(rng, 29, 33),
    y: 3,
    vx: randRange(rng, -0.22, 0.22),
    vy: -randRange(rng, 0.12, 0.30),
    life: randRange(rng, 10, 22),
    g: pickFrom(rng, SMOKE_GLY),
  });
}

function leftShovelTip(phase) {
  return phase === 1 ? { x: 20, y: 14 } : { x: 11, y: 13 };
}
function rightShovelTip(phase) {
  return phase === 1 ? { x: 52, y: 13 } : { x: 43, y: 14 };
}

export function spawnToken(world, rng, side, phase) {
  const tip = side === 'L' ? leftShovelTip(phase) : rightShovelTip(phase);
  const targetX = 31, targetY = 11;
  const dx = targetX - tip.x;
  const dy = targetY - tip.y;
  const steps = 12;
  world.tokens.push({
    x: tip.x,
    y: tip.y,
    vx: dx / steps + randRange(rng, -0.05, 0.05),
    vy: dy / steps + randRange(rng, -0.05, 0.05),
    life: 28,
    word: pickFrom(rng, WORDS),
  });
}

export function stepParticles(world, rng) {
  if (rng() < 0.7) spawnSpark(world, rng);
  for (const s of world.sparks) { s.x += s.vx; s.y += s.vy; s.life -= 1; }
  for (let i = world.sparks.length - 1; i >= 0; i--) {
    if (world.sparks[i].life <= 0 || world.sparks[i].y < 1) world.sparks.splice(i, 1);
  }

  if (rng() < 0.75) spawnSmoke(world, rng);
  for (const s of world.smokes) { s.x += s.vx; s.y += s.vy; s.life -= 1; }
  for (let i = world.smokes.length - 1; i >= 0; i--) {
    if (world.smokes[i].life <= 0 || world.smokes[i].y < 0) world.smokes.splice(i, 1);
  }

  for (const t of world.tokens) { t.x += t.vx; t.y += t.vy; t.life -= 1; }
  for (let i = world.tokens.length - 1; i >= 0; i--) {
    const t = world.tokens[i];
    const inDoor = t.x >= DOOR.c0 - 1 && t.x <= DOOR.c1 + 1 && t.y >= DOOR.r0 - 1 && t.y <= DOOR.r1 + 2;
    if (inDoor || t.life <= 0) {
      if (inDoor) {
        for (let k = 0; k < 5; k++) spawnSpark(world, rng, t.x + randRange(rng, -1, 1), t.y + randRange(rng, -1, 1));
        world.burned += 1;
      }
      world.tokens.splice(i, 1);
    }
  }
}

export function renderParticles(arr, cls) {
  const g = makeGrid();
  for (const p of arr) put(g, Math.round(p.y), Math.round(p.x), p.g, cls);
  return g;
}

export function renderTokenGrid(tokens) {
  const g = makeGrid();
  for (const t of tokens) {
    const r = Math.round(t.y);
    const c = Math.round(t.x);
    const w = t.word;
    for (let i = 0; i < w.length; i++) put(g, r, c + i, w[i], 'token');
  }
  return g;
}

// ── frame orchestration ─────────────────────────────────────────────────────
export function advanceFrame(world, rng, tick, phaseRef) {
  // tick % 10: alternate phase + throw a token from the now-DOWN stoker
  if (tick % 10 === 0) {
    phaseRef.phase = 1 - phaseRef.phase;
    if (phaseRef.phase === 1) spawnToken(world, rng, 'L', 1);
    else spawnToken(world, rng, 'R', 1);
  }
  if (tick % 7 === 0) spawnToken(world, rng, rng() < 0.5 ? 'L' : 'R', phaseRef.phase);

  const bg = buildBG(phaseRef.phase);
  const flame = renderFlame((Math.sin(tick * 0.4) + 1) / 2, rng);
  const spark = renderParticles(world.sparks, 'spark');
  const smoke = renderParticles(world.smokes, 'smoke');
  const tok = renderTokenGrid(world.tokens);

  const composed = compose([smoke, flame, spark, tok, bg]);
  stepParticles(world, rng);
  return composed;
}

export function tempForTick(tick) {
  return 1400 + Math.round(120 * ((Math.sin(tick * 0.31) + 1) / 2));
}
