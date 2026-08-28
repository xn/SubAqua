import { abort, myAscensions, phpMtRand, phpRand, phpSeed, print, turnsPlayed } from "kolmafia";
import { get, set } from "libram";

import { args } from "../args";

/**
 * Native port of VeeArrKoL/seedfinder (checkout at /Users/xn/sites/KOL/seedfinder,
 * HEAD ad70b27), the dreadscroll seed-space spader UnderTheSea imports
 * (globals.ash:1). A "seed" is the 7-digit per-ascension PHP RNG seed
 * (1000000..9999999, seedfinder.ash:10-12); replaying draws off phpSeed(seed)
 * reproduces the bang-potion order, Leprecondo need order, the eight
 * dreadscroll answers, and the seahorse name. One phpSeed handle carries TWO
 * independent streams (mafia Rng.java): phpRand = glibc rand (shuffle),
 * phpMtRand = PHP Mersenne Twister (dreadscroll, seahorse name).
 *
 * seedfinder's 148 MB lookup tables are NOT shipped; we scan the seed space
 * once, cache the survivors, and re-filter the cache as clues land. All
 * writes here go to dreadScroll1..8 (mafia-owned clue prefs) and the three
 * subaqua_seed* cache prefs.
 */

// kolmafia's typings declare `class Rng {}` without exporting it
// (node_modules/kolmafia/index.d.ts:1646); phpSeed's return type stands in.
type Rng = ReturnType<typeof phpSeed>;

const SEED_MIN = 1000000;
const SEED_MAX = 9999999;
/** Cache survivors only when the list is this small; otherwise record the
 * constraint count and retry after new evidence lands. */
const CACHE_MAX = 2000;
/**
 * Sentinel for subaqua_seedCandidates meaning "scanned this ascension, zero
 * survivors" — distinct from "" ("never scanned"). Without it, writing ""
 * for a zero-candidate result would be indistinguishable from a cold cache,
 * and every subsequent candidateSeeds() call (engine post() runs one after
 * every task) would re-pay the full 9M-seed scan.
 */
const SCANNED_EMPTY = "none";

/** Fisher-Yates over the requested stream (SF/seedfinder_util.ash:15-40). */
function shuffled(initial: string, r: Rng, mt: boolean): string {
  const arr = initial.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const idx = mt ? phpMtRand(r, 0, i) : phpRand(r, 0, i);
    const tmp = arr[i];
    arr[i] = arr[idx];
    arr[idx] = tmp;
  }
  return arr.join("");
}

/** SF/seedfinder_calc.ash:21-23 — 9-letter permutation of "scitdembh". */
export function calculateBangPotions(seed: number): string {
  return shuffled("scitdembh", phpSeed(seed), false);
}

/** SF/seedfinder_calc.ash:25-27 — 6-letter permutation of "emdfbs". */
export function calculateCondoOrder(seed: number): string {
  return shuffled("emdfbs", phpSeed(seed), false);
}

/** SF/seedfinder_calc.ash:34-41 — eight straight mt_rand(1,4) draws. */
export function calculateDreadscroll(seed: number): number[] {
  const r = phpSeed(seed);
  const rv: number[] = [];
  for (let i = 0; i < 8; i++) rv.push(phpMtRand(r, 1, 4));
  return rv;
}

// Seahorse name tables, verbatim from SF/seedfinder_calc.ash:67-70
// (data collected by Fart Scauce #2813285; inline in the ash, no data files).
const SWIM_NAMES = [
  "Flicker",
  "Flitter",
  "Glitter",
  "Glimmer",
  "Shimmer",
  "Luster",
  "Dazzle",
  "Splendor",
  "Fritter",
  "Frizzle",
  "Tripper",
];
const JACK_NAMES = [
  "Banana",
  "Blackberry",
  "Blueberry",
  "Cantaloupe",
  "Cherry",
  "Clementine",
  "Dragonfruit",
  "Durian",
  "Fig",
  "Grape",
  "Grapefruit",
  "Honeydew",
  "Huckleberry",
  "Jackfruit",
  "Kiwi",
  "Kumquat",
  "Lemon",
  "Lime",
  "Mango",
  "Orange",
  "Pear",
  "Pineapple",
  "Raspberry",
  "Starfruit",
  "Strawberry",
  "Tangerine",
  "Tomato",
  "Watermelon",
  "Grapple",
  "Pluot",
  "Apricot",
  "Plum",
];
const TWOPART_NAMES_1 = [
  "Morning",
  "Afternoon",
  "Evening",
  "Waterspout",
  "Dolphin",
  "Cloud",
  "Reddie",
  "Purplie",
  "Bluie",
  "Orangie",
  "Greenie",
  "Pasty",
  "Lightning",
  "Thunder",
  "Pokey",
  "Scarlet",
  "Manta",
  "Sailboat",
  "Swimmy",
  "Backstroke",
  "Butterfly",
  "Sushi",
  "Hermit",
  "Diving",
  "Swordfish",
  "Starfish",
  "Sturgeon",
  "Urchin",
  "Beluga",
];
const TWOPART_NAMES_2 = [
  "Splash",
  "Pie",
  "Sparkle",
  "Waves",
  "Sand",
  "Gloaming",
  "Dreams",
  "Munchies",
  "Seagrass",
  "Shipwreck",
  "Sailor",
  "Fizzy",
  "Bucket",
  "Bait",
  "Sofa",
  "Apple",
  "Urchin",
  "Star",
  "Beam",
  "Valley",
  "Blossom",
  "Scallop",
  "Coral",
  "Anemone",
  "Seaweed",
];

