# Turn audit: RNG-independent run accounting

Date: 2026-09-08. Branch: `sim-audit-0906`. Approved in chat by the user; decisions recorded
inline.

## Goal

The gold guard (`src/lib/gold.ts`) compares each run's cumulative turncount against the 36-turn
run of 2026-09-06. That run was roughly 5 to 7 turns lucky (first-draw lounge, two-visit locker,
four bat wings procs), so a bug-free average-luck run trips the guard from the Colosseum on and a
lucky run hides real waste. The user needs a number that answers "did this change make the route
better or worse" without the dice in it.

Two deliverables:

1. **Expected-value checkpoints** for the pace guard, so the checkpoint table describes an
   average-luck run instead of the observed lucky one.
2. **A live turn audit** that classifies every paid turn as the run goes, names the free resource
   that was held when a paid fight happened, charges misallocated drop-safe free kills, and can
   abort on the first avoidable turn.

## Deliverable 1: expected checkpoints

`goldTurncounts` stays as the observed record. A new `luckShift` table lists, per group, the
difference between the expected cost of that group's dice and what gold paid. `expectedTurncounts`
is computed once at module load: walk `goldTurncounts` in key order, add each group's shift to a
running total, and add the running total to that group's observed turncount.

| group          | shift | basis                                                                                   |
| -------------- | ----- | --------------------------------------------------------------------------------------- |
| Outpost        | -1    | stashbox in 1 of 3 tent spots; gold missed twice, expectation is one miss               |
| School         | +2    | the lounge unlock is 1 of 3 unlock NCs drawn without replacement; gold drew it first    |
| Yog-Urt        | +1    | bat wings proc made the boss free; 5% per fight                                         |
| Gladiator Gear | +2    | headguard + thighguard drawn in 2 NCs; expectation is ~4 of 5, ~4.7 of 6 random items   |
| Colosseum      | +3    | 3 bat wings procs in 15 fights; expectation is under 1                                  |

Resulting cumulative table: Openers 2, Pellet 2, Big Brother 3, Grandpa 6, Outpost through Teflon
12, School 17, Library 17, Yog-Urt 19, Gladiator Gear 29, Skate Park 29, Colosseum 39, Mom Finish
41, Shub 42, Finale 43.

- `assertOnGoldPace` reads `expectedTurncounts` instead of `goldCheckpoints`; `GUARD_TOLERANCE`
  and `goldSlack` (default 3) are unchanged.
- The ledger table gains a column: `group | tasks | turns | combats | free | done@ | gold@ | exp@ | Δ`,
  where Δ is against `exp@`.
- The abort message names both numbers: "gold had X done by turn N (expected M)".
- `GOLD_RUN` label becomes `SubAqua 2026-09-06 (36 turns; expected 43)`.
- `src/args.ts` help text, `src/sim.ts` note and README paragraph say "expected-luck checkpoint
  (43-turn baseline built from the 36-turn run)".

## Deliverable 2: the turn audit

### Classes

Every task that spends a turn or fights produces one event with exactly one class.

| class          | when                                                                                                                              | in score | in overage |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------- |
| `structural`   | paid NC in the structural set, or a paid fight against a boss, a Colosseum monster, or a `freeKillNever` monster                  | yes      | no         |
| `dice`         | paid NC in a lottery zone that is not the wanted outcome                                                                          | no       | no         |
| `armed`        | paid fight where the engine had put a free kill, free run or banish rung in the macro and it did not end the fight               | yes      | yes        |
| `avoidable`    | paid fight where no rung was armed but a usable source was held for that location and the strategy's action                     | yes      | yes        |
| `reserved`     | paid fight where the only held sources were blocked by a charge reservation                                                       | yes      | no         |
| `noResource`   | paid fight, not structural, nothing held                                                                                          | yes      | no         |
| `luck`         | a fight that cost no turn because `_batWingsFreeFights` rose during the task and no free source's `remaining()` fell             | yes      | no         |
| `unclassified` | paid NC outside the structural set and outside every lottery zone                                                                 | yes      | no         |

Score (`adjusted turns`) = every paid turn except `dice`, plus `luck`. Overage = `armed` +
`avoidable` + charged misallocations. Both are printed per group and as run totals.

A free fight that used a free source produces no event; the existing `free` counter already
covers it.

### Tables (`src/lib/audit.ts`)

