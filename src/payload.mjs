// Generate junk text the Claude Code session will consume via the Read tool.
// One token ≈ ~4 characters of English text for the Claude tokenizer family,
// but with random short words we measure closer to ~5 chars/token. We aim a
// little high to make sure the Read tool returns ~target tokens.

import { writeFileSync } from 'node:fs';
import { platform, tmpdir } from 'node:os';
import { join } from 'node:path';

// Fixed, predictable path. POSIX uses /tmp directly so docs and SKILL.md
// can quote a stable path; Windows falls back to the system temp dir.
export const PAYLOAD_PATH = platform() === 'win32'
  ? join(tmpdir(), 'burn-tokens-payload.txt')
  : '/tmp/burn-tokens-payload.txt';

const VOCAB = [
  'burn','token','furnace','stoker','shovel','coal','ember','spark','smoke',
  'flame','heap','context','history','prompt','memory','cache','weight','byte',
  'embed','tensor','model','vector','prior','window','margin','footer','header',
  'pixel','glyph','char','line','frame','tick','swing','phase','arc','door',
  'flicker','glow','ash','soot','log','bench','craft','script','module','agent',
  'tool','call','run','wait','step','heat','meter','gauge','dial','badge',
  'queue','batch','seam','grid','cell','row','col','layer','depth','width',
];

const CHARS_PER_TOKEN = 4; // conservative; over-estimate target chars

export function makePayload(targetTokens) {
  const targetChars = targetTokens * CHARS_PER_TOKEN;
  const out = [];
  let len = 0;
  // Write in wrapped 80-char lines for nicer file shape.
  let line = '';
  while (len < targetChars) {
    const w = VOCAB[(Math.random() * VOCAB.length) | 0];
    if (line.length + w.length + 1 > 80) {
      out.push(line);
      len += line.length + 1;
      line = w;
    } else {
      line = line ? line + ' ' + w : w;
    }
  }
  if (line) { out.push(line); len += line.length + 1; }
  return out.join('\n') + '\n';
}

export function writePayload(targetTokens, path = PAYLOAD_PATH) {
  const content = makePayload(targetTokens);
  writeFileSync(path, content);
  return { path, bytes: Buffer.byteLength(content, 'utf8') };
}