/** SF/seedfinder_calc.ash:72-85 — a 4 on the type roll is redrawn (and
 * CONSUMES an MT output); all draws come from the MT stream. */
export function calculateSeahorseName(seed: number): string {
  const r = phpSeed(seed);
  let type = -1;
  while (type < 1 || type > 3) type = phpMtRand(r, 1, 4);
  if (type === 1) return `${JACK_NAMES[phpMtRand(r, 0, 31)]}jack`;
  if (type === 2) {
    return `${TWOPART_NAMES_1[phpMtRand(r, 0, 28)]} ${TWOPART_NAMES_2[phpMtRand(r, 0, 24)]}`;
  }
  return `${SWIM_NAMES[phpMtRand(r, 0, 10)]}swim`;
}

type Criteria = {
  clues: number[]; // dreadScroll1..8; 0 = unknown
  seahorse: string; // "" = unknown, else exact match
  condo: string; // 6 chars over "emdfbs"/"?"
  bang: string; // 9 chars over "scitdembh"/"?"
};

/** dreadScroll1..8, read fresh each call — also the basis of the
 * candidateSeeds() memo key (see below). */
function currentClues(): number[] {
  const clues: number[] = [];
  for (let i = 1; i <= 8; i++) clues.push(get(`dreadScroll${i}`, 0));
  return clues;
}

/** SF/SeedCriteria.ash:80-143 — observations to criteria, "?" = unknown. */
function playerCriteria(): Criteria {
  const clues = currentClues();

  let condo = "??????";
  const needs = get("leprecondoNeedOrder", "");
  if (needs !== "") {
    condo = "";
    for (const need of needs.split(",")) condo += need.charAt(0);
    while (condo.length < 6) condo += "?";
    if (!/^[emdfbs?]{6}$/.test(condo)) condo = "??????"; // SF:106-110 distrust
  }

  let bang = "";
  for (let i = 819; i <= 827; i++) {
    const potion = get(`lastBangPotion${i}`, "");
    bang += potion === "" ? "?" : potion.charAt(0);
  }

  return { clues, seahorse: get("seahorseName", ""), condo, bang };
}

function wildcardMatch(criteria: string, data: string): boolean {
  for (let i = 0; i < criteria.length; i++) {
    if (criteria[i] !== "?" && criteria[i] !== data[i]) return false;
  }
  return true;
}

/** Constraint strength — used to decide when a failed scan is worth retrying. */
function constraintCount(c: Criteria): number {
  return (
    c.clues.filter((v) => v > 0).length +
    (c.seahorse !== "" ? 1 : 0) +
    c.condo.split("").filter((ch) => ch !== "?").length +
    c.bang.split("").filter((ch) => ch !== "?").length
  );
}

/** SF/SeedCriteria.ash:277-313, cheapest derivation first. */
function matches(c: Criteria, seed: number): boolean {
  const scroll = calculateDreadscroll(seed);
  for (let i = 0; i < 8; i++) {
    if (c.clues[i] > 0 && c.clues[i] !== scroll[i]) return false;
  }
  if (c.seahorse !== "" && c.seahorse !== calculateSeahorseName(seed)) return false;
  if (c.condo !== "??????" && !wildcardMatch(c.condo, calculateCondoOrder(seed))) return false;
  if (c.bang !== "?????????" && !wildcardMatch(c.bang, calculateBangPotions(seed))) return false;
  return true;
}

