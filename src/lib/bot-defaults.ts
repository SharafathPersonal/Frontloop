/**
 * Default human-handoff phrases. Multi-word only: single words like "agent" or
 * "human" paused the bot on ordinary sentences ("is your agent available?").
 */
export const DEFAULT_HANDOFF_KEYWORDS = ['talk to a human', 'speak to a person', 'human agent', 'call me back'] as const;

/** Shortest keyword accepted; shorter triggers match inside too many normal messages. */
export const MIN_HANDOFF_KEYWORD_LENGTH = 4;

/** The pre-2026-10 default, stored verbatim on every knowledge base created before this change. */
const LEGACY_DEFAULT_HANDOFF_KEYWORDS = ['human', 'agent', 'call me'];

/**
 * Effective keywords for a stored knowledge base: a never-customised legacy default
 * is upgraded to the current default, and too-short entries are ignored.
 */
export function resolveHandoffKeywords(stored: readonly string[] | null | undefined): string[] {
  if (!stored) return [...DEFAULT_HANDOFF_KEYWORDS];
  const isLegacyDefault =
    stored.length === LEGACY_DEFAULT_HANDOFF_KEYWORDS.length &&
    stored.every((kw, i) => kw === LEGACY_DEFAULT_HANDOFF_KEYWORDS[i]);
  if (isLegacyDefault) return [...DEFAULT_HANDOFF_KEYWORDS];
  return stored.map((kw) => kw.trim()).filter((kw) => kw.length >= MIN_HANDOFF_KEYWORD_LENGTH);
}
