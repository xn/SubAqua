# Run analysis: 2026-09-19 (49 turns) vs gold SubAqua 2026-09-06 (36)

Log: `docs/2026-09-19-run.txt` (10,589 lines, cut from the mafia session at "Beginning New
Ascension"). Line numbers `:NNNN` are into that file; `gold:NNNN` into `docs/gold-star-run.txt`.
Ledger from `data/subaqua_lastrun.txt`. No abort; the run finished on its own.

Calendar: 2026-09-19 is Talk Like a Pirate Day, so an `ambulatory pirate` wanderer took one gym
adventure (`:8369`).

## 1. Per phase, paid turns

| phase                        | gold | today | Δ      | cause                                                                                |
| ---------------------------- | ---- | ----- | ------ | ------------------------------------------------------------------------------------ |
| Haunted Pantry               | 2    | 3     | +1     | one-time `Spirit of the Dolphin King` NC landed in the pantry (`:1097`); unavoidable |
| Pellet, Big Brother, Grandpa | 4    | 4     | 0      |                                                                                      |
| Outpost … Teflon             | 7    | 6     | −1     |                                                                                      |
| Mom (mid-run)                | 0    | 2     | **+2** | bakery crêep screech (`:7442`), Peanut (`:7610`); §2.2                               |
| School                       | 3    | 5     | **+2** | one hallpass, two dud NCs (`:5999` bathrooms, `:6297` closet); §2.3                  |
| Library + dreadscroll        | 2    | 2     | 0      |                                                                                      |
| Yog-Urt                      | 0    | 1     | +1     | gold's Yog turn was a bat wings refund (`gold:6526`→`gold:6737` same counter); dice  |
| Gymnasium + Skate Park       | 7    | 16    | **+9** | 5 locker NCs vs 2, plus 7 paid non-mer-kin kills vs 0; §2.1                          |
| Colosseum                    | 7    | 7     | 0      | all seven rounds one-shot                                                            |
| Mom Finish                   | 2    | 1     | −1     | Peanut already paid mid-run                                                          |
| Shub, Finale                 | 2    | 2     | 0      |                                                                                      |
| **total**                    | 36   | 49    | +13    |                                                                                      |

Gym + Skate today (16): skate NCs 4 (`[22]`–`[25]`), locker NCs 5 (`:7803` `:7977` `:8079` t38
`:8730`, t39), eye in the darkness kills 6 (`:7825` `:7898` `:8003` `:8098` `:8284` `:8425`),
pirate 1 (`:8369`). Every mer-kin fight was free (banish, boots runaway, Spring Kick, curveball,
ink bladder, free-kill item). Gold: 2 locker NCs, 4–5 skate NCs, 0 paid combats.

## 2. Sinks with mechanism

### 2.1 Gym: 7 paid habitat/wanderer kills (`[29]`–`[37]`)

**What happened.** The eye habitat was recalled at `:7741` on the Abyss fight that filled Mom's
bar (38→40 at `:7762`). Nothing could consume the five copies (Cyber Mom completes on
`momBarFull`), so they surfaced in the next combat zone, the Gymnasium. `gladiatorFilter`
(`fights.ts:128`) treats any non-mer-kin monster as `killMacro(false)`: no free run, no free
kill. Five copies (`_monsterHabitatsFightsLeft` 5→0, last at `:8285`) plus one crystal-ball
echo (`:8425`, the ball on Curby re-predicted the eye each time it saw one) plus the pirate
wanderer = 7 paid turns. The boots' free runaway was charged the whole time (`:7905` `:8010`
`:8105` "Release the Boots" prompts) and was used 4× on mer-kin at `:8584`–`:8678`; free-kill
items were still held at t39.

**Why the recall was wasted.** Chain, all verified in the log:

1. `[12]` `:2804` the Outpost's second golem recall fired on the last golem of the first batch
   (outpost.ts:61, `fightsLeft <= 1 && recalled < 2`). The lockkey dropped 300 lines later
   (`:3131`) and the Outpost closed at `[13]`, leaving 4 stale golem charges.
2. `[14]` `:3615` Abyss Habitats fought an eye with the golems live. The compiled macro put
   `if hasskill 7485; skill 7485` first and KoL skipped it (`:3618` VHS tape fired instead):
   **KoL hides Recall Facts while another habitat is up.** `noteRecallOutcome` set
   `_subaqua_habitatRecallRefused` (`:3644`) and the fallback `Abyss Mom` ran: 7 free fights
   (Sweat Bullets ×2, bricks, Shattering Punch, a Macrometeorite re-roll of Peanut at `:3699`)
   for 0→24 progress at 0 turns. Fine so far. This is the second run to show the refusal
   (09-14 was the first); the 09-08 "autoscend recasts over live charges" assumption is wrong.
3. Golem charges dribbled out in the corral (`:5570`), school (`:5918` `:6015`), library
   (`:6527`) and gym (`:7357`, free). At `[26]` `_monsterHabitatsFightsLeft` hit 0 (`:7359`),
   `habitatFree()` flipped true, and both `Banish Constructs` and `Abyss Habitats` woke up.
   Neither `ready` consults `cyberLaneStuck()` (already true via the refusal) or the remaining
   bar. Progress was 30: three Abyss fights of any kind finish it.