/** Writes subaqua_seedCandidates only when the value actually changes (part
 * of the candidateSeeds() memoization, ruling 3): grimoire's ready()/
 * completed() call isKnucklebonesAndSushiEnough() — and therefore this —
 * on every task's every selection pass, so a same-value rewrite of a pref
 * that can run to ~16 KB is pure waste. */
function setCandidatesPref(value: string): void {
  if (get("subaqua_seedCandidates", "") !== value) set("subaqua_seedCandidates", value);
}

/**
 * subaqua_seedScanFloor, ascension-scoped ("${ascension}:${count}") like
 * subaqua_seedCandidatesAsc — a bare count would leak across ascensions:
 * criteria reset each ascension, but nothing else would ever lower or clear
 * a persistent scalar, so a floor recorded in one ascension could suppress
 * every full scan in a later one forever. A stale (or missing) ascension
 * reads back as floor 0.
 *
 * This floor has exactly one owner: the overflow branch below ("too many
 * survivors — retry once constraints get stronger"). The zero-survivors
 * case is handled entirely by the SCANNED_EMPTY sentinel on
 * subaqua_seedCandidates, which already guarantees no rescan for the
 * current ascension; it must NOT also write this floor, or a high
 * zero-result count (up to 24) would suppress a genuine, lower-count
 * overflow retry.
 */
function scanFloor(): number {
  const raw = get("subaqua_seedScanFloor", "");
  const [ascStr, countStr] = raw.split(":");
  if (parseInt(ascStr, 10) !== myAscensions()) return 0;
  return parseInt(countStr, 10) || 0;
}

function setScanFloor(count: number): void {
  set("subaqua_seedScanFloor", `${myAscensions()}:${count}`);
}

/**
 * Candidate seeds under the current evidence, or undefined when unknown
 * (scan disabled, criteria too weak, or survivors over the cache cap).
 * The first successful scan is O(9M) through the phpSeed bridge — a
 * once-per-ascension cost, paid only after the seahorse name plus two more
 * clues exist; afterwards the cached list re-filters in microseconds.
 *
 * A scan (full or re-filter) that finds zero survivors is cached as the
 * SCANNED_EMPTY sentinel rather than "" (indistinguishable from "never
 * scanned"), so within this ascension the cache-hit branch above returns []
 * without ever reaching the full scan again. subaqua_seedScanFloor is left
 * untouched by the zero-survivors case (see scanFloor()/setScanFloor()) —
 * it belongs solely to the overflow case.
 */
function computeCandidateSeeds(): number[] | undefined {
  const c = playerCriteria();

  if (get("subaqua_seedCandidatesAsc", -1) === myAscensions()) {
    const cached = get("subaqua_seedCandidates", "");
    if (cached === SCANNED_EMPTY) return [];
    if (cached !== "") {
      const seeds = cached
        .split(",")
        .map((s) => parseInt(s, 10))
        .filter((seed) => Number.isFinite(seed) && seed >= SEED_MIN && seed <= SEED_MAX)
        .filter((seed) => matches(c, seed));
      if (seeds.length === 0) {
        setCandidatesPref(SCANNED_EMPTY);
      } else {
        setCandidatesPref(seeds.join(","));
      }
      return seeds;
    }
  }

  // Full-scan trigger: seahorse name (set the turn the seahorse is tamed).
  // Seahorse name is the only hard trigger — NOT a clue count. The ash scans
  // the turn the seahorse is tamed (post_adv -> dreadSeedCheck, UTS:262-263;
  // seedfinder needs no clues) and, with a candidate set in hand, its
  // isKBandSushiEnough() lets it SKIP the vocabulary grind. Live 2026-08-28:
  // the old ">= 2 clues" gate (a Phase 4 cost ruling) left candidateSeeds()
  // undefined at turn 52, isKnucklebonesAndSushiEnough() false by
  // construction, and Farm School ground mastery to 90 over 41 turns
  // (UTS 08-26: 5 school turns, no grind). Name + full condo order is
  // ~1/33 x 1/720 selective, a few hundred candidates — under CACHE_MAX;
  // the overflow floor below still guards the sparse-constraint case.
  if (c.seahorse === "") return undefined;
  // A prior scan overflowed at this constraint strength (this ascension): wait for new evidence.
  if (constraintCount(c) <= scanFloor()) return undefined;

  const start = Date.now();
  const seeds: number[] = [];
  for (let seed = SEED_MIN; seed <= SEED_MAX; seed++) {
    if (matches(c, seed)) {
      seeds.push(seed);
      if (seeds.length > CACHE_MAX) break;
    }
  }
  if (seeds.length > CACHE_MAX) {
    setScanFloor(constraintCount(c));
    print(
      `Dreadscroll seed scan overflowed ${CACHE_MAX} candidates; retrying after more clues.`,
      "olive",
    );
    return undefined;
  }
  print(
    `Dreadscroll seed scan: ${seeds.length} candidates in ${Math.round((Date.now() - start) / 1000)}s.`,
    "blue",
  );
  if (seeds.length === 0) {
    set("subaqua_seedCandidates", SCANNED_EMPTY);
  } else {
    set("subaqua_seedCandidates", seeds.join(","));
  }
  set("subaqua_seedCandidatesAsc", myAscensions());
  return seeds;
}

