# Dreadscroll Resolver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve a multi-candidate dreadscroll seed by buying the cheapest splitting clue only while a wrong read would not fit the pre-Yog-Urt burn capacity, then reading with a seed-aware guess, with the catalog lane as the fallback.

**Architecture:** A pure module `src/lib/dreadguess.ts` (no kolmafia/libram imports, unit-tested with node:test) holds candidate filtering, unknown-clue math, burn math and guess selection. `src/lib/dreadscroll.ts` wraps it with mafia prefs and exposes `resolverState()`, `guessReady()`, `seedResolvable()`, `seedGuess()`. Burn capacity lives in `src/tasks/sorceress/burn.ts` (it needs the gym, skate and Mom quests) and is passed into the resolver. The Library quest is re-cut into Scroll → Knucklebone → Worktea Sushi → Catalog → High Priest. The 703 choice handler consults the cached candidates without ever scanning.

**Tech Stack:** TypeScript, grimoire-kolmafia tasks, libram, rollup build to KoLmafia, node:test via `node --import jiti/register` (jiti is already a devDependency; Node 24 on this machine).

**Spec:** `docs/superpowers/specs/2026-09-09-dreadscroll-resolver-design.md`

## Note on the spec's verification section

The spec asks for a standalone dry-run command. This plan covers the same logic with the
`node:test` suite in Task 1 (pure module) and a hand replay in Task 10; no extra bundle is built.

## Global Constraints

- No kolmafia or libram import in `src/lib/dreadguess.ts` or under `test/`; those modules throw outside KoLmafia.
- The 703 choice handler must never trigger a seed scan (the scan takes ~225 s). It reads `subaqua_seedCandidates` only.
- New args: `dreadGuess` (boolean, default true), `guessMax` (number, default 3), `burnMomFinish` (boolean, default false).
- Burn capacity constants from the spec: gym 5 while either guard is missing, skate 2 while the war is open, Mom Finish 2 only with `burnMomFinish`.
- Purchase tasks (Knucklebone, Worktea Sushi) never abort; they decline for the session and yield.
- The Colosseum is never a burn target.
- `yarn lint`, `yarn check`, `yarn build` clean after every task. Commit `src/`, `test/`, `package.json` only; leave `docs/` uncommitted (the user is holding docs on this branch).
- Commit messages end with the attribution lines the session provides.

---

### Task 1: Test harness and the pure guess module

**Files:**

- Create: `src/lib/dreadguess.ts`
- Create: `test/dreadguess.test.ts`
- Modify: `package.json` (the `test` script)

**Interfaces:**

- Produces:
  - `type Candidate = { seed: number; scroll: number[] }` (scroll is 8 digits, 1-4)
  - `parseGuesses(pref: string): { code: number[]; incorrect: number }[]`
  - `hamming(a: number[], b: number[]): number`
  - `filterByGuesses(cands: Candidate[], pref: string): Candidate[]`
  - `filterByClues(cands: Candidate[], clues: number[]): Candidate[]` (clues is 8 entries, 0 = unknown)
  - `agreedClues(cands: Candidate[]): number[]` (8 entries; the digit every candidate shares, else 0)
  - `unknownClues(cands: Candidate[], clues: number[]): number[]` (1-based positions still unknown after inference)
  - `splitsOn(cands: Candidate[], clue: number): boolean` (1-based clue)
  - `pickGuess(cands: Candidate[]): number[]`
  - `worstWrongWords(cands: Candidate[], guess: number[]): number`
  - `burnTurns(wrongWords: number): number` = `max(0, 3 * wrongWords - 1)`

- [ ] **Step 1: Add the test script**

In `package.json` replace the `test` line with:

```json
    "test": "node --import jiti/register --test \"test/**/*.test.ts\""
```

- [ ] **Step 2: Write the failing tests**

