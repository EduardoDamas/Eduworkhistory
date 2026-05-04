/**
 * Parses user text like "1,2", "01 02", "1" into product display codes (e.g. "01").
 * No NLP — token split on comma/semicolon/whitespace only.
 */
export function parseProductDisplayCodes(input: string): { codes: string[]; invalidTokens: string[] } {
  const trimmed = input.trim();
  if (!trimmed) return { codes: [], invalidTokens: [] };

  const tokens = trimmed
    .split(/[\s,;]+/g)
    .map((t) => t.trim())
    .filter(Boolean);

  const codes: string[] = [];
  const invalidTokens: string[] = [];

  for (const raw of tokens) {
    if (!/^\d+$/.test(raw)) {
      invalidTokens.push(raw);
      continue;
    }
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1 || n > 99) {
      invalidTokens.push(raw);
      continue;
    }
    codes.push(String(n).padStart(2, "0"));
  }

  return { codes, invalidTokens };
}