/**
 * Memoization (ruling 3): isKnucklebonesAndSushiEnough() is called from
 * grimoire ready()/completed() on every task's every selection pass, and
 * each call would otherwise re-run computeCandidateSeeds() — up to
 * CACHE_MAX calculateDreadscroll() calls (each a fresh phpSeed + 8 MT
 * draws) plus a pref write of up to ~16 KB. Key on the only inputs that can
 * change the answer between calls: turnsPlayed(), the eight dreadScroll
 * clues, and the stored subaqua_seedCandidates pref (covers ascension
 * rollover and any external cache reset). Recompute only when the key
 * changes.
 */
let memoKey: string | undefined;
let memoValue: number[] | undefined;

export function candidateSeeds(): number[] | undefined {
  if (!args.seedScan) return undefined;

  const key = `${turnsPlayed()}|${currentClues().join(",")}|${get("subaqua_seedCandidates", "")}`;
  if (key === memoKey) return memoValue;

  const result = computeCandidateSeeds();
  memoKey = key;
  memoValue = result;
  return result;
}

/**
 * Ash dreadSeedCheck (G:672-684) waits for a UNIQUE seed before writing
 * clues. Deviation, documented: any clue on which ALL surviving candidates
 * agree is already determined — writing it early is strictly more
 * information at zero risk.
 */
export function dreadSeedCheck(): void {
  const seeds = candidateSeeds();
  if (seeds === undefined) return;
  if (seeds.length === 0) {
    print(
      "Dreadscroll seed scan: zero candidates — a criteria pref is corrupt (check leprecondoNeedOrder / dreadScroll*).",
      "red",
    );
    return;
  }
  const scrolls = seeds.map((seed) => calculateDreadscroll(seed));
  for (let i = 0; i < 8; i++) {
    if (get(`dreadScroll${i + 1}`, 0) !== 0) continue;
    const first = scrolls[0][i];
    if (scrolls.every((scroll) => scroll[i] === first)) {
      set(`dreadScroll${i + 1}`, first);
      print(`Dreadscroll clue ${i + 1} inferred from seed candidates: ${first}.`, "blue");
    }
  }
}

/**
 * True iff the knucklebone (clue 4) + worktea sushi (clue 7) will pin the
 * seed — every candidate has a distinct (clue4, clue7) pair — so the long
 * cheatsheet/vocabulary route can be skipped. Fixes the ash's off-by-one
 * (G:116-128 tests indexes [4]/[7] = clues 5 and 8) and its separator-less
 * contains_text pair matching; see the plan's ground-truth notes.
 */
export function isKnucklebonesAndSushiEnough(): boolean {
  const seeds = candidateSeeds();
  if (seeds === undefined || seeds.length === 0) return false;
  const pairs = new Set<string>();
  for (const seed of seeds) {
    const scroll = calculateDreadscroll(seed);
    const key = `${scroll[3]}:${scroll[6]}`;
    if (pairs.has(key)) return false;
    pairs.add(key);
  }
  return true;
}

/**
 * Arg-gated god-run insurance (ash UTS:2684-2690): at <= 17 turns played with
 * clue 7 unknown, refuse to brute-force choice 703 (each wrong guess costs a
 * Deep-Tainted Mind burn). The library quest's worktea task runs first when
 * it can; reaching this abort means it could not.
 */
export function godRunGuardCheck(): void {
  if (!args.godRunGuard) return;
  if (turnsPlayed() > 17 || get("dreadScroll7", 0) !== 0) return;
  abort(
    "godRunGuard: on god-run pace (<= 17 turns) with dreadscroll clue 7 unknown. " +
      "Acquire a Mer-kin worktea and eat a sea sushi (the tea rides along and reveals the clue), then rerun.",
  );
}
