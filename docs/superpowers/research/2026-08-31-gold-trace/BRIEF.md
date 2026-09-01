# Gold-trace analysis brief (2026-08-31)

Goal: SubAqua (TypeScript, this repo) must reproduce the "gold standard" run of the
reference ash script UnderTheSea (UTS). Gold = UTS run of 2026-08-21, **41 turns**,
zero interventions. Yesterday = SubAqua run of 2026-08-30, **119 turns**, 7 restarts
(fixes were deployed mid-run at turns ~10, 19, 21, 51, 96 — so behaviour can differ
before/after those points; the code you read is the post-fix working tree).

## Inputs (all paths relative to the repo root /Users/xn/sites/KOL/SubAqua)

- `docs/superpowers/research/runs/gold-uts-2026-08-21.log` — verbatim mafia session log, 9,948 lines.
  `[N] Zone` lines mark a turn-consuming adventure (N = my_turncount). A `Round 0:` line
  after a `[N]` with the SAME N as the previous combat means that combat was FREE.
  `> UTS: phase: …` lines mark UTS phases.
- `docs/superpowers/research/runs/subaqua-2026-08-30.log` — verbatim, 15,134 lines. Same
  markers; `> Executing Group/Task` lines mark SubAqua tasks; `> CCS: …` lines show the
  exact combat macro; `> Shiny tier:` marks a (re)start.
- SubAqua source: `src/tasks/**`, `src/resources/**`, `src/engine/**`, `src/lib/**`.
- UTS ash source of truth: `/Users/xn/sites/KOL/UnderTheSea` (HEAD a29c9dc), files
  `scripts/UnderTheSea.ash`, `scripts/UnderTheSea_CCS.ash`, `scripts/UnderTheSeaGlobals.ash`,
  `scripts/UnderTheSea_Choice.ash`. Use it to understand WHY gold did what it did.
- mafia source for game facts if needed: `/Users/xn/sites/KOL/kolmafia`.

Read log slices with `sed -n 'A,Bp' file` — never try to read a whole log at once.

## Phase slices

| Phase                                                                                                                                     | Gold lines (turns) | Yesterday lines (turns) | SubAqua files                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------- | --------------------------------------------------------------------------------------------------- |
| A. Openers → Outpost: guild, pellet, Wreck, Grandpa, golem recall, Outpost (grandma/lockkey/stashbox/prayerbeads)                         | L1066–3361 (0→15)  | L937–3366 (0→15)        | tasks/init.ts, monkees/guild.ts, pellet.ts, bigbrother.ts, grandpa.ts, outpost.ts                   |
| B. Helmet, Mom rescue (habitats/cyber), corral leather/opener, shadow rift + lasso training, teflon/mine/crappy disguise, seahorse taming | L3362–6507 (15→16) | L3367–6951 (15→31)      | monkees/helmet.ts, currents.ts, mom.ts, corral.ts, shadow.ts, sorceress/mine.ts, sorceress/daily.ts |
| C. Elementary School (scholar gear/cowl/rope/wordquiz) + Library (dreadscroll) + High Priest                                              | L6508–7640 (16→20) | L6952–11161 (31→73)     | sorceress/school.ts, library.ts, lib/dreadscroll.ts, resources/bangpotions.ts                       |
| D. Yog-Urt + Gymnasium (guard grind) + Skate Park war                                                                                     | L7641–8437 (20→30) | L11162–13195 (73→99)    | sorceress/yogurt.ts, gym.ts, skatepark.ts, fights.ts                                                |
| E. Colosseum + Mom finish + Shub + Seaceress                                                                                              | L8438–9948 (30→41) | L13196–15134 (99→119)   | sorceress/colosseum.ts, monkees/mom.ts (momFinish), shub.ts, finale.ts, fights.ts, lib/shub.ts      |
| F. Cross-cutting: free-fight & resource ledger                                                                                            | whole log          | whole log               | resources/\*.ts, engine/combat.ts, engine/engine.ts                                                 |

## What to produce — ONE markdown file per phase in this directory

`A-openers-outpost.md`, `B-monkees-corral.md`, `C-school-library.md`, `D-yog-gym-skate.md`,
`E-colosseum-finale.md`, `F-resource-ledger.md`.

Sections, in order:

1. **Turn accounting** — table of sub-phase → gold turns → yesterday turns → Δ. Count from the
   `[N]` markers, don't estimate. Also count combats and free combats per sub-phase in both.
2. **Run-vs-run difference catalogue** — step by step through the gold slice. Table columns:
   gold step (line, turn, what happened) | yesterday's equivalent (line, turn) | difference |
   turn cost of the difference | cause hypothesis. Include: zone chosen, NC option taken,
   combat outcome and how it ended (free kill / free run / banish / kill — name the source
   skill/item), outfit + familiar, effects, pulls, item use, when the phase was declared done.
3. **Decision trace (gold → code)** — for every decision gold made in this slice, would
   SubAqua's code make the same decision? Cite `file:line`. Verdict per decision:
   SAME / DIFFERENT / NOT-IMPLEMENTED / UNVERIFIED (say what you'd need to verify).
   Cover: task ordering & ready/completed conditions, zone, choice answers, combat macro
   contents per monster, free-fight source selection & order, banish targets, outfit,
   familiar, effect list, pull decisions, stop conditions.
4. **Ranked findings** — by turns recoverable, each with: evidence (log lines both runs),
   root cause in code (file:line) or in game facts, the specific change proposed. Distinguish
   (a) code defect, (b) missing feature vs the ash, (c) RNG variance, (d) account/state
   difference between the two days (e.g. items owned, prefs).

Rules: READ-ONLY — do not modify anything under `src/`, do not run yarn/mafia, do not commit.
Do not write to the memory directory. Refer to any garbo-derived reference script only as
"the garbo fork" (never by its repo name). Be exact and terse; log line numbers are the
currency. If the two logs' phase boundaries don't line up perfectly, read a little beyond
your slice rather than guess.