Create `test/dreadguess.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  agreedClues,
  burnTurns,
  Candidate,
  filterByClues,
  filterByGuesses,
  hamming,
  parseGuesses,
  pickGuess,
  splitsOn,
  unknownClues,
  worstWrongWords,
} from "../src/lib/dreadguess";

const A: Candidate = { seed: 2480686, scroll: [1, 2, 4, 1, 3, 1, 2, 1] };
const B: Candidate = { seed: 4967741, scroll: [4, 4, 4, 1, 3, 3, 3, 3] };
const C: Candidate = { seed: 9085813, scroll: [4, 4, 2, 1, 3, 3, 3, 1] };

test("parseGuesses reads mafia's code:incorrect list", () => {
  assert.deepEqual(parseGuesses(""), []);
  assert.deepEqual(parseGuesses("44413333:2"), [{ code: [4, 4, 4, 1, 3, 3, 3, 3], incorrect: 2 }]);
  assert.deepEqual(
    parseGuesses("11111111:8,44413333:0").map((g) => g.incorrect),
    [8, 0],
  );
});

test("hamming counts differing positions", () => {
  assert.equal(hamming(A.scroll, B.scroll), 6);
  assert.equal(hamming(B.scroll, C.scroll), 2);
});

test("filterByGuesses keeps candidates whose distance equals the recorded miss count", () => {
  const guessed = "12413121:6";
  assert.deepEqual(
    filterByGuesses([A, B, C], guessed).map((c) => c.seed),
    [B.seed],
  );
  assert.deepEqual(filterByGuesses([A, B, C], "").length, 3);
});

test("filterByClues drops candidates that contradict a known clue", () => {
  assert.deepEqual(
    filterByClues([A, B, C], [0, 0, 4, 0, 0, 0, 0, 0]).map((c) => c.seed),
    [A.seed, B.seed],
  );
});

test("agreedClues is the digit shared by every candidate, else 0", () => {
  assert.deepEqual(agreedClues([A, B]), [0, 0, 4, 1, 3, 0, 0, 0]);
  assert.deepEqual(agreedClues([B]), B.scroll);
  assert.deepEqual(agreedClues([]), [0, 0, 0, 0, 0, 0, 0, 0]);
});

test("unknownClues are the positions still 0 after inference", () => {
  assert.deepEqual(unknownClues([A, B], [0, 0, 4, 1, 3, 0, 0, 0]), [1, 2, 6, 7, 8]);
  assert.deepEqual(unknownClues([B], [0, 0, 0, 0, 0, 0, 0, 0]), []);
  assert.deepEqual(unknownClues([], [0, 0, 4, 0, 0, 0, 0, 0]), [1, 2, 4, 5, 6, 7, 8]);
});

test("splitsOn is true only where the candidates disagree", () => {
  assert.equal(splitsOn([A, B], 4), false);
  assert.equal(splitsOn([A, B], 7), true);
  assert.equal(splitsOn([B], 7), false);
});

test("pickGuess minimises expected wrong words and worstWrongWords bounds the miss", () => {
  const guess = pickGuess([B, C]);
  assert.ok([B.scroll, C.scroll].some((s) => s.join("") === guess.join("")));
  assert.equal(worstWrongWords([B, C], guess), 2);
  assert.equal(worstWrongWords([A, B], A.scroll), 6);
  assert.equal(worstWrongWords([B], B.scroll), 0);
});

test("burnTurns is 3 per wrong word minus the read's own tick", () => {
  assert.equal(burnTurns(0), 0);
  assert.equal(burnTurns(1), 2);
  assert.equal(burnTurns(5), 14);
});
```

Note on the fixtures: the guess `12413121` is A's scroll. B differs from A in positions 1,2,3,6,7,8 (6) and C in positions 1,2,3,6,7 (5), so a recorded `:6` keeps B only; B and C differ in positions 3 and 8 (2). Do not change the fixtures without re-deriving the distances.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `yarn test`
Expected: FAIL with a module-not-found error for `../src/lib/dreadguess`.

- [ ] **Step 4: Write the module**

Create `src/lib/dreadguess.ts`:

```ts
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
  let best = cands[0].scroll;
  let bestExpected = Number.POSITIVE_INFINITY;
  for (const cand of cands) {
    let expected = 0;
    for (let pos = 0; pos < 8; pos++) {
      const matches = cands.filter((c) => c.scroll[pos] === cand.scroll[pos]).length;
      expected += 1 - matches / cands.length;
    }
    if (expected < bestExpected) {
      bestExpected = expected;
      best = cand.scroll;
    }
  }
  return best;
}

export function worstWrongWords(cands: Candidate[], guess: number[]): number {
  let worst = 0;
  for (const c of cands) worst = Math.max(worst, hamming(c.scroll, guess));
  return worst;
}

export function burnTurns(wrongWords: number): number {
  return Math.max(0, 3 * wrongWords - 1);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn test`
Expected: `pass 9`, `fail 0`.

- [ ] **Step 6: Lint and type-check**

Run: `yarn lint && yarn check`
Expected: no errors. If prettier complains about the test file, run `yarn format` and re-run.

- [ ] **Step 7: Commit**

```bash
git add package.json src/lib/dreadguess.ts test/dreadguess.test.ts
git commit -m "dreadscroll: pure guess module (candidate filters, burn math, guess pick) + node:test harness"
```

---

### Task 2: Args and the mafia-bound resolver

**Files:**

- Modify: `src/args.ts` (after the `seedScan` arg)
- Modify: `src/lib/dreadscroll.ts` (imports; `candidateSeeds`; new exports at the end)

**Interfaces:**

- Consumes: everything from `src/lib/dreadguess.ts` (Task 1).
- Produces, all in `src/lib/dreadscroll.ts`:
  - `cachedCandidates(): Candidate[] | undefined` — never scans; reads `subaqua_seedCandidates` for this ascension, applies clue and guess filters.
  - `candidates(): Candidate[] | undefined` — scan-capable (`candidateSeeds()` mapped to scrolls, guess-filtered).
  - `type ResolverState = { count: number; unknown: number[]; guess: number[]; worstBurn: number }`
  - `resolverState(): ResolverState | undefined` (undefined when no candidates are known)
  - `purchasableSplits(): number[]` — subset of `[4, 7]` that split the candidates.
  - `guessReady(capacity: number): boolean`
  - `seedResolvable(capacity: number): boolean`
  - `seedGuess(): string | undefined` — 8-digit code from the cache, for the choice handler.
  - `args.dreadGuess`, `args.guessMax`, `args.burnMomFinish`.

- [ ] **Step 1: Add the args**

In `src/args.ts`, directly after the `seedScan` block, add:

```ts
    dreadGuess: Args.boolean({
      help: "Read the dreadscroll with a seed-aware guess when the scan leaves at most guessMax candidates; dreadGuess=false farms catalog cards instead (spec 2026-09-09).",
      default: true,
      setting: "",
    }),
    guessMax: Args.number({
      help: "Most candidate seeds the dreadscroll guess lane will read through; above this the catalog lane runs.",
      default: 3,
      setting: "",
    }),
    burnMomFinish: Args.boolean({
      help: "Let a Deep-Tainted Mind burn spend turns on Mom Finish (Peanut is a spell kill and the effect halves Mysticality).",
      default: false,
      setting: "",
    }),
```

- [ ] **Step 2: Make candidateSeeds honour recorded guesses**

In `src/lib/dreadscroll.ts` change the imports to:

```ts
import { abort, myAscensions, phpMtRand, phpRand, phpSeed, print, turnsPlayed } from "kolmafia";
import { get, set } from "libram";

import { args } from "../args";
import { bangPotionCriteriaKey } from "../resources/bangpotions";

import {
  burnTurns,
  Candidate,
  filterByClues,
  filterByGuesses,
  pickGuess,
  splitsOn,
  unknownClues,
  worstWrongWords,
} from "./dreadguess";
```

Replace the body of `candidateSeeds()` so the memo key includes the guess pref and the result is guess-filtered:

```ts
export function candidateSeeds(): number[] | undefined {
  if (!args.seedScan) return undefined;

  const key = `${turnsPlayed()}|${currentClues().join(",")}|${bangPotionCriteriaKey()}|${get("subaqua_seedCandidates", "")}|${get("dreadScrollGuesses", "")}`;
  if (key === memoKey) return memoValue;

  const raw = computeCandidateSeeds();
  const result =
    raw === undefined
      ? undefined
      : filterByGuesses(raw.map(toCandidate), get("dreadScrollGuesses", "")).map((c) => c.seed);
  memoKey = key;
  memoValue = result;
  return result;
}
```

Add, above `candidateSeeds`, the helper:

```ts
function toCandidate(seed: number): Candidate {
  return { seed, scroll: calculateDreadscroll(seed) };
}
```

- [ ] **Step 3: Add the resolver exports**

Append to the end of `src/lib/dreadscroll.ts`:

```ts
export function cachedCandidates(): Candidate[] | undefined {
  if (get("subaqua_seedCandidatesAsc", -1) !== myAscensions()) return undefined;
  const cached = get("subaqua_seedCandidates", "");
  if (cached === "" || cached === SCANNED_EMPTY) return undefined;
  const seeds = cached
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((seed) => Number.isFinite(seed) && seed >= SEED_MIN && seed <= SEED_MAX);
  const cands = filterByGuesses(
    filterByClues(seeds.map(toCandidate), currentClues()),
    get("dreadScrollGuesses", ""),
  );
  return cands.length === 0 ? undefined : cands;
}

export function candidates(): Candidate[] | undefined {
  const seeds = candidateSeeds();
  if (seeds === undefined || seeds.length === 0) return undefined;
  return seeds.map(toCandidate);
}

export type ResolverState = {
  count: number;
  unknown: number[];
  guess: number[];
  worstBurn: number;
};

function stateOf(cands: Candidate[]): ResolverState {
  const guess = pickGuess(cands);
  return {
    count: cands.length,
    unknown: unknownClues(cands, currentClues()),
    guess,
    worstBurn: burnTurns(worstWrongWords(cands, guess)),
  };
}

export function resolverState(): ResolverState | undefined {
  const cands = candidates();
  return cands === undefined ? undefined : stateOf(cands);
}

export function purchasableSplits(): number[] {
  const cands = candidates();
  if (cands === undefined) return [];
  return [4, 7].filter((clue) => splitsOn(cands, clue));
}

export function guessReady(capacity: number): boolean {
  if (!args.dreadGuess) return false;
  const state = resolverState();
  if (state === undefined || state.count === 0 || state.count > args.guessMax) return false;
  return state.worstBurn <= capacity || purchasableSplits().length === 0;
}

function afterPurchases(cands: Candidate[]): Candidate[] {
  const clues = currentClues().slice();
  for (const clue of [4, 7]) {
    if (splitsOn(cands, clue)) clues[clue - 1] = cands[0].scroll[clue - 1];
  }
  return filterByClues(cands, clues);
}

export function seedResolvable(capacity: number): boolean {
  if (isKnucklebonesAndSushiEnough()) return true;
  if (!args.dreadGuess) return false;
  const cands = candidates();
  if (cands === undefined || cands.length === 0) return false;
  const state = stateOf(afterPurchases(cands));
  return state.count <= args.guessMax && state.worstBurn <= capacity;
}

export function seedGuess(): string | undefined {
  const cands = cachedCandidates();
  if (cands === undefined) return undefined;
  const state = stateOf(cands);
  print(
    `Dreadscroll guess: ${state.count} candidate seed(s), unknown clues [${state.unknown.join(",")}], worst burn ${state.worstBurn}.`,
    "blue",
  );
  return state.guess.join("");
}
```

Notes for the implementer:

- `afterPurchases` models "buy every purchasable splitting clue": it pins clues 4 and 7 to the first candidate's digits, which is what learning them would do for that seed; the resulting count is the count on the branch the truth happens to be, and every branch has the same or fewer candidates, so this is the optimistic-by-one-seed check the spec asks for.
- `seedResolvable` keeps `isKnucklebonesAndSushiEnough()` as the first branch, exactly as the spec's section 1 says.

- [ ] **Step 4: Type-check, lint, build**

Run: `yarn check && yarn lint && yarn build`
Expected: clean. If eslint's import sorter reorders the new import block, accept its order.

- [ ] **Step 5: Commit**

```bash
git add src/args.ts src/lib/dreadscroll.ts
git commit -m "dreadscroll: resolver state, guess-aware candidates, dreadGuess/guessMax/burnMomFinish args"
```

---

### Task 3: Burn capacity, burn order, and the Library sink

**Files:**

- Modify: `src/tasks/monkees/mom.ts:80` (export a pending check)
- Modify: `src/tasks/sorceress/burn.ts` (whole file)

**Interfaces:**

- Consumes: `gymnasiumTurn`, `gladiatorGearStep` from `./gym`; `claimIceBuff`, `skateParkTurn`, `skateWarOpen` from `./skatepark`; `momFinishPending` (new, below); `killMacro` from `../../engine/combat`; `sneakFamiliar`, `ensureHelperBreathing`, `requiredFamiliarBreather`, `seaKeyword` from `../../engine/outfit`; `applyEffects`, `sneakEffects` from `../../lib/moods`; `recover` from `../../lib`; `useFamiliar` from `kolmafia`.
- Produces:
  - `momFinishPending(): boolean` in `src/tasks/monkees/mom.ts`
  - `burnCapacity(): number` in `burn.ts`
  - `burnTurnElsewhere(): boolean` keeps its name and return contract; new order.
  - `libraryBurnTurn(): void` in `burn.ts`

- [ ] **Step 1: Export the Mom Finish pending check**

In `src/tasks/monkees/mom.ts`, directly after the `momDone` function (line 80), add:

```ts
export function momFinishPending(): boolean {
  return have(glass) && !momDone();
}
```

`glass` and `have` are already in scope in that file.

- [ ] **Step 2: Rewrite burn.ts**

Replace the whole of `src/tasks/sorceress/burn.ts` with:

```ts
import { adv1, availableAmount, equip, maximize, useFamiliar } from "kolmafia";
import { $item, $location, $slot, get, have } from "libram";

import { args } from "../../args";
import { killMacro } from "../../engine/combat";
import {
  ensureHelperBreathing,
  requiredFamiliarBreather,
  seaKeyword,
  sneakFamiliar,
} from "../../engine/outfit";
import { recover } from "../../lib";
import { applyEffects, sneakEffects } from "../../lib/moods";
import { momFinishPending } from "../monkees/mom";

import { gladiatorGearStep, gymnasiumTurn } from "./gym";
import { claimIceBuff, skateParkTurn, skateWarOpen } from "./skatepark";

const headguard = $item`Mer-kin headguard`;
const thighguard = $item`Mer-kin thighguard`;
const library = $location`Mer-kin Library`;
const scholarPieces = [$item`Mer-kin scholar mask`, $item`Mer-kin scholar tailpiece`];

function guardsMissing(): boolean {
  return availableAmount(headguard) === 0 || availableAmount(thighguard) === 0;
}

export function burnCapacity(): number {
  let turns = 0;
  if (guardsMissing()) turns += 5;
  if (skateWarOpen()) turns += 2;
  if (args.burnMomFinish && momFinishPending()) turns += 2;
  return turns;
}

export function libraryBurnTurn(): void {
  applyEffects(sneakEffects(), "Library burn");
  const familiar = sneakFamiliar();
  if (familiar) useFamiliar(familiar);
  const terms = [
    "-combat",
    "-equip Peridot of Peril",
    "-equip bat wings",
    ...scholarPieces.filter((it) => have(it)).map((it) => `+equip ${it.name}`),
  ];
  const famBreather = requiredFamiliarBreather();
  if (famBreather !== $item.none) terms.push(`+equip ${famBreather.name}`);
  const sea = seaKeyword();
  if (sea.length === 0 || !maximize([...terms, ...sea].join(", "), false)) {
    maximize(terms.join(", "), false);
  }
  if (famBreather !== $item.none) equip($slot`familiar`, famBreather);
  ensureHelperBreathing("the Mer-kin Library");
  recover();
  adv1(library, -1, () => killMacro(false).toString());
}

export function burnTurnElsewhere(): boolean {
  if (skateWarOpen()) {
    skateParkTurn();
    return true;
  }
  const gearReady =
    availableAmount($item`Mer-kin gladiator mask`) > 0 &&
    availableAmount($item`Mer-kin gladiator tailpiece`) > 0;
  if (!gearReady && !get("noncombatForcerActive")) {
    if (get("yogUrtDefeated")) gladiatorGearStep();
    else gymnasiumTurn();
    claimIceBuff();
    return true;
  }
  if (!get("isMerkinHighPriest", false)) {
    libraryBurnTurn();
    return true;
  }
  return false;
}
```