4. `Banish Constructs` paid a turn in the Madness Bakery (`:7442`) to screech a crêep for a
   cyber lane that could never run. `Abyss Habitats` then took three Abyss fights (school of
   many free, Peanut paid, eye free) and cast the recall on the third with progress already at
   38 (`:7741`).

**Cost.** 6 eye turns + 1 pirate turn in the gym (the pirate would also have been a free run
under a fixed filter), 1 bakery turn. Peanut's turn is mandatory and only moved from the finish.

### 2.2 Locker draws: 5 NCs vs gold's 2

Wiki (`Ators Gonna Ate`): "Take stuff" gives one of dodgeball, dragnet, headguard,
switchblade, thighguard (never a duplicate) or fastjuice. Today drew thighguard, dodgeball,
switchblade, dragnet, headguard; gold drew headguard, thighguard. Expected NCs to see both
guards from five without replacement is 4, so gold was +2 lucky and today −1 unlucky.

The wiki also notes the locker NC "appears to respond to combat rate increasers, unlike normal
noncombats", which is why `gymnasiumTurn` runs at +combat. The 09-07 idea of flipping the gym to
−combat after the war would slow the NC down; it is dropped.

### 2.3 School: one hallpass, two dud NCs

`Halls Passing in the Night` (cowl/rope) requires a hallpass in inventory. Gold had two: one
dropped by the natural teacher at `gold:` t14 (Talk to Some Fish + Refracted Gaze + Sweat
Bullets, `gold:6098` pull was the second) and got Halls Passing at t15 and t16. Today the pull
at `:5864` bought the cowl (`:5869`); afterwards `pullBudgetAllows` was false (17 pulls used,
3 reserved: train whistle, skate blade, ink bladder). Every teacher/monitor/punisher today was
Back-Up'd into a golem (`:6083` `:6137` `:6194` `:6252` `:6320` `:6374`): the backup wrapper
runs before `schoolLootMacro`, so no hallpass could drop. Two NCs went to the bathrooms
(`:5999`) and the closet (`:6297`) before `Raising Cane` (`:6418`) gave the rope.

### 2.4 Mom mid-run turns

Bakery crêep `:7442` (avoidable, §2.1 step 4) and Peanut `:7610` (mandatory; gold paid him in
the finish). Net Mom cost vs gold is +1.

## 3. Variance, not fixable

- Pantry: the one-time Dolphin King NC (+1).
- Yog-Urt: gold's bat wings refund (+1 today).
- Locker draws: +3 vs gold, +1 vs expectation.
- Pirate Day wanderer: +1 today, 0 under fix 1 below.

Structural today: 7 (gym copies) + 1 (bakery) + 2 (school) = 10 of the 13.

## 4. Ranked fixes (ALL BUILT + deployed 2026-09-19 17:0x, uncommitted on main; not live-verified)

1. **Gym filter, non-mer-kin branch** (`fights.ts` `gladiatorFilter`): BUILT. Non-mer-kin in the
   gym now takes a non-banishing free run (`gymFreeRun(monster, { banish: false })`), then the
   first worn free-kill rung (`freeKillChain`), and only then `killMacro`. Worth 7 today. The
   corral (09-17: 4 eye charges there) is engine-driven and not touched.
2. **Abyss Habitats + Banish Constructs gates** (`mom.ts`, `lib/habitat.ts`, `lib/cyberlane.ts`):
   BUILT. `eyeRecallPays` = fights the copies save against the bar left after the recall fight,
   floored, must exceed the Bakery turn (1 while the screech is unlanded). Both tasks `ready`
   on `!cyberLaneStuck()`; Abyss Habitats completes and its recall opener empties when the
   recall no longer pays; `banishConstructsReady` needs `recallPays` on the habitat-free branch.
   `cyberLaneStuck` now reads the refusal only while the golems are still live, so a drained
   habitat can reopen the lane when the bar still pays (24 after the fallback: yes; 30: no).
   Tests: `test/habitat.test.ts`, `test/cyberlane.test.ts` (today's t26 and t28 cases).
3. **Second golem recall** (`outpost.ts` recallPending): BUILT. `secondGolemRecallWanted` needs
   `LOCKKEY_GATE - (turnsSpent + 1) >= 5`; today (20 before the fight, gate 25) it is skipped.
   The golem Back-Up (`farmBackup`) no longer waits for two recalls, so it fills the gap.
4. **School loot** (`school.ts` Cowl and Rope): BUILT. `hallpassLootWanted` (no hallpass in
   inventory or closet, cowl/rope still missing, a drop-safe free kill selectable for the
   school) turns the golem Back-Up off, and the loot macro there also covers the monitor. The
   engine's `.kill()` upgrade then lands the free kill after fish talk + Gaze, the gold t14
   sequence. Without a free kill the Back-Up stays (a paid teacher for a maybe-hallpass is
   not worth it). Worth ≤2.
5. **Crystal ball off by default** — BUILT + deployed 2026-09-19 16:38 (uncommitted): user rule,
   the engine avoids the ball unless a task sets `crystalBall: true` (like `batWings`), and the
   four hand-rolled maximize callers (gym, skate park, Colosseum, burn) add `-equip`. Worth 1
   (the echo eye `:8425`).
