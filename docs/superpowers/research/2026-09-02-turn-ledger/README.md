# Turn ledger: every turn, the resource that made it free, and what was left unspent

Gold = `docs/gold-star-run.txt` (UTS 2026-08-21, 41 turns). Ours = `docs/2026-09-02-run.txt`
(SubAqua 2026-09-02, 45 turns). Line numbers below are into those two files.

Method: `ledger.py` splits each log at every `[N]` marker and reads the block's encounter, choices,
combat actions and daily-counter preference changes. A block cost a turn when the next marker's N
is one higher; the last block costs a turn unless it printed `This combat did not cost a turn`.
Both logs reconcile exactly (gold 173 blocks / 41 paid, ours 179 / 45). The per-block tables are
`A-gold-events.md` and `B-subaqua-0902-events.md`; the combat classification for gold's 118 fights
agrees with `2026-08-31-gold-trace/F-resource-ledger.md` Appendix A. Daily-charge totals come
from the last value of every `_`-prefixed preference in each log.

## Headline

1. **Gold is not minimal against its own kit.** Four of its 41 turns were paid while a resource
   that buys exactly that turn sat unspent all day: three pantry kills (Snokebomb 2/3 unused,
   Chest X-Ray 2/3 unused, Assert your Authority 0/3 used, saber Force 2/5 unused) and one of the
   two `Into the Outpost` visits (ours proved a monkey-paw wish replaces it). Gold's
   deterministic floor with the same account is **37**; the rest of its 41 is quest structure
   (27 non-combat turns) and bosses.
2. **Ours is gold +4, and the four split cleanly.** Three are ours to fix (Bakery screech on a
   paid fight, a paid Abyss eye while a Shattering Punch was still in hand, the skate-blade
   pull), one was already fixed after this run (blade), and the rest is a 1/(X+2) bat-wings roll
   that went gold's way by three procs. We also _saved_ three turns gold spent (pantry luck,
   Outpost wish, Yog-Urt wings proc).
3. **The single biggest unaddressed sink in both runs is the Haunted Pantry.** Every paid pantry
   fight (gold 3, ours 2) happened with banishes, free runs and non-combat forcers unspent. Ours
   ended the run with 5 parka spikes, a Cincho Fiesta Exit, 2 saber Forces and 3 unspent
   bat-wing charges; the pantry is the only place those turn into turns.