Mom Finish is not called from this helper. Its `Abyss Finish` task (`src/tasks/monkees/mom.ts:265`) needs the engine's outfit, Peridot, combat and prepare hooks, which a bare function call would skip. When `burnMomFinish` is on, Task 5 makes `High Priest` not ready while the effect is up and Mom Finish is pending, so grimoire walks the runplan and runs `Skate Park/War Resolution` (if open) and then `Mom Finish/Abyss Finish` with their full machinery. The gym stays a manual target here because `Gladiator Gear/Guard Grind` is gated on Yog-Urt in the runplan. `momFinishPending` is still exported for Task 5 and for `burnCapacity()`.

The previous last branch, a Colosseum round while gear is ready and the round count is below 15, is deliberately gone: the Colosseum needs gladiator gear, which needs the scholar trade-back, which needs Yog-Urt, and the effect halves Mysticality. Gummiheart Burn used that branch too; with Yog-Urt still undefeated at that point the gear cannot be ready, so nothing is lost.

- [ ] **Step 3: Type-check, lint, build**

Run: `yarn check && yarn lint && yarn build`
Expected: clean once the `abyssFinishTurn` import resolves per the note above.

- [ ] **Step 4: Commit**

```bash
git add src/tasks/monkees/mom.ts src/tasks/sorceress/burn.ts
git commit -m "burn: pre-Yog-Urt capacity; burn order skate > gym > Library sink; Colosseum never"
```

---

### Task 4: eatSushi confirms the eat

**Files:**

- Modify: `src/resources/fishy.ts:44-57`

**Interfaces:**

- Produces: `eatSushi(): boolean` returns true only when fullness rose.

- [ ] **Step 1: Replace the function**

```ts
export function eatSushi(): boolean {
  if (!get("hasSushiMat")) return false;
  if (!have($item`white rice`)) {
    retrieveItem($item`white rice`, 1);
  }
  cliExecute("refresh inventory");
  for (const [sushi, meat] of nigiris) {
    if (availableAmount(meat) > 0 && availableAmount($item`white rice`) > 0) {
      const before = myFullness();
      cliExecute(`make ${sushi}`);
      if (myFullness() > before) return true;
    }
  }
  return false;
}
```

`myFullness` is already imported in that file.

- [ ] **Step 2: Type-check, lint, build, commit**

Run: `yarn check && yarn lint && yarn build`

```bash
git add src/resources/fishy.ts
git commit -m "fishy: eatSushi reports success on a fullness increase, not on Fishy being up"
```

---

### Task 5: Library quest re-cut

**Files:**

- Modify: `src/tasks/sorceress/library.ts` (whole file)

**Interfaces:**

- Consumes: `guessReady`, `purchasableSplits`, `resolverState`, `godRunGuardCheck` from `../../lib/dreadscroll`; `burnCapacity`, `burnTurnElsewhere` from `./burn`; `momFinishPending` from `../monkees/mom`; `args` from `../../args`; `eatSushi` from `../../resources/fishy`; pulls API as before.
- Produces: `libraryQuest(): Quest` with tasks `Library Scroll Force`, `Library Scroll Farm`, `Knucklebone`, `Worktea Sushi`, `Library Catalog`, `High Priest`. Sets `_subaqua_dreadBurn` (number of turns burned under Deep-Tainted Mind) for Task 8.

- [ ] **Step 1: Replace the file**