- `structuralNCs`: Set of encounter names. Down at the Hatch; Lost and Found and Lost Again;
  Respect Your Elders; You've Hit Bottom; A Walker and a Ranger, hold the Texas; No Fuchsia For
  You; Obtuse Chartreuse; Granny, Does Your Dogfish Bite?; A Mer-kin Graffiti; Halls Passing in
  the Night; Hook, Line and Sinker; Mer-kin Dreadscroll; Ators Gonna Ate (see lottery rule);
  Sickpipe, the Skate Board Member; Picking Sides; Prayer of the Roller Skates; Rollerbawl; Holey
  Rollers; Yo' Mama So Possessed By Evil . . .; A Sandwich Appears!; Mysterious Intent (see
  lottery rule).
- `lotteryZones`: Map from Location to a `won(snapshot)` predicate.
  - The Haunted Pantry: encounter is `A Sandwich Appears!`.
  - The Mer-Kin Outpost: `Mer-kin stashbox` or `Mer-kin trailmap` count rose during the task.
  - Mer-kin Elementary School: encounter is `A Mer-kin Graffiti` or `Halls Passing in the Night`.
  - Mer-kin Gymnasium: `Mer-kin gladiator headguard` or `Mer-kin gladiator thighguard` count rose.
  A paid NC in a lottery zone is `structural` when `won` is true, else `dice`. `Mysterious Intent`
  and `Ators Gonna Ate` therefore never resolve from the name alone.
- `structuralMonsters`: Yog-Urt, Elder Goddess of Hatred; Shub-Jigguwatt, Elder God of Violence;
  The Nautical Seaceress; plus every monster in `freeKillNever` (wild seahorse, Peanut). Any fight
  at Mer-kin Colosseum is structural regardless of monster (Club 'Em is the one free kill there
  and is already in the ladder).
- Picking Sides is listed structural on the user's reading that the skate war is mandatory; the
  floor doc marks it unclear. Move it to a dice rule if a later run shows it avoidable.

### Snapshot (engine)

`SubAquaEngine.prepare` already stores the pre-task turncount, encounter and combat marker. It
gains an `AuditSnapshot`:

- `location`: `taskLocation(task)`.
- `zoneDropsMatter`: `freeKillTargetDropsMatter(location)`.
- `remaining`: `Map<name, number>` of `remaining()` for every free-kill source and free-run
  source (a `remaining()` that throws counts as 0).
- `batWings`: `get("_batWingsFreeFights")`.
- `items`: counts of stashbox, trailmap, headguard, thighguard.
- `held`: computed by `heldSources(location, action)` in `audit.ts`:
  - free kills usable at that location with `dropsMatter: zoneDropsMatter ?? true`, split into
    `allowed` (passes `freeKillBudgetAllows`) and `reserved` (fails it). `usableFreeKill` and
    `freeKillBudgetAllows` become exported.
  - free runs: `selectFreeRun({ location, banish: task.freeRunBanishes === true })`, and
    `pickBanishSource(location)`.

`SubAquaEngine.customize` records `armed`: the names of the sources it actually provided for
`killFree`, `freeRun` and `banish`, and the source chosen by `upgradeKill` for the default action.
It also records `defaultAction`: `combat.getDefaultAction()`.

### Classification (engine `post`, after `recordTask`)

```
turnsSpent = myTurncount() - preTaskTurncount
fought     = fightHappened(preTaskCombatStarted)
monster    = toMonster(get("lastEncounter"))   // $monster.none when the last encounter was an NC
used       = sources whose remaining() fell vs snapshot

if fought and turnsSpent == 0:
    if _batWingsFreeFights rose and used is empty → luck
    else → no event
elif turnsSpent > 0 and (not fought or monster is none):
    NC, encounter = get("lastEncounter"):
      if location in lotteryZones → won(snapshot) ? structural : dice
      elif encounter in structuralNCs → structural
      else → unclassified
elif turnsSpent > 0:
    if location is Colosseum or monster in structuralMonsters or freeKillNever → structural
    elif armed non-empty → armed (detail: the armed source names)
    else:
        want = strategy action for monster (combat.where) else defaultAction
        pool = want == "kill" ? held.allowed kills : held runs + banishes (+ kills, a kill also avoids the turn)
        if pool non-empty → avoidable (detail: pool names)
        elif held.reserved non-empty → reserved (detail: names)
        else → noResource
```

