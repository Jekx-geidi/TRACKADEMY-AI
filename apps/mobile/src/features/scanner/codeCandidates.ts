/**
 * Turns raw OCR text into candidate 5-digit assessment codes.
 *
 * Candidates are only guesses. Every candidate must be validated against the database
 * before it is shown to the user as a match.
 */

export const MAX_CANDIDATES = 10;

// Characters OCR commonly confuses with handwritten digits.
const LOOKALIKE_DIGITS: Readonly<Record<string, string>> = {
  O: '0', o: '0', D: '0', Q: '0',
  I: '1', l: '1', i: '1', '|': '1', '!': '1',
  Z: '2', z: '2',
  S: '5', s: '5',
  G: '6', b: '6',
  B: '8',
  g: '9', q: '9',
};

const FIVE_DIGIT_RUN = /(?:^|\D)(\d{5})(?=\D|$)/g;

/** Joins digits separated only by spaces, e.g. "5 5 9 2 2" or "55 922" -> "55922". */
function collapseSpacedDigits(line: string): string {
  return line.replace(/(\d)[ \t]+(?=\d)/g, '$1');
}

/** Replaces look-alike letters, but only in short tokens that are already mostly digits. */
function fixLookalikes(line: string): string {
  return line
    .split(/(\s+)/)
    .map((token) => {
      const digits = token.replace(/\D/g, '').length;
      if (digits < 3 || token.length > 7) return token;
      return [...token].map((ch) => LOOKALIKE_DIGITS[ch] ?? ch).join('');
    })
    .join('');
}

function findRuns(text: string): string[] {
  return [...text.matchAll(FIVE_DIGIT_RUN)].map((m) => m[1]!);
}

export function extractCodeCandidates(text: string, max = MAX_CANDIDATES): string[] {
  const found: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const variants = [line, fixLookalikes(line), collapseSpacedDigits(line), fixLookalikes(collapseSpacedDigits(line))];
    for (const variant of variants) {
      for (const run of findRuns(variant)) {
        if (!found.includes(run)) found.push(run);
      }
    }
  }
  return found.slice(0, max);
}

/** Merges candidate lists, keeping earlier (higher-priority) lists first. */
export function mergeCandidates(lists: readonly (readonly string[])[], max = MAX_CANDIDATES): string[] {
  const merged: string[] = [];
  for (const list of lists) {
    for (const code of list) {
      if (!merged.includes(code)) merged.push(code);
    }
  }
  return merged.slice(0, max);
}
