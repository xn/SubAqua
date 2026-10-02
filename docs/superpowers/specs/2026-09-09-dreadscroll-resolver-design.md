# Dreadscroll resolver: buy clues, then guess

Date: 2026-09-09. Branch: `sim-audit-0906`. Approved in chat by the user; decisions recorded
inline. Spill policy chosen by the user: **buy clues first**.

## Goal

The 2026-09-09 run stopped at turncount 23 on the gold guard. The dreadscroll dropped at turn 17,
the same as gold, but the seed scan had left two candidate seeds, and the Library quest resolved
them by farming five paid Catalog Card non-combats. The two candidates differed on clue 7, which
a nigiri eaten with the worktea in hand would have revealed at turn 18 for no turns. The sushi
task sits behind the catalog farm in `src/tasks/sorceress/library.ts`, so it never ran, and a
dolphin stole the tea mid-lane. Full diagnosis in memory `run-analysis-2026-09-09`.

Under the user's exchange rates nothing here is free:

| resource                           | cost                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 2 fullness (one nigiri)            | 4 to 12 aftercore adventures                                                                                                                   |
| 1 spleen (fish sauce)              | 4 aftercore adventures                                                                                                                         |
| a pull slot (knucklebone, worktea) | one of 20, every route pull counted                                                                                                            |
| a Catalog Card visit               | 1 run turn each; one of 13 books opens per visit, 3 hold clues 1/6/8; ~7 visits to reach one specific clue book, ~3.5 if any clue book will do |
| a wrong dreadscroll read           | 1 run turn + Deep-Tainted Mind burn                                                                                                            |

This spec replaces the Library's resolver with a cost-ordered one and adds a seed-aware guess
lane. It does not change how the seed scan finds candidates.

## Facts the design rests on

Verified 2026-09-09 against the session log, the wiki, mafia's coinmaster data, and
`UnderTheSea.ash`.

- **Clue sources** (wiki, Mer-kin dreadscroll): catalog cards give clues 1, 6, 8; the killscroll
  in combat gives 5 and the healscroll in combat gives 2, but only once the Mer-kin language is
  studied, which this route skips; the knucklebone gives 4; Deep Dark Visions gives 3; any sushi
  eaten with a worktea in inventory gives 7.
- **Inference**: `dreadSeedCheck()` sets a clue only when every candidate agrees on it. With two
  candidates, every clue still unknown is one they disagree on, so the unknown count k is the
  number of words a wrong read gets wrong.
- **Deep-Tainted Mind** (wiki): 3 turns per wrong word, noremove, blocks the read, -50%
  Mysticality, ticks only on paid adventures. The read itself costs 1 turn whether it succeeds
  or fails. Mafia records each failed read in `dreadScrollGuesses` as `code:incorrect`.
- **Yog-Urt ordering** (trace 2026-09-09):
  - Yog-Urt needs High Priest, the scholar gear worn (`yogurt.ts` outfit), the prep pulls, and
    the Gummiheart wait, which already burns turns through `burnTurnElsewhere()`.
  - Gladiator gear is bought at Grandma rows 126/127 for a crappy mask plus headguard and a
    crappy tailpiece plus thighguard. The crappy pieces are unpullable
    (`docs/unpullable-items.txt`) and were consumed making the scholar gear; `gladiatorGearStep`
    recovers them by trading the scholar gear back at rows 131/1619. That is why gladiator gear,
    the Colosseum, and Shub wait for Yog-Urt. It is a real dependency.
  - The Colosseum runs on spell damage and Mysticality (`colosseum.ts:94`), so it is unusable
    under the effect even if it were reachable.
  - Not gated on Yog-Urt: the gym guard grind (the `yogUrtDefeated` gate at `gym.ts:100` is
    route order; fights are free runs on a combat-rate outfit), the skate war, and Mom Finish
    (ready on the black glass only; Peanut is a spell-kill boss, so Mysticality-sensitive).
  - Gold spends 7 paid turns in gym plus skate before the Colosseum and 2 in Mom Finish.