```ts
import { OutfitSpec } from "grimoire-kolmafia";
import {
  availableAmount,
  Effect,
  fullnessLimit,
  itemAmount,
  myAdventures,
  myFullness,
  retrieveItem,
  use,
} from "kolmafia";
import { $effect, $item, $location, $monster, get, have, set } from "libram";

import { args } from "../../args";
import { CombatStrategy } from "../../engine/combat";
import { kramcoIfDue, sneakFamiliar } from "../../engine/outfit";
import { Quest, Task } from "../../engine/task";
import { recover } from "../../lib";
import {
  godRunGuardCheck,
  guessReady,
  purchasableSplits,
  resolverState,
} from "../../lib/dreadscroll";
import { itemDropEffects, sneakEffects } from "../../lib/moods";
import { eatSushi } from "../../resources/fishy";
import { pullBudgetAllows, pulledToday, pullSequence } from "../../resources/pulls";
import { forceGranted } from "../../resources/saber";
import { momFinishPending } from "../monkees/mom";

import { burnCapacity, burnTurnElsewhere } from "./burn";
import { sourceEnhanceItems } from "./daily";

const library = $location`Mer-kin Library`;
const dreadscroll = $item`Mer-kin dreadscroll`;
const researcher = $monster`Mer-kin researcher`;
const scholarPieces = [$item`Mer-kin scholar mask`, $item`Mer-kin scholar tailpiece`];
const worktea = $item`Mer-kin worktea`;
const knucklebone = $item`Mer-kin knucklebone`;
const healscroll = $item`Mer-kin healscroll`;
const killscroll = $item`Mer-kin killscroll`;
const zirconia = $item`blood cubic zirconia`;
const monodent = $item`Monodent of the Sea`;
const tainted = $effect`Deep-Tainted Mind`;

const BURN_PREF = "_subaqua_dreadBurn";

let knuckleboneDeclined = false;
let sushiDeclined = false;

function catalogCluesKnown(): boolean {
  return [1, 6, 8].every((n) => get(`dreadScroll${n}`, 0) !== 0);
}

function scholarGearReady(): boolean {
  return scholarPieces.every((piece) => have(piece));
}

function researcherForceWanted(): boolean {
  return itemAmount(killscroll) === 0 || itemAmount(healscroll) === 0;
}

function bczWanted(): boolean {
  return (
    itemAmount(healscroll) < 2 ||
    (itemAmount(worktea) === 0 && get("dreadScroll7", 0) === 0) ||
    (itemAmount(knucklebone) === 0 && get("dreadScroll7", 0) === 0) ||
    (itemAmount(killscroll) === 0 && get("dreadScroll5", 0) === 0)
  );
}

function scrollOwned(): boolean {
  return availableAmount(dreadscroll) > 0;
}

function readReady(): boolean {
  return scrollOwned() && (catalogCluesKnown() || guessReady(burnCapacity()));
}

function burnFits(): boolean {
  const state = resolverState();
  return state !== undefined && state.worstBurn <= burnCapacity();
}

function purchaseWanted(clue: number): boolean {
  if (!scrollOwned() || get(`dreadScroll${clue}`, 0) !== 0) return false;
  if (resolverState() === undefined) return true;
  if (!purchasableSplits().includes(clue)) return false;
  return !burnFits() || !readReady();
}

function momFinishBurning(): boolean {
  return args.burnMomFinish && have(tainted) && momFinishPending();
}

function scrollOutfit(): OutfitSpec {
  const scrollsMissing =
    itemAmount(killscroll) === 0 ||
    itemAmount(healscroll) === 0 ||
    itemAmount(worktea) === 0 ||
    itemAmount(knucklebone) === 0;
  const saberForResearcher =
    scrollsMissing && forceGranted("researcher") && have($item`Fourth of May Cosplay Saber`);
  const weapon = !saberForResearcher && scrollsMissing && have(monodent) ? [monodent] : [];
  const accessory = bczWanted() ? [zirconia] : [];
  const avoid = bczWanted() ? [] : [zirconia];
  return {
    modifier: "item",
    equip: [...scholarPieces, ...weapon, ...accessory, ...kramcoIfDue()],
    avoid,
  };
}

function catalogOutfit(): OutfitSpec {
  const accessory = bczWanted() ? [zirconia] : [];
  const avoid = bczWanted() ? [] : [zirconia];
  return {
    modifier: "-combat",
    equip: [...scholarPieces, ...accessory],
    avoid,
    familiar: sneakFamiliar(),
  };
}

function farmPrepare(): void {
  sourceEnhanceItems();
  recover();
}

function scrollTask(force: boolean): Task {
  return {
    name: force ? "Library Scroll Force" : "Library Scroll Farm",
    ready: () => scholarGearReady() && researcherForceWanted() === force,
    completed: scrollOwned,
    prepare: farmPrepare,
    do: library,
    backup: { targets: "free" },
    ...(force ? { saberPurpose: "researcher" as const } : {}),
    combat: force
      ? new CombatStrategy().forceItems(researcher).kill()
      : new CombatStrategy().kill(),
    outfit: scrollOutfit,
    effects: (): Effect[] => itemDropEffects(),
    limit: {
      soft: 30,
      message: `Library is not yielding the dreadscroll (${force ? "scroll-Force" : "plain"} lane).`,
    },
  };
}

export function libraryQuest(): Quest {
  return {
    name: "Library",
    completed: () => get("isMerkinHighPriest", false),
    tasks: [
      scrollTask(true),
      scrollTask(false),
      {
        name: "Knucklebone",
        ready: () => !knuckleboneDeclined && purchaseWanted(4),
        completed: () => knuckleboneDeclined || get("dreadScroll4", 0) !== 0,
        do: (): void => {
          if (
            itemAmount(knucklebone) === 0 &&
            !pulledToday(knucklebone) &&
            pullBudgetAllows(knucklebone)
          ) {
            pullSequence(knucklebone);
          }
          if (itemAmount(knucklebone) === 0) {
            knuckleboneDeclined = true;
            return;
          }
          use(knucklebone);
        },
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        name: "Worktea Sushi",
        ready: () => !sushiDeclined && purchaseWanted(7) && get("merkinVocabularyMastery", 0) < 90,
        completed: () =>
          sushiDeclined || get("dreadScroll7", 0) !== 0 || get("merkinVocabularyMastery", 0) >= 90,
        do: (): void => {
          if (itemAmount(worktea) === 0 && !pulledToday(worktea) && pullBudgetAllows(worktea)) {
            pullSequence(worktea);
          }
          if (itemAmount(worktea) === 0 || fullnessLimit() - myFullness() < 2) {
            sushiDeclined = true;
            return;
          }
          retrieveItem($item`white rice`);
          if (!eatSushi()) sushiDeclined = true;
        },
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        name: "Library Catalog",
        ready: () => scholarGearReady() && scrollOwned() && !readReady(),
        completed: readReady,
        prepare: farmPrepare,
        do: library,
        backup: { targets: "free" },
        combat: new CombatStrategy().kill(),
        outfit: catalogOutfit,
        effects: (): Effect[] => sneakEffects(),
        limit: {
          soft: 30,
          message:
            "Library catalog cards are not yielding clues 1/6/8 and the seed will not guess.",
        },
      },
      {
        name: "High Priest",
        ready: () => readReady() && !momFinishBurning(),
        completed: () => get("isMerkinHighPriest", false),
        do: (): void => {
          if (have(tainted)) {
            const before = myAdventures();
            if (!burnTurnElsewhere()) {
              throw "Deep-Tainted Mind is up and no burn target is left (skate war, gym guards, Mom Finish, Library). Spend 1 non-free turn anywhere and rerun.";
            }
            if (myAdventures() < before) set(BURN_PREF, get(BURN_PREF, 0) + 1);
            return;
          }
          godRunGuardCheck();
          use(dreadscroll);
        },
        underwater: true,
        limit: {
          soft: 40,
          message: "Not becoming High Priest; check dreadScroll* prefs and the 703 solver.",
        },
      },
    ],
  };
}
```