Detail strings name the resource so the user can trace the log line. When `monster` is
`$monster.none` but `fought` is true (fight followed by an NC in the same task) the event is
recorded as an NC of the last encounter; the fight's class is lost and a note says so.

### Free-kill use and misallocation

For each source in `used` that is a free kill, record a `FreeKillUse`:
`{ turncount, group, source, dropSafe, dropsMatter, alternative }` where
`dropsMatter = freeKillTargetDropsMatter(location, monster) ?? zoneDropsMatter ?? false` and
`alternative` is true when `held.allowed` contained a non-drop-safe source at snapshot time.

Misallocated = `dropSafe && dropsMatter === false && alternative`. At report time,
`charged = min(misallocated uses, later paid fights classed noResource with dropsMatter true)`,
matched in turncount order, one for one (decision: charge only when paired). Uncharged
misallocations print as warnings.

### Storage

- Ledger rows (`_subaqua_ledger`) gain counters: `structural, dice, armed, avoidable, reserved,
  noResource, luck, unclassified`. Existing rows without them load as 0.
- Events and free-kill uses append to `subaqua_audit.txt` in the mafia data directory, one line
  each: `t<turncount> | <group> | <task> | <class> | <encounter> | <detail>` and
  `t<turncount> | <group> | USE | <source> | dropSafe=<b> dropsMatter=<b> alt=<b>`. Appending is
  `fileToBuffer` + `bufferToFile`. The file is truncated when `loadLedger` finds the pref empty,
  which is the start of each run day. It is never printed to the session log.

### Report (`reportLedger`)

Printed at engine destruct and written to `subaqua_lastrun.txt`:

1. The pace table (Deliverable 1).
2. `group | structural | dice | armed | avoidable | reserved | noRes | luck | unclassified`.
3. Totals: `paid N, dice D, luck L, adjusted turns N - D + L, overage A (armed X, avoidable Y,
   misallocated charged Z of M)`.
4. Every `armed`, `avoidable`, `unclassified` event line and every misallocation, verbatim from
   the audit file.

### Overage guard

New arg `overageBudget` (number, default 1, `setting: ""`): after classification, if cumulative
`armed + avoidable` across all groups reaches the budget, print the ledger and ladder state in red
and throw `OVERAGE: <event line>. <N> avoidable turn(s) this run; budget <B>. The turn was paid
while <detail> was held. Rerun with overageBudget=0 to disable.` `overageBudget=0` disables.
Independent of `gold`: `gold=false` leaves the overage guard on. Misallocations never trigger it.

## Files

- `src/lib/audit.ts` (new): tables, `AuditSnapshot`, `heldSources`, `classify`, event and use
  types, audit-file helpers, misallocation pairing.
- `src/lib/gold.ts`: `luckShift`, `expectedTurncounts`, ledger counters, report sections,
  `assertOverageBudget`.
- `src/engine/engine.ts`: snapshot in `prepare`, `armed` in `customize`, classify + guard in
  `post` after `recordTask`.
- `src/resources/freekill.ts`: export `usableFreeKill`, `freeKillBudgetAllows`.
- `src/args.ts`: `overageBudget`; reword `gold` help.
- `src/sim.ts`, `README.md`: guard notes.

## Verification

The repo has lint and build only. Before claiming done:

1. `yarn lint && yarn build` clean.
2. A throwaway script in the session scratchpad replays each paid block from
   `2026-09-02-turn-ledger/ledger.py` on `docs/gold-star-run.txt` through the NC tables (name +
   item-acquired lines) and must report: 36 paid, 0 armed, 0 avoidable, 3 dice (Cut Down in His
   Prime, two tent visits without the stashbox), 4 luck, 0 unclassified. The same script on
   `docs/2026-09-07-run.txt` must class the three paid Mer-kin trainer fights as non-structural.
3. `expectedTurncounts` printed by a one-line node check equals the table above.
4. Live: the next run's `subaqua_lastrun.txt` shows the audit tables and the guard did not fire
   on a dice or luck event.

## Out of scope

- Backfilling the six archived logs with an offline classifier (the 09-02 ledger covers gold and
  09-02 by hand).
- Retiring the pace guard; it stays as the backstop until two runs prove the audit.
- Valuing `reserved` turns; a reservation is a routing decision and shows up where the charge is
  spent.