- **Seed criteria by account**: seahorse name (path, always); bang potions from a blessed large
  box (large box plus ten-leaf clover, two discretionary pulls, no item of the month); Leprecondo
  need order (item of the month, a tightener); Deep Dark Visions (permed skill). Potions plus name
  usually pins to one seed. Without the potions the scan does not pin and the resolver falls back
  to today's lanes.

## Design

### 1. Resolver state, in `src/lib/dreadscroll.ts`

One module answers every "can we read yet" question. It exposes:

- `candidateSeeds()` as today, plus a filter by recorded guesses: a candidate survives a
  recorded guess `code:n` only if its scroll differs from `code` in exactly n positions. This
  keeps the seed list and the 703 handler's code list in agreement.
- `unknownClues()`: the clue positions still 0 after inference. With candidates known this is
  the disagreement set.
- `splitsOn(clue)`: true when the candidates disagree on that clue, so learning it partitions
  them.
- `worstBurn()`: `3 * unknownClues().length - 1`, the Deep-Tainted turns a wrong read can cost.
- `burnCapacity()`: paid turns available before Yog-Urt that can absorb the effect:
  - gym guard grind: 5 while either guard is missing (gold's count; the locker NC is a random
    draw), else 0;
  - skate war: 2 while `skateWarOpen()`, else 0;
  - Mom Finish: 2 while it is pending **and** `args.burnMomFinish` is true (default false,
    because Peanut is a spell kill and the effect halves Mysticality).
- `guessReady()`: candidates known, `1 <= N <= args.guessMax` (default 3), and either
  `worstBurn() <= burnCapacity()` or no purchasable clue splits the candidates.
- `seedResolvable()`: `guessReady()` after hypothetically applying every purchasable clue that
  splits the candidates, or `isKnucklebonesAndSushiEnough()`. This is what the School reads.

`args.dreadGuess` (default true) turns the guess lane off; with it off the Library behaves as
the pre-2026-09-09 design plus the cost-ordered purchases below.

### 2. Library quest order, in `src/tasks/sorceress/library.ts`

Tasks in this order once the scholar gear is ready:

1. **Library Scroll** (was the +item half of Library Force/Farm). Completed when the dreadscroll
   is owned. Unchanged outfit, effects, researcher force, clue-throw macro. The healscroll and
   killscroll throws are dropped from the macro: clues 2 and 5 cannot appear on this route, and
   the throws consume scrolls the zirconia lane then re-farms.
2. **Knucklebone**. Ready when the scroll is owned, `splitsOn(4)`, and the burn does not fit
   (`worstBurn() > burnCapacity()` or `N > guessMax`). Uses one from inventory, else pulls under
   the existing reservation. If neither is possible the task marks itself declined for the
   session and yields; it never aborts.
3. **Worktea Sushi**. Ready when the scroll is owned, `splitsOn(7)`, and the burn still does
   not fit after the knucklebone. Requires a worktea in inventory or a pull under the existing
   reservation, fullness room of 2, and a nigiri the mat can roll. Eats through `eatSushi()`,
   which must confirm the eat by a fullness increase or clue 7 landing, not by Fishy being
   active. On any shortfall the task declines and yields; it never aborts. When the Fishy
   scheduler would have picked a nigiri anyway the tea rides for free; that case needs no
   special handling because the scheduler already prices organ space.
4. **Library Catalog** (was the -combat half). Ready when the scroll is owned, catalog clues
   are not all known, and `guessReady()` is false. Same -combat outfit and sneak effects. This
   is the fallback for large candidate sets and for accounts whose scan does not pin.
5. **High Priest**. Ready when the scroll is owned and (`catalogCluesKnown()` or
   `guessReady()`). Behaviour in section 4.

Purchases happen only while the burn does not fit, per the user's spill decision. With two
candidates any splitting clue pins the seed outright, so on a run like today's the sequence is:
clue 4 agrees, clue 7 splits, the sushi pins, read at 18.

Residual rule, flagged for review: when nothing purchasable splits the candidates and the burn
still does not fit, the resolver guesses anyway if `N <= guessMax`, because the expected cost
(half a turn for the read plus half the spill, at most about 2.5 turns for k = 4) stays below
the catalog lane's. Set `dreadGuess=false` to prefer the catalog lane instead.