Behaviour notes the implementer should keep in mind:

- The clue-throw macro is gone from both scroll tasks per the spec: clues 2 and 5 need the studied language.
- `purchaseWanted` fires while the burn does not fit **or** the guess lane cannot read (count above `guessMax`, or `dreadGuess=false`). With the lane off, every splitting purchase still runs before the catalog, which is the ash order.
- `Library Catalog` is ready only when `readReady()` is false, so once a purchase or a catalog clue makes the guess fit, the read happens next.
- The decline flags reset per script invocation, which matches a rerun after the user fixes supplies.
- `High Priest` throws the same message shape as the previous abort but through `throw`, so the engine's ledger print runs.
- With no seed knowledge at all (`resolverState()` undefined: scan off, overflowed, or zero candidates) `purchaseWanted` is true for any unknown clue, which is the ash order: knucklebone and sushi before the catalog, so the read never has to brute-force clues 4 and 7.
- With `burnMomFinish` on, `momFinishBurning()` takes `High Priest` out of the ready set while the effect is up, and grimoire's runplan order then runs `Skate Park/War Resolution` and `Mom Finish/Abyss Finish` with their own outfit and combat hooks. Those turns are not counted in `_subaqua_dreadBurn`; the gold guard allowance in Task 8 covers only the manual burn, which is fine because Mom Finish moving earlier only makes its own group finish sooner.

- [ ] **Step 2: Type-check, lint, build**

Run: `yarn check && yarn lint && yarn build`
Expected: clean. `abort` is no longer imported; `Macro` is no longer imported.

- [ ] **Step 3: Commit**

```bash
git add src/tasks/sorceress/library.ts
git commit -m "library: scroll > knucklebone > sushi > catalog > read; purchases only while the burn does not fit; no clue throws"
```

---

### Task 6: Seed-aware 703 handler

**Files:**

- Modify: `src/standalone/choice.ts:170-174` and `getDreadscrollGuess` (line ~258)

**Interfaces:**

- Consumes: `seedGuess()` from `../lib/dreadscroll` (Task 2).

- [ ] **Step 1: Import and use the seed guess**

Add to the imports of `src/standalone/choice.ts`:

```ts
import { seedGuess } from "../lib/dreadscroll";
```

Change the 703 branch to:

```ts
  } else if (choice === 703) {
    const bestGuess = seedGuess() ?? getDreadscrollGuess();
    const extra = `pro1=${bestGuess[0]}&pro2=${bestGuess[1]}&pro3=${bestGuess[2]}&pro4=${bestGuess[3]}&pro5=${bestGuess[4]}&pro6=${bestGuess[5]}&pro7=${bestGuess[6]}&pro8=${bestGuess[7]}`;
    runChoice(1, extra);
```

`getDreadscrollGuess()` stays unchanged as the fallback for accounts with no cached candidates.

- [ ] **Step 2: Confirm the standalone bundle never scans**

`seedGuess()` calls only `cachedCandidates()`, which reads prefs. Grep to prove no scan path is reachable from the standalone:

Run: `grep -n "computeCandidateSeeds\|candidateSeeds()" src/lib/dreadscroll.ts`
Expected: `computeCandidateSeeds` is called only inside `candidateSeeds()`, and `candidateSeeds()` is called only by `candidates()`, `dreadSeedCheck()`, `isKnucklebonesAndSushiEnough()`. None of those is referenced from `src/standalone/choice.ts`.

- [ ] **Step 3: Build and check the bundle size did not balloon**

Run: `yarn check && yarn lint && yarn build && ls -la dist/KoLmafia/scripts/subaqua/`
Expected: `subaqua_choice.js` builds; it is fine for it to grow by the dreadscroll module.

- [ ] **Step 4: Commit**

```bash
git add src/standalone/choice.ts
git commit -m "choice 703: read the cached candidate seeds before enumerating codes"
```

---

### Task 7: School keys on seedResolvable

**Files:**

- Modify: `src/tasks/sorceress/school.ts:31,69,108,127,140`

**Interfaces:**

- Consumes: `seedResolvable(capacity)` from `../../lib/dreadscroll`, `burnCapacity()` from `./burn`.

- [ ] **Step 1: Swap the predicate**

Replace the import on line 31 with:

```ts
import { seedResolvable } from "../../lib/dreadscroll";
```

