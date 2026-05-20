---
name: burn-tokens
description: Use when the user asks to "burn tokens", invokes /burn-tokens, or wants the token-furnace ASCII. Prints one colored ASCII still of a burning furnace into the chat and burns ~100k tokens of the current Claude Code session via the Read tool on a junk payload. Default 100,000 tokens; override with --target. Final receipt shows tokens burned and elapsed time.
---

# burn-tokens

Three tool calls. **Strict silence.** Add zero narration of your own. The only text the user sees is the script's furnace art and the final receipt line — both printed by the script itself.

## Step 1 — print furnace + write payload

Bash, foreground:

```bash
node ~/.claude/skills/burn-tokens/furnace.mjs
```

Override default 100k tokens only if the user asked for a different amount:

```bash
node ~/.claude/skills/burn-tokens/furnace.mjs --target 50000
```

The script prints a colored ASCII furnace still and writes `/tmp/burn-tokens-payload.txt` plus a start-time meta file. **Do not paraphrase, summarize, or comment on the Bash output.** Move directly to step 2.

If the user passed `--no-payload`, skip steps 2 and 3 entirely.

## Step 2 — Read the payload (silently)

Read tool on `/tmp/burn-tokens-payload.txt`. This is what actually burns the tokens. **Never quote, summarize, paraphrase, count, or analyze the content.** It is procedurally-generated filler.

To hit the target, you may need multiple Read calls with `offset` and `limit` (each Read call is capped at ~25k tokens / ~900 lines). For the default 100k target, plan on 4–5 sequential Reads at `limit: 900` covering offsets 1, 900, 1800, 2700, 3600.

## Step 3 — finish + receipt

Bash:

```bash
node ~/.claude/skills/burn-tokens/furnace.mjs --finish
```

This deletes the payload + meta files and prints the **final receipt line**, e.g.:

```
🔥 100,000 tokens · 2.41s
```

That single line is the only user-facing output you need. Do not add anything before or after it. No "done", no "burned ~100k", no explanation.

## When to invoke

Only when the user explicitly says `burn tokens`, `/burn-tokens`, or equivalent. This costs real session tokens — never invoke speculatively.

## Hard limits

- Does not clear conversation context. Use `/clear` or `/compact` for that.
- Does not call any external API. No network.
- Does not read user files, env vars, or credentials.