### 3. Seed-aware 703 handler, in `src/standalone/choice.ts`

`getDreadscrollGuess()` asks the resolver for candidate scrolls first. When candidates exist,
`possibleCodes` is their scroll set, filtered by recorded guesses through the resolver, and the
existing expected-error scoring picks the read. When no candidates exist (scan off, overflowed,
or zero) the current pref-based enumeration runs unchanged. The handler prints the candidate
count, the unknown-clue count, and the worst-case burn before reading.

### 4. High Priest loop and the burn

`High Priest` keeps its shape: if Deep-Tainted Mind is up, burn one turn elsewhere and yield;
otherwise read. Changes:

- The burn order in `burnTurnElsewhere()` becomes: skate war, then gym guard grind, then Mom
  Finish only when `args.burnMomFinish`, then paid Library adventures at -combat as the spill
  sink. The Library sink also draws catalog cards, so spill turns are not wasted when clues are
  still open. The Colosseum is never a burn target: it needs gladiator gear, which needs the
  scholar trade-back, which needs Yog-Urt.
- The existing "ladder dry" abort stays for the case where no burn target exists.
- After a wrong read the resolver re-filters candidates by the recorded guess. With N = 2 the
  second read is certain; with N = 3 it is certain or a coin flip.

### 5. School gating, in `src/tasks/sorceress/school.ts`

`vocabularyDone()` and the `School Unlocks` completion use `seedResolvable()` in place of
`isKnucklebonesAndSushiEnough()`. The old predicate remains as one branch of
`seedResolvable()`, so the School still skips vocabulary on large candidate sets that clues 4
and 7 split. Vocabulary is farmed only when neither guessing nor purchasable clues can resolve
the seed.

### 6. Pace guard and turn audit

While Deep-Tainted Mind is active the Yog-Urt group is floating in `src/lib/gold.ts`: its
checkpoint is deferred by the turns burned in groups pulled forward, whose own done@ can only
improve. Under the turn audit (`2026-09-08-turn-audit-design.md`) a wrong read is a dice event
and the burn turns are the same armed turns they would have been later; only spill turns count
against the run.

### 7. Sim

`sim` adds one row: "seed pin available at this tier", true when the blessed large box pulls are
allowed under the tier policy. It is an expected condition, not a failure, when false; the
report should say the resolver will use the catalog lane. The Leprecondo row stays optional.

## Cost check against known runs

| run        | candidates at scroll | splits on 4 / 7 | old lane        | new lane                          |
| ---------- | -------------------- | --------------- | --------------- | --------------------------------- |
| 2026-09-09 | 2                    | no / yes        | 5 catalog turns | one nigiri (4 to 12 adv), 0 turns |
| 7 others   | 1                    | n/a             | read at once    | read at once, unchanged           |

Hypothetical N = 2, splitting only on 1/6/8: old lane ~7 catalog picks for a given clue; new
lane one read at 50%, else 1 turn plus up to 11 burn turns of which 7 fit, expected about 2.5.

## Out of scope

- Changing how the seed scan builds criteria, or the bang-potion pull policy.
- Teaching the route the Mer-kin language so the combat scrolls yield clues 2 and 5.
- Farming a second crappy mask and tailpiece to decouple gladiator gear from Yog-Urt.
- The dolphin whistle for the worktea: moot once the tea is drunk on arrival.

## Verification

- `yarn lint` and `yarn build` clean.
- `sim` at the user's tier shows the new row and no new "?" rows.
- Replay the 2026-09-09 log by hand against section 2: scroll at 17, worktea at 18, sushi,
  inference to one seed, read at 18.
- Live: the next run whose scan leaves more than one candidate. Until then the lane is exercised
  by a `dreadscroll` standalone dry run that takes a candidate list and a recorded-guess string
  on the command line and prints the candidate filter, unknown clues, worst burn, capacity, and
  the read it would send, without touching the choice. The plan must include it.