Add after the `sourceEnhanceItems` import:

```ts
import { burnCapacity } from "./burn";
```

Add a local helper below `deepcityOpen()`:

```ts
function resolvable(): boolean {
  return seedResolvable(burnCapacity());
}
```

Then replace every `isKnucklebonesAndSushiEnough()` in the file with `resolvable()` (four call sites: `vocabularyDone`, `School Unlocks` completed, `Use Wordquiz` ready, `Farm School` ready).

- [ ] **Step 2: Type-check, lint, build, commit**

Run: `yarn check && yarn lint && yarn build`

```bash
git add src/tasks/sorceress/school.ts
git commit -m "school: skip vocabulary when the seed is resolvable by purchase or guess"
```

---

### Task 8: Pace guard floats Library and Yog-Urt by the burn

**Files:**

- Modify: `src/lib/gold.ts` (`assertOnGoldPace`)

**Interfaces:**

- Consumes: pref `_subaqua_dreadBurn` written by Task 5.

- [ ] **Step 1: Add the burn allowance**

In `assertOnGoldPace`, replace

```ts
const limit = checkpoint + GUARD_TOLERANCE + sessionDrift + args.goldSlack;
```

with

```ts
const group = groupOf(taskName);
const burn = group === "Library" || group === "Yog-Urt" ? get("_subaqua_dreadBurn", 0) : 0;
const limit = checkpoint + GUARD_TOLERANCE + sessionDrift + args.goldSlack + burn;
```

and extend the thrown message's parenthetical so it reads `(tolerance ${GUARD_TOLERANCE} + slack ${args.goldSlack}${burn ? ` + ${burn} dreadscroll burn` : ""}${sessionDrift ? ...` — keep the rest of the string as is.

The gym, skate and Mom Finish groups can only finish earlier under a burn, so they need no allowance.

- [ ] **Step 2: Type-check, lint, build, commit**

```bash
git add src/lib/gold.ts
git commit -m "gold guard: Library and Yog-Urt float by the Deep-Tainted burn turns"
```

---

### Task 9: Sim row for the seed pin

**Files:**

- Modify: `src/sim.ts` (next to the Leprecondo row, ~line 637)

**Interfaces:**

- Consumes: `policyForTier(tier).allowDiscretionaryPulls`, `bangPotionCriteriaKey()` from `./resources/bangpotions`.

- [ ] **Step 1: Add the row**

Import `bangPotionCriteriaKey` from `./resources/bangpotions` (add to the existing import list at the top of `sim.ts`). Directly before the `if (ownItem($item\`Leprecondo\`))` block, add:

```ts
{
  const potionsKnown = !bangPotionCriteriaKey().includes("?");
  const boxPulls = policyForTier(tier).allowDiscretionaryPulls;
  rows.push({
    thing: new Hardcoded(
      potionsKnown || boxPulls,
      "seed pin: bang potions identified or the blessed large box pulls allowed at this tier",
      potionsKnown || boxPulls
        ? ""
        : " (the Library will farm catalog cards instead of guessing; about 5 extra turns when it triggers)",
    ),
    why: "The dreadscroll seed scan pins on the nine bang potions plus the seahorse name; without them the guess lane is off",
    recommended: true,
  });
}
```

- [ ] **Step 2: Type-check, lint, build, and run the sim**

Run: `yarn check && yarn lint && yarn build && yarn mafia`
Then in the KoLmafia gCLI: `subaqua sim`
Expected: the new row prints as a recommended item with the correct state for this account (potions are identified in-run only, so out of run it reads from the tier policy).

- [ ] **Step 3: Commit**

```bash
git add src/sim.ts
git commit -m "sim: seed-pin row (bang potion box pulls) for the dreadscroll guess lane"
```

---

### Task 10: Replay check and deploy

**Files:** none modified.

- [ ] **Step 1: Replay the 2026-09-09 case against the code by hand**

Walk `src/tasks/sorceress/library.ts` with these facts from the log (ascension at line 104499 of `chartreusenator_20260909.txt`): candidates `2480686,4967741` after Deep Dark Visions; clues 3,4,5 inferred; scroll drops at turn 17; worktea drops in the first free fight at 18; no knucklebone; fullness 0 of 15; guards missing; skate war open.

Expected trace:

1. `Library Scroll Farm` completes at the drop.
2. `Knucklebone`: `purchaseWanted(4)` is false because clue 4 does not split. Not ready.
3. `Worktea Sushi`: clue 7 splits; `burnFits()` is false (unknown 1,2,6,7,8 → worst burn 14 > capacity 7); worktea in hand after the free fight; eats. Clue 7 lands; `dreadSeedCheck()` in the engine post infers the rest; one candidate remains.
4. `readReady()` true; `High Priest` reads at 18.

Write the trace into the task's completion report.

- [ ] **Step 2: Full verification**

Run: `yarn test && yarn lint && yarn check && yarn build`
Expected: all clean.

- [ ] **Step 3: Deploy**

Run: `yarn mafia`
Expected: the three bundles copy into the KoLmafia scripts and relay directories.

- [ ] **Step 4: Report**

State plainly: tests pass, lint/check/build clean, deployed, not live-verified (needs a run whose scan leaves more than one candidate). Do not commit `docs/`.
