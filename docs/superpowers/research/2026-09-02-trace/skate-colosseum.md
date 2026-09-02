# Skate Park + Colosseum, 2026-09-02 (45 turns) vs gold (41)

Ours: `docs/2026-09-02-run.txt`. Gold: `docs/gold-star-run.txt`.
Ledger rows under review: `Skate Park … done@31 gold@25 +6 (reordered)`, `Colosseum … done@40
gold@37 +3`.

**The whole Δ is two leaks, and it closes to the turn:**

| cause                                                  | turns  | where                                                    | fixable?          |
| ------------------------------------------------------ | ------ | -------------------------------------------------------- | ----------------- |
| skate blade never pulled → an extra `Picking Sides` NC | +1     | Skate Park `[23]`                                        | **yes, fixed**    |
| 2 fewer bat-wings procs on a 1/(X+2) roll              | +2     | Colosseum                                                | **no — variance** |
| **total**                                              | **+3** | = the Colosseum row's Δ, carried to Mom Finish/Shub (+3) |                   |

`Skate Park +6` is NOT six lost turns. Five of it is position: we interleaved the gym between skate
park visits, so the last NC landed at `[31]` instead of `[25]`. The ledger flags the row
`(reordered)` for exactly this reason. The real cost is the +1 below.

## 1. Skate Park — one turn, and it is a repeat finding

Counted from `[N] The Skate Park` markers.

| #   | gold                                    | ours                                      |
| --- | --------------------------------------- | ----------------------------------------- |
| 1   | `[22]` Sickpipe, the Skate Board Member | `[22]` Sickpipe, the Skate Board Member   |
| 2   | `[23]` Prayer of the Roller Skates      | `[23]` **Picking Sides** ← the extra turn |
| 3   | `[24]` Rollerbawl                       | `[24]` Prayer of the Roller Skates        |
| 4   | `[25]` Holey Rollers                    | `[25]` Rollerbawl                         |
| 5   | `[25]` sausage goblin (free)            | `[31]` Holey Rollers                      |
| 6   | `[25]` sausage goblin (free)            | —                                         |
|     | **4 paid**                              | **5 paid**                                |

`skatepark.ts:77` already states the rule: _"Holey Rollers only fires with a skate blade EQUIPPED —
bladeless serves Picking Sides instead, costing an extra turn and forcer."_ Gold pulled the blade
(`gold:7667`) and equipped it before its first visit (`gold:7670`). We arrived bladeless, drew
`Picking Sides`, and took the blade as its consolation prize (`:7772` `Took choice 403/1: skate
blade`) — then equipped it for every visit after (`:7854`, `:7922`, `:8503`).

This is the same leak `2026-08-31-gold-trace/D-yog-gym-skate.md` flagged (**Picking Sides**, +1).
The fix made then was to add a skate-blade _reservation_ to `pulls.ts:214`. It did not hold.

**Why the pull never fired.** `skateParkTurn()` opens with
`if (availableAmount(blade) === 0 && pullBudgetAllows(blade)) pullSequence(blade)`. The blade is its
own reservation, so `pullBudgetAllows` takes the `>=` branch (`pulls.ts:269-271`):
`pullsRemaining() >= reservedPulls()`. At `[23]` we had used **17 of 20** pulls — all 17 before
line 7767 — so `pullsRemaining()` was 3, and the gate failed, meaning **4+ reservations were live**.

Those held slots were never spent. There is not one `pull:` line after 7767 in the whole run: the
run ended with **3 pulls unused**, while paying a turn and a forcer for the blade one of them would
have bought. The reservations that plausibly held them are the ones whose items were never obtained
by any route: `null-day exploit`, `Mer-kin pinkslip`, `ink bladder`, `Mer-kin knucklebone`,
`Mer-kin worktea` (0 pulled, 0 acquired each). Gold, by contrast, spent all 20.

## 2. Colosseum — two turns, all bat wings

17 visits each, fight for fight. "free" = `This combat did not cost a turn`.