4. **Free kills cannot buy Colosseum rounds** (spec: gladiators are instakill-immune except
   Club 'Em Back in Time, `2026-08-11-subaqua-design.md:238`), so the 7–9 paid gladiator rounds,
   Peanut, school of many, Mom and the three temple bosses are the floor. Surplus free kills are
   worth turns only in the pantry, the early Abyss and the Outpost.

## 1. Where the 45 vs 41 went (per phase, by marker)

| phase                     | gold paid | ours paid | Δ      | why                                                                                    |
| ------------------------- | --------- | --------- | ------ | -------------------------------------------------------------------------------------- |
| Haunted Pantry            | 5         | 4         | −1     | NC roulette: sandwich came after 3 fights instead of 4 (both paid every pantry fight)  |
| Wreck                     | 1         | 1         | 0      |                                                                                        |
| Marinara Trench           | 3         | 3         | 0      |                                                                                        |
| Outpost colours + tent    | 6         | 5         | −1     | ours: cot → stashbox, wish → prayerbeads (`:3290`); gold: two tent visits + a pull     |
| Madness Bakery            | 0         | 1         | **+1** | second Patriotic Screech spent on a paid baguette lady (`:3745`); gold's two on golems |
| Abyss habitats            | 0         | 1         | **+1** | paid eye for Recall Facts + VHS (`:3881`) with Shattering Punch #2 unspent until t16   |
| School + Library + scroll | 6         | 6         | 0      |                                                                                        |
| Skate Park                | 4         | 5         | **+1** | bladeless `Picking Sides` (`:7767`); pull-queue deadlock, fixed post-run               |
| Yog-Urt                   | 1         | 0         | −1     | bat wings proc (`:7512`)                                                               |
| Gymnasium                 | 4         | 5         | +1     | headguard was the 5th of 5 random NC items (gold's 4th); expected value is 4           |
| Colosseum                 | 7         | 9         | +2     | bat wings: gold 3 procs in the block, ours 1                                           |
| Abyss finish + Mom        | 3         | 3         | 0      | Peanut, school of many, Mom                                                            |
| Shub-Jigguwatt            | 1         | 1         | 0      |                                                                                        |
| Seaceress                 | 0         | 1         | +1     | gold's 4th wings proc landed on the Seaceress (`gold:9891`); ours was paid             |
| **total**                 | **41**    | **45**    | **+4** |                                                                                        |

## 2. Gold's 41 paid turns, one row each

"could be free via" names a resource gold still had at run end. Floor = quest structure or boss;
no resource in the kit removes it.

| turn  | zone           | what the turn bought                | class                   | could be free via                                                       |
| ----- | -------------- | ----------------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| 1     | Pantry         | `Cut Down in His Prime` (wrong NC)  | variance                | nothing; the free-skippable NCs (Singing Tree) were skipped free        |
| 2     | Pantry         | meat blob, paid kill                | **avoidable**           | Snokebomb (2 left), X-Ray (2 left), Authority (3 left), Force (2 left)  |
| 3     | Pantry         | can of tomatoes, paid kill          | **avoidable**           | same                                                                    |
| 4     | Pantry         | meat blob, paid kill                | **avoidable**           | same                                                                    |
| 5     | Pantry         | `A Sandwich Appears!`               | floor                   |                                                                         |
| 6     | Wreck          | `Down at the Hatch` (tuba-forced)   | floor                   |                                                                         |
| 7–9   | Trench         | three quest NCs                     | floor                   |                                                                         |
| 10–13 | Outpost        | four colour NCs                     | floor                   |                                                                         |
| 14    | Outpost        | tent → cot → prayerbeads            | floor (1 of 2)          |                                                                         |
| 15    | Outpost        | tent → altar → stashbox             | **avoidable**           | wish for prayerbeads and take the stashbox from the cot (ours, `:3290`) |
| 16–17 | School         | Scaly Bully, Graffiti               | floor                   |                                                                         |
| 18–19 | School         | `Halls Passing in the Night` ×2     | floor                   |                                                                         |
| 20    | Library        | `Hook, Line and Sinker`             | floor                   |                                                                         |
| 21    | dreadscroll    | Read Aloud                          | floor                   | seed pinned first try                                                   |
| 22–25 | Skate Park     | Sickpipe, Prayer, Rollerbawl, Holey | floor                   |                                                                         |
| 26    | Yog-Urt        | boss, paid                          | variance                | 5th bat-wings proc (random; ours got it)                                |
| 27–30 | Gymnasium      | four `Ators Gonna Ate` items        | floor (E=4)             | order of the five gym items is random                                   |
| 31–35 | Colosseum      | five unnamed gladiators             | floor                   | instakill-immune; only bat-wings procs (random)                         |
| 36–37 | Colosseum      | Georgepaul, Johnringo               | floor                   |                                                                         |
| 38    | Abyss          | Peanut                              | floor                   | brick glanced off (`gold:9481`) → boss                                  |
| 39    | Abyss          | school of many                      | floor (unverified boss) |                                                                         |
| 40    | Abyss          | Mom NC                              | floor                   |                                                                         |
| 41    | Shub-Jigguwatt | boss                                | floor                   |                                                                         |

Gold's floor: 41 − 4 avoidable = **37**, minus whatever the wings roll gives (0–3 more).

## 3. Ours: the 45, same treatment

Only rows that differ from gold's table are listed; everything else is the same floor row.

| turn  | zone           | what the turn bought                    | class         | could be free via                                                                                                                     |
| ----- | -------------- | --------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Pantry         | `Spirit of the Dolphin King` (wrong NC) | variance      |                                                                                                                                       |
| 2     | Pantry         | can of tomatoes, paid kill              | **avoidable** | at t2 unspent: Snokebomb 3, Feel Hatred 3, bander runaways 5, spikes 5, Exit 1                                                        |
| 3     | Pantry         | drunken half-orc hobo, paid kill        | **avoidable** | same                                                                                                                                  |
| 13    | Outpost        | tent → cot → stashbox; wish → beads     | floor (1)     | this is the turn gold paid twice for                                                                                                  |
| 14    | Madness Bakery | baguette lady, killed with Screech #2   | **avoidable** | put the screech on a free fight: gold cast both on habitat golems (`gold:2824,2870`)                                                  |
| 15    | Abyss          | eye in the darkness, Recall Facts + VHS | **avoidable** | Shattering Punch #2 (cast at t16 on a school teacher, `:6624`); the task macro is `.kill()` with no free-kill rung (`mom.ts:247-251`) |
| 23    | Skate Park     | `Picking Sides` (bladeless)             | fixed         | skate blade pull; 3 pulls expired unused (`2026-09-02-trace/skate-colosseum.md`)                                                      |
| 26–30 | Gymnasium      | five gym NCs                            | variance      | headguard came 5th                                                                                                                    |
| 32–40 | Colosseum      | seven unnamed + two named               | floor         | wings rolled 1 proc vs gold's 3                                                                                                       |
| 45    | Seaceress      | paid                                    | variance      | wings rolled 0 vs gold's 1                                                                                                            |

Ours floor: 45 − 5 (t2, t3, t14, t15, t23) = **40**, with three wings procs of pure variance
on top of that against gold's 41.

## 4. Resource inventory: what the account brings, what each run spent

Caps are per day. "unspent" is the end-of-run remainder. Line refs are for the first use.

### 4a. Free kills (win the fight, no turn)

| resource              | cap  | gold used                                    | ours used                          | unspent gold / ours | note                                                                                   |
| --------------------- | ---- | -------------------------------------------- | ---------------------------------- | ------------------- | -------------------------------------------------------------------------------------- |
| BCZ: Sweat Bullets    | 11   | 11 (Outpost 6, Trench 3, Corral 1, School 1) | 11 (Outpost 8, Corral 2, School 1) | 0 / 0               | ours needed 3 X-Rays on top at the Outpost (11 healer kills vs gold's 9)               |
| Shattering Punch      | 3    | 3 (flytrap, goblin, Abyss eye)               | 3 (flytrap, 2 school teachers)     | 0 / 0               | gold's third made the first Abyss eye free; ours paid that eye at t15                  |
| Gingerbread Mob Hit   | 1    | 1 (School)                                   | 1 (School)                         | 0 / 0               |                                                                                        |
| Chest X-Ray           | 3    | 1 (Abyss eye t24)                            | 3 (Outpost healers)                | **2** / 0           |                                                                                        |
| Assert your Authority | 3    | **0**                                        | 3 (Abyss finish)                   | **3** / 0           | Sheriff set is borrowed free at init in both runs (`gold:792`, `:757`)                 |
| shadow bricks         | 13   | 11 thrown, 10 kills                          | 12 thrown, 12 kills                | 1 / 0               | supply is the rift yoinks (12 both); gold: School 8, Abyss 2; ours: School 2, Abyss 10 |
| Club 'Em Back in Time | 5    | 5 (Colosseum)                                | 5 (Colosseum)                      | 0 / 0               | the only free kill that works on gladiators                                            |
| saber: Use the Force  | 5    | 3 (2 divers, researcher)                     | 3 (healer, 2 divers)               | **2** / **2**       | ends a fight free; does not count as a win                                             |
| Darts: bullseye       | roll | 2 hits                                       | 3 hits                             | –                   | chance-based, not a budget                                                             |
| Spit jurassic acid    | 1    | 0                                            | 0                                  | 1 / 1               | never cast in any logged run                                                           |

### 4b. Banishes and free runs (leave the fight, no turn)

| resource               | cap       | gold used                     | ours used                                    | unspent gold / ours | note                                                                |
| ---------------------- | --------- | ----------------------------- | -------------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| Snokebomb              | 3         | 1 (gym)                       | 3 (gym)                                      | **2** / 0           |                                                                     |
| Feel Hatred            | 3         | 3                             | 3                                            | 0 / 0               |                                                                     |
| Throw Latte            | 1         | 1 (gym)                       | 1 (gym)                                      | 0 / 0               |                                                                     |
| Bowl a Curveball       | cooldown  | 6                             | 5                                            | –                   |                                                                     |
| Spring Away            | 1 per ELG | 1 (pantry t2)                 | 1 (pantry t2)                                | –                   | then Everything Looks Green blocks it for the pantry's other fights |
| bander runaways        | weight/5  | **0**                         | 5 (gym)                                      | ~5 / 0              |                                                                     |
| peppermint parasol     | 3         | 0 (pulled at t26, never used) | not pulled                                   | 3 / –               | gold spent a pull on it for nothing                                 |
| Reflex Hammer          | 3         | 0                             | 0                                            | 3 / 3               | never cast in either run                                            |
| Patriotic Screech      | 2 windows | 2 (free golems)               | 2 (free cyber golem, **paid** baguette lady) | 0 / 0               |                                                                     |
| Macrometeorite re-roll | 10        | 10 (School)                   | 0                                            | 0 / 10?             | account has it (gold cast it); ours never references the skill      |
| BCZ: Refracted Gaze    | BCZ-bound | 12                            | 6                                            | –                   | re-roll, not an ender                                               |

### 4c. Non-combat forcers (skip the fights before the next NC)

| resource                | cap | gold used                           | ours used                                     | unspent gold / ours | note                                                                                                                                                    |
| ----------------------- | --- | ----------------------------------- | --------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apriling band tuba      | 3   | 3 (Wreck, rift, Skate Park)         | 3 (Wreck, rift, gym)                          | 0 / 0               |                                                                                                                                                         |
| Cincho: Fiesta Exit     | ~2  | 2 (Skate Park, with 2 cincho rests) | **0** (25 cinch on Party Soundtrack, `:3409`) | 0 / **1**           |                                                                                                                                                         |
| McHugeLarge Avalanche   | 3   | 0                                   | 3 (gym/skate)                                 | 3 / 0               | forcer only; the fight continues and a banish still has to end it (`:7641`)                                                                             |
| parka spikolodon spikes | 5   | **0**                               | **0**                                         | **5** / **5**       | `_spikolodonSpikeUses` never changes in any of the four logged runs; wired in `ncforce.ts:34` but gated by `fights.ts:161` (`warOpen && !forcerBanked`) |

A forcer only saves turns where the fights between NCs are _paid_. In both runs that is one zone:
the pantry. Everywhere else the fights are already free (banished, free-killed, or the zone is
free), so the forcers spent at the Wreck, rift, gym and skate park bought speed, not turns.

### 4d. Copies, wanderers and free fights

| resource                  | cap | gold used  | ours used      | unspent gold / ours | note                                                                                                       |
| ------------------------- | --- | ---------- | -------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| backup camera             | 11  | 7          | 6              | 4 / 5               | a copy is only free if something else ends it                                                              |
| combat lover's locket     | 3   | 2          | 2              | 1 / 1               |                                                                                                            |
| Monster Habitats recalls  | 3   | 3          | 3              | 0 / 0               |                                                                                                            |
| Spooky VHS tape           | 1   | 1          | 1              | 0 / 0               |                                                                                                            |
| mimic eggs                | 2   | 2          | 2              | 0 / 0               |                                                                                                            |
| Cyberzone 1 free fights   | 10  | 6 (6 wins) | 7 (**3 wins**) | 4 / 3               | ours lost 4 eye fights to the 30-round cap: cyber rock did 10/round vs gold's 12–13 (`:3962`, `gold:3757`) |
| bat wings free fights     | 5   | 4          | 2              | 1 / 3               | 1/(X+2) roll; wings were worn on every eligible fight in both runs                                         |
| Kramco sausage goblins    | ~   | 5          | 1              | –                   | gold wore the Kramco in item-drop outfits (F-ledger finding 7)                                             |
| time cop                  | 1   | 1          | 0              | 0 / 1               | Möbius ring wanderer                                                                                       |
| Artistic Goth Kid         | 7   | 0          | 1              | 7 / 6               |                                                                                                            |
| autumn-aton               | –   | 4 quests   | 0              | –                   | gold sent it from t5 (`gold:1508`)                                                                         |
| Archaeologist's Spade dig | 1   | 1          | 0              | 0 / 1               | gold's free skeleton fight let the Sword of S Words steal the wriggling pellet                             |

### 4e. Pulls and wishes

| resource             | cap | gold     | ours                   | note                                                                                               |
| -------------------- | --- | -------- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| pulls                | 20  | 20       | 17                     | ours: 3 expired behind a reservation deadlock (fixed); gold: parasol, ink bladder, pinkslip at t26 |
| monkey paw wishes    | 3   | 3 lassos | prayerbeads + 2 lassos | ours needed only two lasso wishes                                                                  |
| Sea \*dent lightning | 2?  | 2        | 1                      |                                                                                                    |

## 5. Mom's progress: 4 fights in gold, 15 in ours, all free but not cheap

`momSeaMonkeeProgress` needs 40. Gold's Abyss and Trench kills each gave **+3** (14 increments,
`gold:3719`…`9662`); ours gave +3 for the first two (t15 eye, one cyber eye) and **+2** for every
kill after (`:4963` onward, 17 increments). Combined with the four lost cyber eye fights, our
Mom finish needed 15 free fights (10 bricks + 3 Authority + 2 wanderers) where gold needed 4.

Turn cost: zero, because bricks covered it. Resource cost: ~11 free kills. Since free kills cannot
buy Colosseum rounds, that surplus would only have mattered in the pantry and at the t15 eye, so
this is a second-order finding. It is still the one mechanic in the ledger I cannot explain:
gear does not account for it (gold's +3 Trench kill at `gold:7749` wore paw, spring shoes and
Heartstone; ours wore black glass and shark jumper both times), nor Fishy, nor Jelly Combed.
Worth a read of how mafia derives the pref before any code changes.

## 6. Verdict and ranked actions

**Are we minimising?** Against gold, we are 4 over, 3 of which are addressable and 3 of which are
dice. Against the kit, neither run is minimal: both pay the pantry with a full hand of banishes
and forcers, and gold additionally leaves 5 free kills and 2 banishes unspent.

Ranked by turns per run, cheapest first:

1. **Pantry: stop paying for fights (2–3 turns, every run).** `Guild Test` is
   `.kill(crayonMonsters).freeRun()` under `-combat` (`guild.ts:86`). After the one Spring Away
   the ladder produced nothing, and both t2/t3 fights were killed with Snokebomb 3/3, Feel Hatred
   3/3 and 5 bander runaways untouched. Whatever the reservation logic withheld here, the gym
   later burned 10 run/banish charges for 5 NCs, so the pantry's claim is the better one. The
   spikes (5, never fired) or the Fiesta Exit (unspent) would also skip these fights outright.
2. **Abyss Habitats: let the eye fight end free (1 turn).** After Recall Facts and the VHS tape
   have been cast, add the free-kill rung; Punch #2 was in hand.
3. **Bakery: never make a paid trip for a screech (1 turn).** The second screech belongs on a
   free construct fight (habitat golem or cyber golem), as gold did.
4. **Skate blade (1 turn): fixed post-run**, verify on the next live run.
5. **Parka spikes: 5 forcers that have never fired in four runs.** Only worth turns in the
   pantry, but they are the cheapest way to take item 1 without touching the banish budget.
6. **Cyber eye fights: 4 of 5 lost to the round cap.** No turns lost, but it is why the Mom
   finish ate 10 bricks; the 500-moxie guard in `mom.ts:298` is the wrong test if rock damage is
   what varies.
7. **Not worth doing:** forcing bat wings harder (already worn on every eligible fight),
   Authority in the Colosseum (immune), Kramco (gold's 5 goblins advanced NC counters but the
   phases they touched are at parity now), autumn-aton and Möbius ring (no paid turn in either
   ledger traces to them).

## 6a. Shipped 2026-09-02 (unverified live)

1. **Pantry.** `guild.ts` Guild Test now fields the Pair of Stomping Boots while it has runaways
   left, the Goth Kid only otherwise. Root cause: the forced Goth Kid made the boots rung
   un-equippable, and every other non-banish rung is unowned, so after Spring Away the free-run
   ladder fell through to darts and a paid kill. Gold never fielded the Goth Kid.
2. **Abyss eye.** `engine.ts` free-kill selection (both the `killFree` provider and the
   kill-upgrade path) now iterates sources with `firstEquippable`, and `equipResource` trials
   multi-piece gear on a cloned outfit so a failed spec no longer leaves half an outfit on. Root
   cause at `:3879`: Assert your Authority was first in the ladder, its badge could not fit beside
   black glass + Peridot, and the old code returned instead of trying Sweat Bullets or Punch.
3. **Bakery screech.** `mom.ts` Cyber Mom no longer runs while the habitat is still the golem
   and no longer casts the screech (Cyberzone `:3685` shows no banish text and no
   `banishedPhyla` change, so that screech is a no-op there). Banish Constructs reminisces a
   golem from the locket when a charge is spare (diver hunt not active, or ≥ 2 summons left) and
   falls back to the Bakery only without one.

## 7. What this ledger cannot settle

- Whether `school of many` is free-kill-immune (both runs paid it with a lightning bolt).
- What sets Mom's +3 vs +2 per kill (§5).
- Whether Macrometeorite is castable on the account today: gold's own checklist prints ✗ at
  `gold:721` and then casts it ten times.
- The true cap of the Cincho Fiesta Exit with rests (gold managed two).
