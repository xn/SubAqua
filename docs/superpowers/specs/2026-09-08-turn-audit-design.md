# Turn audit: RNG-independent run accounting

Date: 2026-09-08. Branch: `sim-audit-0906`. Approved in chat by the user; decisions recorded
inline. Revision 2: the reference is the structural floor, not a run.

## Goal

The gold guard (`src/lib/gold.ts`) compares each run's cumulative turncount against the 36-turn
run of 2026-09-06. That run was roughly 5 to 7 turns lucky (first-draw lounge, two-visit locker,
four bat wings procs). A checkpoint built from any run carries that run's dice, and a run that is
behind it cannot be told apart from a run that hit a regression. The user needs a number that
answers "did this change make the route better or worse" and "where can the route improve" with
the dice removed.

Two deliverables, one metric:

1. **A live turn audit** that classifies every paid turn as the run goes, names the free
   resource that was held when a paid fight happened, charges misallocated drop-safe free kills,
   and produces an *adjusted* turn count with dice excluded and luck added back.
2. **A floor guard** that compares the adjusted count against the structural floor per group,
   replacing the run-based pace guard. The 36-turn log stays as a reference log for reading
   lines side by side, not as a number to beat.

## Deliverable 1: the turn audit

### Classes

Every task that spends a turn or fights produces one event with exactly one class.

| class          | when                                                                                                                              | in adjusted | in overage |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------- |
| `structural`   | paid NC in the structural set, or a paid fight against a boss, a Colosseum monster, or a `freeKillNever` monster                  | yes         | no         |
| `dice`         | paid NC in a lottery zone that is not the wanted outcome                                                                          | no          | no         |
| `armed`        | paid fight where the engine had put a free kill, free run or banish rung in the macro and it did not end the fight               | yes         | yes        |
| `avoidable`    | paid fight where no rung was armed but a usable source was held for that location and the strategy's action                     | yes         | yes        |
| `reserved`     | paid fight where the only held sources were blocked by a charge reservation                                                       | yes         | no         |
| `noResource`   | paid fight, not structural, nothing held                                                                                          | yes         | no         |
| `luck`         | a fight that cost no turn because `_batWingsFreeFights` rose during the task and no free source's `remaining()` fell             | yes         | no         |
| `unclassified` | paid NC outside the structural set and outside every lottery zone                                                                 | yes         | no         |

Adjusted turns = every paid turn except `dice`, plus `luck`. Overage = `armed` + `avoidable` +
charged misallocations. Excess = adjusted minus the group's floor; its split by class is the
improvement gauge: `armed`/`avoidable` excess is a ladder or strategy bug, `noResource` excess
needs a routing or resource change (the run-end unspent-resource list sits beside it).

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
        pool = want == "kill" ? held.allowed kills : held runs + banishes + held.allowed kills
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

## Deliverable 2: the floor guard

### Floor table (`src/lib/gold.ts`, renamed in place; the module keeps its name)

`groupFloor: Record<string, number>` is the number of structural turns each group must pay,
from `docs/superpowers/research/2026-09-07-structural-floor.md`, in runplan order:

| group             | floor | what                                                         |
| ----------------- | ----- | ------------------------------------------------------------ |
| Openers           | 1     | A Sandwich Appears! (guild lane, mid tier route)              |
| Pellet            | 0     |                                                              |
| Big Brother       | 1     | Down at the Hatch                                            |
| Grandpa           | 3     | the three trench NCs                                         |
| Outpost           | 5     | four colour NCs + the tent hit                               |
| Currents          | 0     |                                                              |
| Helmet            | 0     |                                                              |
| Mom               | 0     |                                                              |
| Shadow Rift       | 0     |                                                              |
| Sorceress Dailies | 0     |                                                              |
| Corral            | 0     |                                                              |
| Teflon            | 0     |                                                              |
| School            | 3     | Graffiti + two hallpass NCs                                  |
| Library           | 2     | Hook, Line and Sinker + one Read Aloud                       |
| Yog-Urt           | 1     | boss                                                         |
| Gladiator Gear    | 2     | headguard + thighguard                                       |
| Skate Park        | 5     | Sickpipe, Picking Sides, Prayer, Rollerbawl, Holey Rollers   |
| Colosseum         | 10    | 15 rounds minus 5 Club 'Em                                   |
| Mom Finish        | 1     | Yo' Mama NC; Peanut is waffled                               |
| Shub              | 1     | boss                                                         |
| Finale            | 1     | Seaceress                                                    |

Total 36. `cumulativeFloor` is computed at module load by walking the table in key order:
Openers 1, Pellet 1, Big Brother 2, Grandpa 5, Outpost through Teflon 10, School 13, Library 15,
Yog-Urt 16, Gladiator Gear 18, Skate Park 23, Colosseum 33, Mom Finish 34, Shub 35, Finale 36.
Groups not in the table (Init, Wanderers) have no checkpoint. `FLOATING` stays.