|                           | gold                            | ours                            |
| ------------------------- | ------------------------------- | ------------------------------- |
| entrance                  | `[31]` Your Big Entrance (paid) | `[32]` Your Big Entrance (paid) |
| Club 'Em Back in Time     | 5 free (`[31]`×5)               | 5 free (`[32]`×5)               |
| **bat-wings free fights** | **3** (`[32]`, `[32]`, `[36]`)  | **1** (`[33]`)                  |
| paid gladiator rounds     | 8                               | 10                              |
| finish                    | `[38]` Been There, Won That     | `[41]` Been There, Won That     |
| **totals**                | **9 paid / 8 free**             | **11 paid / 6 free**            |

Both runs spent the Club 'Em cap (5/day) identically. The entire difference is the bat wings:
`gold:9075`, `:9133`, `:9356` — _"You flap your bat wings gustily and launch yourself to your next
adventure in an instant"_, `_batWingsFreeFights` 0→1→2→3, each ending in `This combat did not cost a
turn`. Gold's maximize names them outright: `equip Mer-kin gladiator mask, equip bat wings, equip
Mer-kin gladiator tailpiece`.

Per the wiki (bat wings): **up to 5 combats per day do not take a turn.** Gold spent 4 — three in
the Colosseum, one at the Naughty Sorceress (`gold:9891`). We spent **2 all run**: Yog-Urt at `[22]`
(`:7512`) and one Colosseum round at `[33]` (`:9262`). Three charges expired unused.

**Why — and this is NOT a code defect.** The first draft of this report claimed the Colosseum
never wore the wings and proposed forcing them. That is wrong, and the log says so: `colosseum.ts:97`
already pushes `+equip bat wings` whenever the tier does not conserve free fights (mid does not),
and every single round in our block is preceded by `equip back bat wings` — 23 such lines across the
run against gold's 6, and 68 maximize lines naming the wings against gold's 36. **We wore them more
than gold did and procced less.**

The mechanic is a decaying random roll. Per the wiki (bat wings): _"Causes up to 5 combats per day
to not take a turn… The proc rate is currently estimated at 1/(X+2), where X is the current number
of activations today."_ So the 1st proc is ~1/2, the 2nd ~1/3, the 3rd ~1/4 — about 20 turn-taking
fights to collect all five. Gold rolled 3 procs inside its Colosseum block; we rolled 1 with the
same gear worn. Gold spent 4 charges all day, we spent 2 (Yog-Urt `[22]`, Colosseum `[33]`).

Two more things the same wiki note settles, both in our favour:

- The wings _cannot_ proc on inherently-free monsters, so wearing them in the Shadow Rift for
  `Swoop like a Bat` is not burning charges on already-free fights. Neither run procced there:
  gold's first activation is `gold:9075` in the Colosseum, ours `:7512` at Yog-Urt.
- `engine.ts:350-353`'s bank (wings only on `task.batWings`) plus the explicit `-equip bat wings` in
  `gym.ts`/`skatepark.ts` is still right — it stops the wings rolling procs on cheap fights, which
  is exactly what cost two Colosseum rounds on 2026-08-28.

**Nothing to implement here.** Two turns of a 1/(X+2) roll is the run-to-run noise this route sits
in; the only lever would be more turn-taking fights with the wings on, and we already have more
than gold.

## 3. Fix

**Shipped:** the reservation queue no longer refuses a reserved item's own pull.
`pullBudgetAllows` gave reserved items `pullsRemaining() >= reservedPulls()`, which unblocks only
the case where the count exactly equals the pulls left. Once reservations outnumber the pulls left
the test fails for every reserved item simultaneously and the queue deadlocks — no reservation can
pull, so none is satisfied, so the count never falls, so the slots expire. That is precisely the
state at turncount 22 (3 left, 4+ live), and it is why a run with three spare pulls paid a turn and
a forcer for a blade it could have pulled. A reserved item now competes only against the hard cap;
among reserved items it is first-come-first-served.

**Not shipped, deliberately:** the Colosseum's two turns. See §2 — the wings were already worn on
every round and the gap is the 1/(X+2) proc roll. Forcing gear that is already forced would have
been a no-op dressed up as a fix.
