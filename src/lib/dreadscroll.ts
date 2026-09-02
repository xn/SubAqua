import { abort, myAscensions, phpMtRand, phpRand, phpSeed, print, turnsPlayed } from "kolmafia";
import { get, set } from "libram";

import { args } from "../args";
import { bangPotionCriteriaKey } from "../resources/bangpotions";

type Rng = ReturnType<typeof phpSeed>;

const SEED_MIN = 1000000;
const SEED_MAX = 9999999;
const CACHE_MAX = 2000;
const SCANNED_EMPTY = "none";

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

export function calculateBangPotions(seed: number): string {
  return shuffled("scitdembh", phpSeed(seed), false);
}

export function calculateCondoOrder(seed: number): string {
  return shuffled("emdfbs", phpSeed(seed), false);
}

export function calculateDreadscroll(seed: number): number[] {
  const r = phpSeed(seed);
  const rv: number[] = [];
  for (let i = 0; i < 8; i++) rv.push(phpMtRand(r, 1, 4));
  return rv;
}

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
  clues: number[];
  seahorse: string;
  condo: string;
  bang: string;
};

function currentClues(): number[] {
  const clues: number[] = [];
  for (let i = 1; i <= 8; i++) clues.push(get(`dreadScroll${i}`, 0));
  return clues;
}

function playerCriteria(): Criteria {
  const clues = currentClues();

  let condo = "??????";
  const needs = get("leprecondoNeedOrder", "");
  if (needs !== "") {
    condo = "";
    for (const need of needs.split(",")) condo += need.charAt(0);
    while (condo.length < 6) condo += "?";
    if (!/^[emdfbs?]{6}$/.test(condo)) condo = "??????";
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

function constraintCount(c: Criteria): number {
  return (
    c.clues.filter((v) => v > 0).length +
    (c.seahorse !== "" ? 1 : 0) +
    c.condo.split("").filter((ch) => ch !== "?").length +
    c.bang.split("").filter((ch) => ch !== "?").length
  );
}

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

function setCandidatesPref(value: string): void {
  if (get("subaqua_seedCandidates", "") !== value) set("subaqua_seedCandidates", value);
}

function scanFloor(): number {
  const raw = get("subaqua_seedScanFloor", "");
  const [ascStr, countStr] = raw.split(":");
  if (parseInt(ascStr, 10) !== myAscensions()) return 0;
  return parseInt(countStr, 10) || 0;
}

function setScanFloor(count: number): void {
  set("subaqua_seedScanFloor", `${myAscensions()}:${count}`);
}

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

  if (c.seahorse === "") return undefined;
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

let memoKey: string | undefined;
let memoValue: number[] | undefined;

export function candidateSeeds(): number[] | undefined {
  if (!args.seedScan) return undefined;

  const key = `${turnsPlayed()}|${currentClues().join(",")}|${bangPotionCriteriaKey()}|${get("subaqua_seedCandidates", "")}`;
  if (key === memoKey) return memoValue;

  const result = computeCandidateSeeds();
  memoKey = key;
  memoValue = result;
  return result;
}

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

export function godRunGuardCheck(): void {
  if (!args.godRunGuard) return;
  if (turnsPlayed() > 17 || get("dreadScroll7", 0) !== 0) return;
  abort(
    "godRunGuard: on god-run pace (<= 17 turns) with dreadscroll clue 7 unknown. " +
      "Acquire a Mer-kin worktea and eat a sea sushi (the tea rides along and reveals the clue), then rerun.",
  );
}