The gold run reconciles against it: 36 paid, 3 dice, 4 luck gives adjusted 37, one over the
floor (Peanut paid without a waffle).

### Guard (`assertOnFloor`, replaces `assertOnGoldPace`)

Evaluated after classification, only when the event is a paid turn and its class is not `dice`.
Let `adjusted` be the sum over all ledger rows of `turns - dice + luck`, and `checkpoint` the
group's `cumulativeFloor`. Abort when `adjusted > checkpoint + args.floorSlack`.

- Cumulative sums come from the persisted ledger, so a resumed run needs no drift term; turns
  spent outside the ledger (by hand, before Init) are not counted, matching today's
  "unattributed" line.
- On abort: print the ledger and audit tables and the ladder state in red, then throw
  `FLOOR DEVIATION: <task> paid a turn (<class>: <detail>); adjusted turns <A> vs floor <F> for
  <group> (slack <S>). <class-specific hint>. Compare against docs/gold-star-run.txt; rerun with
  floorSlack=N to loosen or floorGuard=false to disable.` The hint is "a free source was held"
  for `armed`/`avoidable`, "no free source was held; see the ladder state" for `noResource`,
  and "an NC the audit tables do not know" for `unclassified`.
- Args: `gold` becomes `floorGuard` (boolean, default true); `goldSlack` becomes `floorSlack`
  (number, default 2). Old names are removed, not aliased.

### Overage guard

New arg `overageBudget` (number, default 1, `setting: ""`): after classification, if cumulative
`armed + avoidable` across all groups reaches the budget, abort with `OVERAGE: <event line>. <N>
avoidable turn(s) this run; budget <B>. The turn was paid while <detail> was held. Rerun with
overageBudget=0 to disable.` `overageBudget=0` disables. Independent of `floorGuard`.
Misallocations never trigger it. Runs before the floor guard when both would fire, since it
names the cause.

### Report (`reportLedger`)

Printed at engine destruct and written to `subaqua_lastrun.txt`:

1. `group | tasks | turns | combats | free | done@ | adjusted | floor | excess`, where `adjusted`
   and `floor` are cumulative and `excess` is their difference.
2. `group | structural | dice | armed | avoidable | reserved | noRes | luck | unclassified`.
3. Totals: `paid N, dice D, luck L, adjusted N - D + L, floor F, excess E; overage A (armed X,
   avoidable Y, misallocated charged Z of M)`.
4. Every `armed`, `avoidable`, `noResource`, `unclassified` event line and every misallocation,
   verbatim from the audit file, followed by the ladder state (unspent free kills, runs,
   banishes).

`GOLD_RUN` becomes `REFERENCE_LOG = "docs/gold-star-run.txt (SubAqua 2026-09-06, 36 turns)"` and
appears only in the abort messages and the report header.

## Files

- `src/lib/audit.ts` (new): tables, `AuditSnapshot`, `heldSources`, `classify`, event and use
  types, audit-file helpers, misallocation pairing.
- `src/lib/gold.ts`: `groupFloor`, `cumulativeFloor`, ledger counters, report sections,
  `assertOnFloor`, `assertOverageBudget`; `goldTurncounts`, `goldCheckpoints`, `GOLD_RUN`,
  `sessionDrift` removed.
- `src/engine/engine.ts`: snapshot in `prepare`, `armed` in `customize`, classify + guards in
  `post` after `recordTask`.
- `src/resources/freekill.ts`: export `usableFreeKill`, `freeKillBudgetAllows`.
- `src/args.ts`: `floorGuard`, `floorSlack`, `overageBudget`; `gold`, `goldSlack` removed.
- `src/sim.ts`, `README.md`: guard notes reworded (grep for `gold=`, `goldSlack`).

## Verification

The repo has lint and build only. Before claiming done:

1. `yarn lint && yarn build` clean; `grep -rn "goldSlack\|gold=" src README.md` empty.
2. A throwaway script in the session scratchpad replays each paid block from
   `2026-09-02-turn-ledger/ledger.py` on `docs/gold-star-run.txt` through the NC tables (name +
   item-acquired lines) and must report: 36 paid, 0 armed, 0 avoidable, 3 dice (Cut Down in His
   Prime, two tent visits without the stashbox), 4 luck, 0 unclassified, adjusted 37 vs floor
   36. The same script on `docs/2026-09-07-run.txt` must class the three paid Mer-kin trainer
   fights as non-structural and show Gladiator Gear's excess.
3. `cumulativeFloor` printed by a one-line node check equals the table above.
4. Live: the next run's `subaqua_lastrun.txt` shows the audit tables and neither guard fired on
   a dice or luck event.

## Out of scope

- Backfilling the six archived logs with an offline classifier (the 09-02 ledger covers gold and
  09-02 by hand).
- Per-group slack; one flat `floorSlack` until two runs prove the floor table.
- Valuing `reserved` turns; a reservation is a routing decision and shows up where the charge is
  spent.
- High-tier floors (no guild NC, different Colosseum cap); the table is the mid-tier route.
