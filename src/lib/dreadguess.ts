export type Candidate = { seed: number; scroll: number[] };

export type RecordedGuess = { code: number[]; incorrect: number };

export function parseGuesses(pref: string): RecordedGuess[] {
  if (pref === "") return [];
  const out: RecordedGuess[] = [];
  for (const entry of pref.split(",")) {
    const [codeStr, incorrectStr] = entry.split(":");
    if (!codeStr || codeStr.length !== 8) continue;
    const incorrect = parseInt(incorrectStr, 10);
    if (!Number.isFinite(incorrect)) continue;
    out.push({ code: codeStr.split("").map((ch) => parseInt(ch, 10)), incorrect });
  }
  return out;
}

export function hamming(a: number[], b: number[]): number {
  let n = 0;
  for (let i = 0; i < 8; i++) if (a[i] !== b[i]) n++;
  return n;
}

export function filterByGuesses(cands: Candidate[], pref: string): Candidate[] {
  const guesses = parseGuesses(pref);
  if (guesses.length === 0) return cands;
  return cands.filter((c) => guesses.every((g) => hamming(c.scroll, g.code) === g.incorrect));
}

export function filterByClues(cands: Candidate[], clues: number[]): Candidate[] {
  return cands.filter((c) => clues.every((clue, i) => clue === 0 || clue === c.scroll[i]));
}

export function agreedClues(cands: Candidate[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < 8; i++) {
    if (cands.length === 0) {
      out.push(0);
      continue;
    }
    const first = cands[0].scroll[i];
    out.push(cands.every((c) => c.scroll[i] === first) ? first : 0);
  }
  return out;
}

export function unknownClues(cands: Candidate[], clues: number[]): number[] {
  const agreed = agreedClues(cands);
  const out: number[] = [];
  for (let i = 0; i < 8; i++) {
    if (clues[i] === 0 && agreed[i] === 0) out.push(i + 1);
  }
  return out;
}

export function splitsOn(cands: Candidate[], clue: number): boolean {
  if (cands.length < 2) return false;
  const first = cands[0].scroll[clue - 1];
  return cands.some((c) => c.scroll[clue - 1] !== first);
}

export function pickGuess(cands: Candidate[]): number[] {
  if (cands.length === 0) return [];
  const digitCounts: number[][] = Array.from({ length: 8 }, () => new Array(5).fill(0));
  for (const cand of cands) {
    for (let pos = 0; pos < 8; pos++) digitCounts[pos][cand.scroll[pos]] += 1;
  }
  let best = cands[0].scroll;
  let bestExpected = Number.POSITIVE_INFINITY;
  for (const cand of cands) {
    let expected = 0;
    for (let pos = 0; pos < 8; pos++) {
      expected += 1 - digitCounts[pos][cand.scroll[pos]] / cands.length;
    }
    if (expected < bestExpected) {
      bestExpected = expected;
      best = cand.scroll;
    }
  }
  return best;
}

export function purchaseCells(cands: Candidate[], clues: number[]): Candidate[][] {
  const splitting = [4, 7].filter((clue) => clues[clue - 1] === 0 && splitsOn(cands, clue));
  if (splitting.length === 0) return [cands];
  const cells = new Map<string, Candidate[]>();
  for (const c of cands) {
    const key = splitting.map((clue) => c.scroll[clue - 1]).join(":");
    const cell = cells.get(key);
    if (cell) cell.push(c);
    else cells.set(key, [c]);
  }
  return [...cells.values()];
}

export function worstWrongWords(cands: Candidate[], guess: number[]): number {
  let worst = 0;
  for (const c of cands) worst = Math.max(worst, hamming(c.scroll, guess));
  return worst;
}

export function burnTurns(wrongWords: number): number {
  return Math.max(0, 3 * wrongWords - 1);
}
