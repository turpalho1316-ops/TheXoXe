
// ============================================================
// Speech bubble texture cache
// ============================================================
const bubbleCache = new Map<string, THREE.Texture>();

export function getSpeechBubbleTexture(text: string): THREE.Texture {
  const cached = bubbleCache.get(text);
  if (cached) return cached;
  const tex = createSpeechBubbleTexture(text);
  bubbleCache.set(text, tex);
  return tex;
}

// ============================================================
// Prewarm — pre-render every possible bubble
// ============================================================
export function prewarmBubbles(): void {
  const all = new Set<string>();
  for (const d of BOT_DIALOGUES) {
    for (const line of d) all.add(line.text);
  }
  for (const name of Object.keys(BOT_MONOLOGUES)) {
    for (const t of BOT_MONOLOGUES[name]) all.add(t);
  }
  for (const name of Object.keys(BOT_SPOTTED_LINES)) {
    for (const t of BOT_SPOTTED_LINES[name]) all.add(t);
  }
  for (const t of all) {
    getSpeechBubbleTexture(t);
  }
}
