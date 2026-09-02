# F. Cross-cutting free-fight & resource ledger (gold 2026-08-21 vs yesterday 2026-08-30)

Inputs: `docs/superpowers/research/runs/gold-uts-2026-08-21.log` (G:, 9,948 lines) and
`docs/superpowers/research/runs/subaqua-2026-08-30.log` (Y:, 15,134 lines). Method: one awk pass
per log over `[N]`, `Encounter:`, `Round N:`, `> CCS:` and `Preference … changed` lines produced a
row per `Round 0:` block (turn, zone, monster, every player action, every daily-counter pref that
moved, end marker); a classifier then named how each fight ended. Full per-combat ledger in
Appendix A. Nothing under `src/` was touched.

**Free/paid rule used.** A combat is FREE when its block prints `This combat did not cost a turn`
OR the next `[N]` marker repeats the same N. The two agree on every fight except the saber
Force (mafia prints no message, but N does not advance: G:3517/3553/7507, Y:3509/3553/4877/4903).

## 1. Turn / combat accounting (reconciled)

|                                         | gold    | yesterday |
| --------------------------------------- | ------- | --------- |
| `[N]` adventure markers                 | 173     | 229       |
| turns                                   | 41      | 119       |
| combats (`Round 0:` blocks)             | **118** | **165**   |
| free combats                            | **104** | **80**    |
| paid combats                            | **14**  | **85**    |
| non-combat turns (turns − paid combats) | 27      | 34        |

Headline said gold ~87 free / yesterday ~69 free. My counts are higher because (i) the 101/76
`did not cost a turn` messages plus 3/4 message-less saber Forces are all turn-free by the N rule,
and (ii) no other combat block is ambiguous — all 14/85 paid fights advance N by exactly one.

Per zone (combats only):

| zone                                               | gold free | gold paid | yest free | yest paid |
| -------------------------------------------------- | --------- | --------- | --------- | --------- |
| Mer-kin Elementary School                          | 11        | 0         | 1         | **30**    |
| Mer-kin Gymnasium                                  | 4         | 0         | 2         | **15**    |
| The Caliginous Abyss                               | 4         | 2         | 3         | **9**     |
| Mer-kin Colosseum                                  | 8         | 7         | 7         | 8         |
| The Coral Corral                                   | 6         | 0         | 9         | **7**     |
| Mer-kin Library                                    | 6         | 0         | 0         | **5**     |
| The Mer-Kin Outpost                                | 26        | 0         | 22        | **4**     |
| Madness Bakery                                     | –         | –         | 0         | 2         |
| Anemone Mine (Grandpa/digpick)                     | –         | –         | 0         | 2         |
| durable dolphin whistle                            | –         | –         | 0         | 1         |
| The Haunted Pantry                                 | 1         | 3         | 5         | 0         |
| Shadow Rift                                        | 16        | 0         | 11        | 0         |
| Cyberzone 1                                        | 6         | 0         | 9         | 0         |
| The Marinara Trench                                | 6         | 0         | 6         | 0         |
| Yog / Shub (temple doors)                          | 0         | 2         | 0         | 2         |
| Seaceress (Center Door)                            | 1         | 0         | 1         | 0         |
| locket / mimic egg / Garden / Wreck / Skate / misc | 8         | 0         | 4         | 0         |

## 2. Per-source table

"uses" = fights the source ENDED (free kill / run / banish) unless marked †(non-ending). Turns are
`[N]` values. Δ is yesterday − gold.

### 2a. Free kills

| source                | gold                                                                                           | yesterday                                                                       | Δ                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| BCZ: Sweat Bullets    | 11 — t9–16: Outpost 6 (healers), Trench 3 (giant squid), Corral 1 (cowboy), School 1 (monitor) | 11 — all t10 Outpost (6 healers + 5 backup-healer copies)                       | 0 count; yesterday exhausted it in one turn                      |
| shadow brick          | 11 thrown / 10 kills — School 8 (t17), Abyss 2 (t40); 1 glanced off Peanut t38                 | 3 — t22 Corral, all on tumbleweeds                                              | **−7 kills**; 0 bricks acquired yesterday (G: 12 acquired, Y: 0) |
| Shattering Punch      | 3 — t6 Garden flytrap, t6 Wreck goblin, t16 Abyss eye                                          | 3 — t10 Outpost (healer + 2 backup-healer copies)                               | 0                                                                |
| Chest X-Ray           | 1 — t24 Abyss eye (2 unused)                                                                   | 3 — t1 Pantry macaroni, t5 Trench squid ×2                                      | +2, all spent by t5                                              |
| Gingerbread Mob Hit   | 1 — t17 School teacher                                                                         | 1 — t10 Outpost healer                                                          | 0                                                                |
| Darts: Bullseye       | 2 casts / 1 kill — t6 miss, **t12 Outpost healer**                                             | 8 casts / 3 kills — **t1 Pantry asparagus**, t51 School teacher, t111 Abyss eye | ELR cooldown burned at t1 on junk                                |
| Assert your Authority | 0                                                                                              | 2 — t18 Abyss slithering thing, school of many                                  | +2                                                               |
| Spit jurassic acid    | 0                                                                                              | 1 — t2 Garden flytrap                                                           | +1                                                               |
| Club 'Em Back in Time | 5 — t31 Colosseum                                                                              | 5 — t100 Colosseum                                                              | 0                                                                |
| saber Force           | 3 — t16 locket diver, t16 egg diver, **t20 Library researcher**; 2 unused                      | 4 — t16 diver ×2, **t19 sea cow ×2**; researcher never Forced                   | +1 used, researcher lost                                         |

### 2b. Free runs / banishes

| source                                                                | gold                                                            | yesterday                                                  | Δ                                 |
| --------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------- |
| Bowl a Curveball                                                      | 6 — Outpost 3, Trench 1, Corral 1, Gym 1 (t8–29)                | 6 — Outpost 3, Trench 1, Corral 1, Gym 1 (t3–98)           | 0                                 |
| Feel Hatred                                                           | 3 — t14 Outpost burglar, t16 Corral rustler, **t29 Gym poseur** | 3 — t14–15 Outpost (raider, healer, healer; stashbox hunt) | 0 count; none left for gym/corral |
| Throw Latte                                                           | 1 — **t29 Gym trainer**                                         | 1 — **t4 Trench diving belle**                             | 0 count                           |
| Snokebomb                                                             | 1 — t30 Gym poseur (2 unused)                                   | 1 — t22 Corral rustler (**2 unused**)                      | 0                                 |
| Reflex Hammer                                                         | 0 (3 unused)                                                    | 1 — t22 Corral cow (**2 unused**)                          | +1                                |
| Asdon bumper                                                          | 0                                                               | 1 — t6 Outpost raider                                      | +1                                |
| Spring Away                                                           | 1 — t2 Pantry                                                   | 2 — t1 Pantry, t98 Gym                                     | +1                                |
| Spring Kick †                                                         | 0                                                               | **16** — Gym t75–98, no fight ended                        | +16                               |
| ink bladder                                                           | 2 — t16 Corral (rustler, cowboy after waffle)                   | 0 (one in inventory Y:1817)                                | −2                                |
| Sea \*dent lightning bolt                                             | 2 — t16 Cyberzone purplehat hacker, t39 Abyss school of many    | 1 — t110 Abyss                                             | −1                                |
| GAP / navel ring / boots / parasol / pinkslip / stinkbomb / Blank-Out | 0                                                               | 0                                                          | –                                 |

### 2c. Intrinsically free fights

| source                                      | gold                                                                                                      | yesterday                                                                                             | Δ                                     |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Shadow Rift fights                          | 16 (t16)                                                                                                  | 11 (t19)                                                                                              | −5                                    |
| Cyberzone 1                                 | 6 — all eye in the darkness                                                                               | 9 — 5 slithering thing + **4 greenhat hackers**                                                       | +3 fights, 4 wasted on hackers        |
| habitat golem copies (Recall Facts ×)       | recalls 3 (t10 locket, **t14 Outpost golem**, t16 Abyss eye); 11 free golem fights (Outpost 10, locket 1) | recalls 2 (t6 locket, t18 Abyss); 5 golem fights (locket 1, Outpost 4→backed up to healers, Trench 1) | **−1 recall, −5 free Outpost fights** |
| backup-camera copies                        | 7 — Outpost golem ×3 (t14), Corral eye (t16), Library golem ×3 (t20)                                      | 8 — Outpost healer ×7 (t10), Corral slithering (t18, **paid**)                                        | +1; library copies 0                  |
| Kramco sausage goblins                      | 5 — t6 Wreck, t14 Outpost, t20 Library, t25 Skate ×2                                                      | **0** (Kramco never equipped, 0 mentions)                                                             | −5                                    |
| bat wings flap                              | 4 — Colosseum t32 ×2, t36; Seaceress t42                                                                  | 3 — Colosseum t100, t103; Seaceress t119                                                              | −1                                    |
| Spooky VHS copies                           | 2 — recorded t16 & t24 (Abyss eye), redeemed t24, t32                                                     | 1 — recorded t108, redeemed t116                                                                      | −1                                    |
| time cop / Trick-or-Treat / Dig up skeleton | 1 / 1 / 1                                                                                                 | 0 / 0 / 0                                                                                             | −3 (incidental)                       |
| Artistic Goth Kid crayon wanderers          | 0                                                                                                         | 2 (t1 Pantry)                                                                                         | +2                                    |

### 2d. Non-ending combat resources (†)

| source                                                                                              | gold                                                                       | yesterday                                      | Δ                        |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------ |
| Macrometeorite re-roll                                                                              | **10** — all School t17 (`> UTS: Macrometeorite: re-rolling`, G:6646–7059) | 0                                              | −10                      |
| BCZ: Refracted Gaze                                                                                 | **12** — Corral opener 2 (t16), School 10 (t17)                            | 0                                              | −12                      |
| Swoop like a Bat / Perpetrate Mild Evil / Douse Foe / Septapus charm (brick yoinks on shadow slabs) | 5 / 3 / 3 (5 casts, 3 successes) / 3 — all rift t16                        | 0 / 0 / 0 / 0                                  | **12 shadow bricks → 0** |
| Recall Facts: Monster Habitats                                                                      | 3                                                                          | 2                                              | −1                       |
| waffle re-roll                                                                                      | 3 (Corral t16)                                                             | 3 (Corral t19 ×2, t20)                         | 0                        |
| Do an epic McTwist!                                                                                 | 1 (Corral opener t16)                                                      | **0** (`_epicMcTwistUsed` never changes)       | −1                       |
| Patriotic Screech (construct banish)                                                                | 2 — t14 Outpost golem fights (free)                                        | 2 — t16 & t116 Madness Bakery (**paid turns**) | 0 count, +2 turns        |
| Sea \*dent: Talk to Some Fish                                                                       | 31                                                                         | 12                                             | −19                      |
| monkey paw wishes                                                                                   | 3 (rift lasso ×2, corral lasso)                                            | 5 (t19: 4 rift lassos + 1)                     | +2                       |
| Cincho (`_cinchUsed`) / Apriling tuba / McHugeLarge Avalanche                                       | 5 / 3 / 0                                                                  | 1 / 3 / 3 (Gym t75–80)                         | NC forcers, other phases |
| autumn-aton quests / numberology 69                                                                 | 4 / 2                                                                      | 0 / 0                                          | non-combat               |
| sea lasso training throws                                                                           | 8                                                                          | 9                                              | 0                        |

## 3. Resources gold used that yesterday never used / used less — and where they are (not) wired

| resource                                                                                                                                                                                   | gold use                                                                                                                     | yesterday                                                                                                                                                              | wired in SubAqua?                                                                                                                                                                                                                                                        | what stopped it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shadow-brick yoinks** (Swoop like a Bat 11/day, Perpetrate Mild Evil 3/day, Douse Foe 3/day, Septapus charm ×3) on shadow slabs — 12 bricks (G:5285–5320, 5473, 5641; drops G:5297–5668) | 12 bricks → 10 free kills                                                                                                    | 0 bricks acquired; 3 leftover thrown at tumbleweeds (Y:6291–6358)                                                                                                      | **Not wired** — `src/tasks/monkees/shadow.ts:34-38` "Septapus charms, bat-wing swoops, Mild Evil and FLUDA dousing are deliberately not ported"; brick as a free kill IS wired (`src/resources/freekill.ts:162-169`) but `itemAmount === 0`                              | Design decision. Availability on 08-30: bat wings owned/worn (Y:13684), Pocket Guide skill 226 is permanent (`_mildEvilPerpetrated` 3/day, mafia dailylimits.txt:159), Sept-Ember Censer visited with 7 embers unspent (Y:48; gold traded 6 embers for 3 charms G:854), FLUDA deliberately not pulled (`src/tasks/init.ts:49`)                                                                                                                                                                                                                                                    |
| **Macrometeorite re-roll** ×10 (school teacher/punisher → fresh draw; ash CCS:1012-1016 `rerollEnemy`)                                                                                     | 10                                                                                                                           | 0                                                                                                                                                                      | **Not wired** anywhere (`grep Macrometeorite src/` → nothing)                                                                                                                                                                                                            | Missing feature. Skill availability UNVERIFIED (gold's checklist prints `✗ Macrometeorite` at G:711 yet casts it 10×; Micrometeorite from the same book was cast 88× yesterday)                                                                                                                                                                                                                                                                                                                                                                                                   |
| **BCZ: Refracted Gaze** ×12 (drop doubler: corral opener gave 2 cowbell/2 leather/2 lasso/2 six-shooter G:4599-4610; school cheatsheets)                                                   | 12                                                                                                                           | 0                                                                                                                                                                      | **Not wired** as a cast — only referenced as the library's `bczWanted()` accessory (`src/tasks/sorceress/library.ts:135-136`) and a moods comment                                                                                                                        | Missing feature; zirconia owned (Sweat Bullets cast 11×)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Second golem habitat recall at the Outpost** (ash CCS:669-675) → 5 more free outpost fights                                                                                              | recall #2 at G:2545 inside the last habitat golem fight (`_monsterHabitatsFightsLeft 1→0` at encounter, recall cast round 1) | never; recalls 2/3                                                                                                                                                     | Wired: `src/tasks/monkees/outpost.ts:64-75` `golemRecallMacro()`                                                                                                                                                                                                         | **Code defect**: gate `get("_monsterHabitatsFightsLeft") === 0` is read at customize() before the fight; mafia decrements at ENCOUNTER, so the last golem fight (Y:2598, fightsLeft 1→0) was compiled without the recall step (CCS at Y:2592 has no `7485`; Y:2634 onward has it, but no golem ever came again). Compounded by the engine prepending the backup step (`src/engine/engine.ts:271-275`): that fight was backed up into a healer on round 1 (Y:2599), so a `monsterid 1188`-scoped recall would have been skipped anyway                                             |
| **Kramco Sausage-o-Matic** off-hand → 5 free goblins that still advance zone `turns_spent`                                                                                                 | 5                                                                                                                            | 0                                                                                                                                                                      | **Not wired** (only a pull note, `src/tasks/init.ts:337`); gold equips it in 11 maximizer lines                                                                                                                                                                          | Missing feature; owned (same account, gold "equip off-hand Kramco" ×11)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Do an epic McTwist! on the corral opener** (+Refracted Gaze +free kill) — whole corral kit in one free fight                                                                             | 1 (G:4570-4610: Back-Up→eye, Gaze, McTwist, Sweat Bullets; drops 2×cowbell/leather/lasso)                                    | 0 — opener backed up into a slithering thing then killed **paid** with Saucegeyser (Y:4763-4800)                                                                       | Wired: `src/tasks/monkees/corral.ts:250-268`                                                                                                                                                                                                                             | **Code defect**: McTwist is registered as a monster macro scoped to the sea cow (`.macro(…McTwist…, cow)`, CCS Y:4751 `if monsterid 775;…skill 7447`) while the same task's `backup:` turns the fight into an Abyss copy on round 1 — the guard can never be true after the backup. No Refracted Gaze, and no free kill fired on the copy (freeKillTargetDropsMatter: Corral drop-safe, but the eye/slithering thing rows are not in the zone's kill upgrade because the upgrade's `reserved` list excludes nothing here — UNVERIFIED why Sweat Bullets did not fire; gold's did) |
| **Backed-up fights are not free by themselves**                                                                                                                                            | gold's copies were free because they were golems (free monsters) or ended by Sweat Bullets                                   | Y:4763 backup→slithering thing, Saucegeyser, **turn spent** (N 18→19)                                                                                                  | `src/resources/backup.ts:11-12` states "a backed-up fight refunds its adventure"                                                                                                                                                                                         | Premise is wrong on this evidence; the corral opener's "Mom progress on a refunded turn" (`corral.ts:255-256`) only holds when a free kill follows                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Saber Force on the Mer-kin researcher** (both dreadscroll combat scrolls in one free fight, G:7507)                                                                                      | 1                                                                                                                            | 0 — researcher killed paid (Y library t66-71)                                                                                                                          | Wired: `src/tasks/sorceress/library.ts:172-173` `forceItems(researcher)` gated by `forceGranted("researcher")`                                                                                                                                                           | **Budget**: `src/resources/saber.ts:93-100` `seaCowNeeded()` is `cowbell < 3` — permanently true after taming eats the three cowbells — so one Force stays reserved; pool = 5 − 2 diver − 0 healer − 1 seaCow = 2, and both were spent on sea cows at t19 (Y:4877, 4903). Same formula as the ash (Globals:906-939) — gold never needed cow Forces because the opener's McTwist delivered the kit (row above)                                                                                                                                                                     |
| **Latte / Feel Hatred / Snokebomb banked for the gymnasium**                                                                                                                               | gym = 4 free runs (curveball, latte, hatred, snoke) + 4 NCs in 4 turns (G:8196-8437)                                         | latte spent t4 Trench (diving belle, Y banishedMonsters "Throw Latte on Opponent:3"), hatred ×3 spent t14-15 Outpost stashbox, snoke/reflex 2 each **unspent all day** | Trench: `src/tasks/monkees/grandpa.ts:32-35` `freeRunBanishes: true` + `.freeRun()` unconditional; ash only banish-runs there while the bowling ball is in hand (CCS:649-651)                                                                                            | (b) missing gate on the Trench; gym unspent charges = Spring Kick shadowing (next row)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Spring Kick then Spring Away** (ash CCS:90-93)                                                                                                                                           | 0 kicks needed                                                                                                               | 16 bare kicks at the gym (t75-98), every fight then paid                                                                                                               | `src/resources/freerun.ts:69-84` now kick→away (post-run fix, unverified live); **`src/resources/banish.ts:59-63` still a bare kick** used by every `.banish()` action (corral/outpost/pellet/helmet)                                                                    | Code defect; while ELG is down the kick sits above snokebomb/reflex in both ladders and shadows them                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Chest X-Ray kept for the Abyss                                                                                                                                                             | 1 used t24, 2 unused                                                                                                         | all 3 gone by t5                                                                                                                                                       | Ladder order `src/resources/freekill.ts:85-196` puts X-Ray (#4) ahead of Sweat Bullets (#5) — the ash's is Sweat Bullets before X-Ray (CCS:24-26); pantry X-Ray came from the free-run→free-kill fallthrough `src/resources/freerun.ts:341` on `guild.ts:126 .freeRun()` | Ordering deviation + fallthrough                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Darts bullseye kept for a drop-mattering fight                                                                                                                                             | t12 Outpost healer                                                                                                           | t1 Pantry asparagus (ELR 50 → next bullseye t51)                                                                                                                       | `src/engine/combat.ts:145-153` puts a 5× bullseye chain at the head of EVERY kill ladder; the ash bullseyes only from `free_kill()` at its call sites (CCS:7-14, 24-26)                                                                                                  | Policy divergence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ink bladder as a free run                                                                                                                                                                  | 2 (corral)                                                                                                                   | 0, one held                                                                                                                                                            | `src/resources/freerun.ts:219-225` (last in the run ladder); absent from `banish.ts`, which is the ladder corral `.banish()` uses                                                                                                                                        | Ladder membership                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Sea \*dent lightning on non-habitat Cyberzone draws (CCS:899-900)                                                                                                                          | 1 (t16 purplehat hacker)                                                                                                     | 0 (4 greenhat hackers fought)                                                                                                                                          | `src/tasks/monkees/mom.ts:297` rocks the habitat pair only, kill ladder otherwise                                                                                                                                                                                        | Missing step (costs cyber free-fight budget, not turns, unless the 10/day cap binds)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Second Spooky VHS tape                                                                                                                                                                     | 2 tapes used                                                                                                                 | 1                                                                                                                                                                      | `src/tasks/monkees/mom.ts:146` window                                                                                                                                                                                                                                    | UNVERIFIED (window/state)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Patriotic Screech on a free golem fight (CCS:676-679) instead of a Bakery turn                                                                                                             | 2 free                                                                                                                       | 2 paid Bakery turns (t16, t116)                                                                                                                                        | `src/tasks/monkees/outpost.ts:56-63` `screechTurn()` needs `fightsLeft === 1 && recalled >= 2`                                                                                                                                                                           | Never true because recall #2 never happened (row 4); fell back to `Mom/Banish Constructs` at the Bakery                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Resources yesterday used that gold did not: Assert your Authority ×2 (t18 Abyss), Spit jurassic
acid (t2 flytrap), Reflex Hammer, Asdon bumper, McHugeLarge Avalanche ×3 (gym NC forcer during
the war), Goth Kid wanderers ×2, Spring Kick ×16. None of these is a loss in itself.

## 4. Fights yesterday paid for that gold made free in the same zone

| zone            | monster                                 | yest paid | yest free (source)                       | gold paid | gold free (source)                                          |
| --------------- | --------------------------------------- | --------- | ---------------------------------------- | --------- | ----------------------------------------------------------- |
| School          | Mer-kin punisher                        | 11        | –                                        | 0         | shadow brick ×4                                             |
| School          | Mer-kin monitor                         | 10        | –                                        | 0         | shadow brick ×2, Sweat Bullets ×1                           |
| School          | Mer-kin teacher                         | 9         | bullseye ×1                              | 0         | shadow brick ×2, Mob Hit ×1                                 |
| Gym             | Mer-kin juicer                          | 5         | curveball ×1                             | 0         | curveball ×1                                                |
| Gym             | Mer-kin poseur                          | 5         | Spring Away ×1                           | 0         | Feel Hatred ×1, Snokebomb ×1                                |
| Gym             | Mer-kin trainer                         | 5         | –                                        | 0         | Throw Latte ×1                                              |
| Abyss           | eye in the darkness                     | 4         | bullseye ×1                              | 0         | Shattering Punch, Chest X-Ray, shadow brick                 |
| Abyss           | slithering thing                        | 3         | Assert ×1                                | 0         | shadow brick ×1                                             |
| Outpost         | Mer-kin healer                          | 4         | Sweat ×6, Punch, Mob Hit, Feel Hatred ×2 | 0         | bullseye, Sweat ×6, backup golem copies ×2                  |
| Library         | Mer-kin drifter                         | 3         | –                                        | 0         | backup golem copy ×2                                        |
| Library         | Mer-kin alphabetizer                    | 1         | –                                        | 0         | backup golem copy ×1                                        |
| Library         | Mer-kin researcher                      | 1         | –                                        | 0         | saber Force                                                 |
| Corral          | Mer-kin rustler                         | 3         | curveball, Snokebomb                     | 0         | Feel Hatred, ink bladder                                    |
| Corral          | tumbleweed                              | 3         | shadow brick ×3                          | 0         | never met one (waffle/peridot/ball)                         |
| Corral          | sea cowboy                              | 1         | –                                        | 0         | Sweat Bullets, ink bladder, tame                            |
| Colosseum       | balldodger / bladeswitcher / netdragger | 2 / 2 / 2 | Club ×5, wings ×2                        | 1 / 1 / 3 | Club ×5, wings ×3                                           |
| Bakery          | gingerbread murderer, baguette lady     | 1 + 1     | –                                        | –         | (screeched on a free Outpost golem)                         |
| Anemone Mine    | Mer-kin miner, killer clownfish         | 1 + 1     | –                                        | –         | –                                                           |
| dolphin whistle | rotten dolphin thief                    | 1         | –                                        | –         | –                                                           |
| Pantry          | meat blob ×2, tomatoes                  | 0         | –                                        | 3         | (gold paid here; yesterday free-killed with X-Ray/bullseye) |

Sum of yesterday's paid fights in zones gold kept at zero paid: School 30 + Gym 15 + Outpost 4 +
Library 5 + Corral 7 + Abyss 7 (beyond gold's 2) + Bakery 2 + Mine 2 + whistle 1 = **73 of the
85 paid combats**; the remaining 12 are the same boss/colosseum/pantry fights gold also paid (±1).

## 5. Ranked findings (turns recoverable, resource-attributable)

Estimates attribute the observed per-zone Δ to the resource in question; they overlap with the
phase reports and are not additive beyond ~60.

1. **Shadow-brick supply (12 → 0) — ≈10 turns.** (b) missing feature. Evidence G:5285-5320
   (Septapus, Swoop, Mild Evil, 5× Douse Foe on one slab → 3 bricks), bricks G:5297-5668; uses
   G:6716-7106 (School ×8), G:9562/9627 (Abyss ×2). Yesterday Y: no `acquire an item: shadow
brick`; `_shadowBricksUsed` 0→3 at Y:6291-6358 on tumbleweeds. Code: `shadow.ts:34-38`
   (explicit non-port), rift kill ladder `shadow.ts:39-48`. Change: on `shadow slab`, before the
   kill ladder, throw Septapus charm (buy 3 for 6 embers at init), `Swoop like a Bat` (needs bat
   wings worn — `riftOutfit()` `shadow.ts:50-55`), `Perpetrate Mild Evil`, and `Douse Foe` while
   `_douseFoeSuccess` is false if the FLUDA is worn; and stop the corral tumbleweed brick spend
   (`freekill.ts:249-263` Corral entry / corral.ts Tame Seahorse) so bricks reach the School.
2. **Gymnasium banish budget — ≈11-16 turns** (gym 20 vs 4 turns; 15 paid fights vs 0).
   (a) `banish.ts:59-63` bare Spring Kick and pre-fix `freerun.ts` (16 kicks Y:11432-13036,
   every fight then paid; snokebomb 2/3 and Reflex Hammer 2/3 never reached because the kick
   sat above them while ELG was down). (b) latte spent on a Trench diving belle at t4 (Y:1717
   CCS, banish record `Throw Latte on Opponent:3`) — `grandpa.ts:32-35` vs CCS:649-651's
   bowling-ball gate; Feel Hatred ×3 at the Outpost stashbox hunt t14-15 (Y:2789-3210 CCS) vs
   gold's 1. Gold's gym: G:8196-8437 (curveball t29, latte t29, hatred t29, snoke t30, four
   `Ators Gonna Ate` NCs). Change: kick→away in `banish.ts` too; gate Trench banish-runs on the
   ball; reserve latte/hatred/snoke (or require ≥3 concurrent banish holders) before the gym.
3. **Corral opener never fires McTwist/Gaze and pays its turn — ≈7 corral + 2-5 library turns.**
   (a) code defect. Gold G:4570-4610 vs yesterday Y:4750-4800; `_epicMcTwistUsed` never set
   yesterday. `corral.ts:250-268` scopes McTwist to `cow` while `backup:` (corral.ts:259-262)
   converts the fight; engine prepends the backup (`engine.ts:271-275`). Downstream: 2 sea-cow
   Forces (Y:4877, 4903) → `forceGranted("researcher")` false (`saber.ts:93-100, 148-179`) →
   library researcher paid (gold Forced it at G:7507 for both scrolls). Change: register McTwist
   - Refracted Gaze unscoped on the opener (they must run AFTER the back-up, before the kill),
     and let `seaCowNeeded()` release once `seahorseName` is set.
4. **Second golem habitat recall at the Outpost — ≈4 turns** (Outpost 10 vs 6 turns; gold 26
   free fights there, yesterday 22 and 4 paid healers Y:2795-3016). (a) code defect:
   `outpost.ts:64-75` reads `_monsterHabitatsFightsLeft === 0` at compile; mafia decrements at
   encounter (Y:2598 `1→0` before `Round 0`), so the last habitat golem (Y:2598-2620) had no
   recall step and was backed up into a healer round 1. Gold: G:2525-2550 (recall inside that
   fight). Also disables `screechTurn()` (`outpost.ts:56-63`) → 2 paid Bakery turns (Y:3617,
   14696). Change: emit the recall when `fightsLeft <= 1`, and suppress the backup on that fight.
5. **Macrometeorite re-rolls at the School — ≈5-8 turns (UNVERIFIED share of the 31-turn School
   Δ).** (b) not wired. G:6646-7059, 10 casts turning teacher/punisher draws into new draws
   (CCS:1012-1016). Yesterday: 30 paid school fights (Y:7202, 9135 CCS: plain kill ladder).
   Change: a `reroll` step on non-target school monsters (Macrometeorite 10/day, then waffle).
6. **Early spend of Chest X-Ray ×3 and the t1 bullseye — ≈2-3 turns.** (a)/(policy).
   Y:1111-1120 (bullseye + ELR 50 on an asparagus), Y:1027-1161 CCS (Guild Test), X-Ray at t1
   pantry and t5 squids ×2 vs gold Sweat Bullets on squids (G:1779-2034 phase). Code:
   `combat.ts:145-153` bullseye chain on every kill ladder; `freerun.ts:341` fallthrough;
   `freekill.ts` X-Ray-before-Sweat order vs CCS:24-26. Gold's abyss used X-Ray (t24) and had 2
   spare; yesterday's abyss paid 9. Change: match the ash order and drop the bullseye chain from
   fallback ladders on non-drop fights.
7. **Kramco not equipped — ≈2-3 turns.** (b). 5 free goblins in gold advanced Outpost/Library
   `turns_spent` (G:1734 Wreck, 2637 Outpost, 7418 Library, 7866/7921 Skate). Change: add Kramco to item-drop
   outfits where the off-hand is free (gold's maximizer lines).
8. **Refracted Gaze at the School (10 casts) — UNVERIFIED turns**, folded into finding 5's
   cheatsheet math. (b).
9. **Second VHS tape / lightning bolt on cyber hackers / ink bladder — ≈1 turn each.** (b)/(c).
10. **Colosseum, bosses, Trench, rift, cyber, pantry: parity.** Club ×5, bat-wing flaps 3 vs 4,
    curveball distribution identical, seahorse tamed on the first attempt both days.

## 6. What I could not verify

- Whether `Macrometeorite` is castable on this account today (gold's own checklist marks it ✗
  at G:711 while casting it 10×).
- Why no free kill fired on the corral-opener copy yesterday (Y:4763-4800) when gold's identical
  fight ended in Sweat Bullets — the compiled CCS at Y:4751 is truncated in the log.
- The exact Mom-progress value per free source (VHS eye, cyber slithering vs eye) — Phase E.
- Whether the post-run `freerun.ts` kick→away fix actually yields 3 concurrent gym banishes live.

## Appendix A. Per-combat ledger (every `Round 0:` block, both logs)

Outcome rule: FREE if the block prints `This combat did not cost a turn` OR the next `[N]` repeats the same N (the saber Force prints no message but the turn count does not move). Every other `wins the fight` is a paid kill.

### Gold 2026-08-21 (118 combats: 104 free, 14 paid)

```
log-line  turn  zone | monster -> outcome
L1253   t2    The Haunted Pantry | fiendish can of asparagus -> free run: Spring Away
L1308   t2    The Haunted Pantry | overdone flame-broiled meat blob -> paid kill
L1383   t3    The Haunted Pantry | possessed can of tomatoes -> paid kill
L1438   t4    The Haunted Pantry | overdone flame-broiled meat blob -> paid kill
L1570   t6    An Octopus's Garden | Neptune flytrap -> free kill: Shattering Punch
L1663   t6    Dig up a skeleton | remaindered skeleton -> free fight: Dig up a skeleton
L1734   t6    The Wreck of the Edgar Fitzsimmons | sausage goblin -> free kill: Shattering Punch
L1863   t8    The Marinara Trench | diving belle -> banish: Bowl a Curveball
L1898   t9    The Marinara Trench | giant squid -> free kill: BCZ Sweat Bullets
L1951   t9    The Marinara Trench | giant squid -> free kill: BCZ Sweat Bullets
L1986   t9    The Marinara Trench | giant squid -> free kill: BCZ Sweat Bullets
L2086   t10   Combat Lover's Locket | Black Crayon Golem -> free fight: habitat copy
L2164   t10   The Mer-Kin Outpost | Mer-kin raider -> banish: Bowl a Curveball
L2226   t12   The Mer-Kin Outpost | Black Crayon Golem -> free fight: free monster (The Mer-Kin Outpost)
L2275   t12   The Mer-Kin Outpost | Mer-kin healer -> free kill: darts bullseye
L2334   t12   The Mer-Kin Outpost | Mer-kin healer -> free kill: BCZ Sweat Bullets
L2407   t13   The Mer-Kin Outpost | Black Crayon Golem -> free fight: free monster (The Mer-Kin Outpost)
L2452   t13   The Mer-Kin Outpost | Black Crayon Golem -> free fight: free monster (The Mer-Kin Outpost)
L2497   t14   The Mer-Kin Outpost | Black Crayon Golem -> free fight: free monster (The Mer-Kin Outpost)
L2534   t14   The Mer-Kin Outpost | Black Crayon Golem -> free fight: habitat copy
L2574   t14   The Mer-Kin Outpost | Black Crayon Golem -> free fight: free monster (The Mer-Kin Outpost)
L2607   t14   The Mer-Kin Outpost | Mer-kin raider -> banish: Bowl a Curveball
L2637   t14   The Mer-Kin Outpost | sausage goblin -> free fight: Kramco goblin
L2675   t14   The Mer-Kin Outpost | Mer-kin burglar -> banish: Feel Hatred
L2700   t14   The Mer-Kin Outpost | Black Crayon Golem -> free fight: free monster (The Mer-Kin Outpost)
L2734   t14   The Mer-Kin Outpost | Black Crayon Golem -> free fight: free monster (The Mer-Kin Outpost)
L2768   t14   The Mer-Kin Outpost | Black Crayon Golem -> free fight: free monster (The Mer-Kin Outpost)
L2818   t14   The Mer-Kin Outpost | Black Crayon Golem -> free fight: free monster (The Mer-Kin Outpost)
L2862   t14   The Mer-Kin Outpost | Black Crayon Golem -> free fight: free monster (The Mer-Kin Outpost)
L2912   t14   The Mer-Kin Outpost | Mer-kin healer -> free fight: backup-camera copy
L2956   t14   The Mer-Kin Outpost | Mer-kin healer -> free fight: backup-camera copy
L2994   t14   The Mer-Kin Outpost | Mer-kin raider -> free fight: backup-camera copy
L3037   t14   The Mer-Kin Outpost | Mer-kin raider -> banish: Bowl a Curveball
L3064   t14   The Mer-Kin Outpost | Mer-kin healer -> free kill: BCZ Sweat Bullets
L3104   t14   The Mer-Kin Outpost | Mer-kin healer -> free kill: BCZ Sweat Bullets
L3134   t14   The Mer-Kin Outpost | Mer-kin healer -> free kill: BCZ Sweat Bullets
L3190   t14   The Mer-Kin Outpost | Mer-kin healer -> free kill: BCZ Sweat Bullets
L3241   t15   The Mer-Kin Outpost | Mer-kin healer -> free kill: BCZ Sweat Bullets
L3517   t16   Combat Lover's Locket | unholy diver -> saber Force
L3553   t16   mimic egg | unholy diver -> saber Force
L3672   t16   The Caliginous Abyss | eye in the darkness -> free kill: Shattering Punch
L3751   t16   Cyberzone 1 | eye in the darkness -> free fight: Cyberzone
L3895   t16   Cyberzone 1 | eye in the darkness -> free fight: Cyberzone
L4051   t16   Cyberzone 1 | purplehat hacker -> free fight: Cyberzone
L4096   t16   Cyberzone 1 | eye in the darkness -> free fight: Cyberzone
L4233   t16   Cyberzone 1 | eye in the darkness -> free fight: Cyberzone
L4370   t16   Cyberzone 1 | eye in the darkness -> free fight: Cyberzone
L4577   t16   The Coral Corral | sea cowboy -> free kill: BCZ Sweat Bullets
L4871   t16   Shadow Rift (The Misspelled Cemetary) | shadow guy -> free fight: Shadow Rift
L4930   t16   Shadow Rift (The Misspelled Cemetary) | shadow guy -> free fight: Shadow Rift
L4991   t16   Shadow Rift (The Misspelled Cemetary) | shadow tree -> free fight: Shadow Rift
L5045   t16   Shadow Rift (The Misspelled Cemetary) | shadow tree -> free fight: Shadow Rift
L5130   t16   Shadow Rift (The Misspelled Cemetary) | shadow guy -> free fight: Shadow Rift
L5212   t16   Shadow Rift (The Misspelled Cemetary) | shadow tree -> free fight: Shadow Rift
L5274   t16   Shadow Rift (The Misspelled Cemetary) | shadow slab -> free fight: Shadow Rift
L5415   t16   The Coral Corral | sea cow -> banish: Bowl a Curveball
L5470   t16   Shadow Rift (The Misspelled Cemetary) | shadow slab -> free fight: Shadow Rift
L5585   t16   The Coral Corral | Mer-kin rustler -> banish: Feel Hatred
L5638   t16   Shadow Rift (The Misspelled Cemetary) | shadow slab -> free fight: Shadow Rift
L5758   t16   The Coral Corral | Mer-kin rustler -> free run: ink bladder
L5811   t16   Shadow Rift (The Misspelled Cemetary) | shadow slab -> free fight: Shadow Rift
L5906   t16   The Coral Corral | sea cowboy -> free run: ink bladder
L5957   t16   Shadow Rift (The Misspelled Cemetary) | shadow guy -> free fight: Shadow Rift
L6050   t16   The Coral Corral | sea cowboy -> seahorse tamed (cowbell+lasso)
L6118   t16   Shadow Rift (The Misspelled Cemetary) | shadow tree -> free fight: Shadow Rift
L6179   t16   Shadow Rift (The Misspelled Cemetary) | shadow slab -> free fight: Shadow Rift
L6234   t16   Shadow Rift (The Misspelled Cemetary) | shadow guy -> free fight: Shadow Rift
L6284   t16   Shadow Rift (The Misspelled Cemetary) | shadow tree -> free fight: Shadow Rift
L6341   t16   Shadow Rift (The Misspelled Cemetary) | shadow tree -> free fight: Shadow Rift
L6580   t16   Mer-kin Elementary School | Mer-kin monitor -> free kill: BCZ Sweat Bullets
L6642   t17   Mer-kin Elementary School | Mer-kin teacher -> free kill: Gingerbread Mob Hit
L6716   t17   Mer-kin Elementary School | Mer-kin monitor -> free kill: shadow brick
L6760   t17   Mer-kin Elementary School | Mer-kin punisher -> free kill: shadow brick
L6824   t17   Mer-kin Elementary School | Mer-kin teacher -> free kill: shadow brick
L6876   t17   Mer-kin Elementary School | Mer-kin monitor -> free kill: shadow brick
L6925   t17   Mer-kin Elementary School | Mer-kin punisher -> free kill: shadow brick
L6981   t17   Mer-kin Elementary School | Mer-kin punisher -> free kill: shadow brick
L7054   t17   Mer-kin Elementary School | Mer-kin teacher -> free kill: shadow brick
L7106   t17   Mer-kin Elementary School | Mer-kin punisher -> free kill: shadow brick
L7152   t17   Mer-kin Elementary School | time cop -> free fight: free monster (Mer-kin Elementary School)
L7334   t20   Trick-or-Treating | Timmy Rotten, the Trespasser -> free fight: Trick-or-Treating
L7371   t20   Mer-kin Library | Black Crayon Golem -> free fight: free monster (Mer-kin Library)
L7418   t20   Mer-kin Library | sausage goblin -> free fight: Kramco goblin
L7458   t20   Mer-kin Library | Mer-kin alphabetizer -> free fight: backup-camera copy
L7507   t20   Mer-kin Library | Mer-kin researcher -> saber Force
L7532   t20   Mer-kin Library | Mer-kin drifter -> free fight: backup-camera copy
L7585   t20   Mer-kin Library | Mer-kin drifter -> free fight: backup-camera copy
L7714   t24   The Marinara Trench | eye in the darkness -> free (UNCLASSIFIED)
L7772   t24   The Caliginous Abyss | eye in the darkness -> free kill: Chest X-Ray
L7866   t25   The Skate Park | sausage goblin -> free fight: Kramco goblin
L7921   t25   The Skate Park | sausage goblin -> free fight: Kramco goblin
L8059   t26   Mer-kin Temple (Right Door) | Yog-Urt, Elder Goddess of Hatred -> paid kill
L8246   t29   Mer-kin Gymnasium | Mer-kin juicer -> banish: Bowl a Curveball
L8298   t29   Mer-kin Gymnasium | Mer-kin trainer -> banish: Throw Latte
L8334   t29   Mer-kin Gymnasium | Mer-kin poseur -> banish: Feel Hatred
L8382   t30   Mer-kin Gymnasium | Mer-kin poseur -> banish: Snokebomb
L8570   t31   Mer-kin Colosseum | Mer-kin balldodger -> free kill: Club 'Em Back in Time
L8630   t31   Mer-kin Colosseum | Mer-kin balldodger -> free kill: Club 'Em Back in Time
L8694   t31   Mer-kin Colosseum | Mer-kin netdragger -> free kill: Club 'Em Back in Time
L8766   t31   Mer-kin Colosseum | Mer-kin bladeswitcher -> free kill: Club 'Em Back in Time
L8830   t31   Mer-kin Colosseum | Mer-kin balldodger -> free kill: Club 'Em Back in Time
L8897   t31   Mer-kin Colosseum | Mer-kin netdragger -> paid kill
L8966   t32   The Marinara Trench | eye in the darkness -> free (UNCLASSIFIED)
L9041   t32   Mer-kin Colosseum | Mer-kin bladeswitcher -> free fight: bat wings flap
L9103   t32   Mer-kin Colosseum | Mer-kin balldodger -> free fight: bat wings flap
L9148   t32   Mer-kin Colosseum | Mer-kin netdragger -> paid kill
L9195   t33   Mer-kin Colosseum | Mer-kin bladeswitcher -> paid kill
L9230   t34   Mer-kin Colosseum | Mer-kin balldodger -> paid kill
L9270   t35   Mer-kin Colosseum | Mer-kin netdragger -> paid kill
L9328   t36   Mer-kin Colosseum | Mer-kin bladeswitcher -> free fight: bat wings flap
L9367   t36   Mer-kin Colosseum | Georgepaul, the Balldodger -> paid kill
L9403   t37   Mer-kin Colosseum | Johnringo, the Netdragger -> paid kill
L9474   t38   The Caliginous Abyss | Peanut -> paid kill
L9517   t39   The Caliginous Abyss | school of many -> paid kill
L9562   t40   The Caliginous Abyss | slithering thing -> free kill: shadow brick
L9627   t40   The Caliginous Abyss | eye in the darkness -> free kill: shadow brick
L9723   t41   Mer-kin Temple (Left Door) | Shub-Jigguwatt, Elder God of Violence -> paid kill
L9863   t42   Mer-kin Temple (Center Door) | The Nautical Seaceress -> free fight: bat wings flap
```

### Yesterday 2026-08-30 (165 combats: 80 free, 85 paid)

```
log-line  turn  zone | monster -> outcome
L1041   t1    The Haunted Pantry | Knob Goblin Assistant Chef -> free run: Spring Away
L1106   t1    The Haunted Pantry | fiendish can of asparagus -> free kill: darts bullseye
L1168   t1    The Haunted Pantry | undead elbow macaroni -> free kill: Chest X-Ray
L1202   t1    The Haunted Pantry | Black Crayon Undead Thing -> free fight: free monster (The Haunted Pantry)
L1250   t1    The Haunted Pantry | Black Crayon Undead Thing -> free fight: free monster (The Haunted Pantry)
L1536   t2    An Octopus's Garden | Neptune flytrap -> free kill: Spit jurassic acid (yellow ray)
L1675   t3    The Marinara Trench | Mer-kin diver -> banish: Bowl a Curveball
L1717   t4    The Marinara Trench | diving belle -> banish: Throw Latte
L1758   t5    The Marinara Trench | giant squid -> free kill: Chest X-Ray
L1802   t5    The Marinara Trench | giant squid -> free kill: Chest X-Ray
L1887   t6    Combat Lover's Locket | Black Crayon Golem -> free fight: habitat copy
L1953   t6    The Mer-Kin Outpost | Mer-kin raider -> banish: Asdon bumper
L2021   t7    The Mer-Kin Outpost | Mer-kin burglar -> banish: Bowl a Curveball
L2089   t10   The Mer-Kin Outpost | Mer-kin healer -> free kill: BCZ Sweat Bullets
L2139   t10   The Mer-Kin Outpost | Black Crayon Golem -> free kill: BCZ Sweat Bullets
L2182   t10   The Mer-Kin Outpost | Black Crayon Golem -> free kill: BCZ Sweat Bullets
L2231   t10   The Mer-Kin Outpost | Black Crayon Golem -> free kill: BCZ Sweat Bullets
L2276   t10   The Mer-Kin Outpost | Mer-kin healer -> free kill: BCZ Sweat Bullets
L2314   t10   The Mer-Kin Outpost | Mer-kin healer -> free kill: BCZ Sweat Bullets
L2355   t10   The Mer-Kin Outpost | Mer-kin healer -> free kill: BCZ Sweat Bullets
L2410   t10   The Mer-Kin Outpost | Black Crayon Golem -> free kill: BCZ Sweat Bullets
L2453   t10   The Mer-Kin Outpost | Mer-kin burglar -> free kill: BCZ Sweat Bullets
L2521   t10   The Mer-Kin Outpost | Mer-kin healer -> free kill: BCZ Sweat Bullets
L2557   t10   The Mer-Kin Outpost | Mer-kin healer -> free kill: BCZ Sweat Bullets
L2599   t10   The Mer-Kin Outpost | Black Crayon Golem -> free kill: Shattering Punch
L2641   t10   The Mer-Kin Outpost | Mer-kin healer -> free kill: Shattering Punch
L2677   t10   The Mer-Kin Outpost | Mer-kin burglar -> free kill: Shattering Punch
L2724   t10   The Mer-Kin Outpost | Mer-kin burglar -> banish: Bowl a Curveball
L2754   t10   The Mer-Kin Outpost | Mer-kin healer -> free kill: Gingerbread Mob Hit
L2795   t10   The Mer-Kin Outpost | Mer-kin healer -> paid kill
L2852   t11   The Mer-Kin Outpost | Mer-kin healer -> paid kill
L2957   t12   The Mer-Kin Outpost | Mer-kin healer -> paid kill
L3016   t13   The Mer-Kin Outpost | Mer-kin healer -> paid kill
L3135   t14   The Marinara Trench | Black Crayon Golem -> free fight: free monster (The Marinara Trench)
L3218   t14   The Mer-Kin Outpost | Mer-kin healer -> banish: Feel Hatred
L3249   t14   The Mer-Kin Outpost | Mer-kin healer -> banish: Feel Hatred
L3296   t15   The Mer-Kin Outpost | Mer-kin raider -> banish: Feel Hatred
L3329   t15   The Mer-Kin Outpost | Mer-kin burglar -> banish: Bowl a Curveball
L3509   t16   Combat Lover's Locket | unholy diver -> saber Force
L3553   t16   mimic egg | unholy diver -> saber Force
L3628   t16   Madness Bakery | baguette lady -> paid kill
L3728   t17   The Caliginous Abyss | Peanut -> paid kill
L3801   t18   The Caliginous Abyss | school of many -> free kill: Assert your Authority
L3838   t18   The Caliginous Abyss | slithering thing -> free kill: Assert your Authority
L3908   t18   Cyberzone 1 | slithering thing -> free fight: Cyberzone
L4039   t18   Cyberzone 1 | greenhat hacker -> free fight: Cyberzone
L4084   t18   Cyberzone 1 | slithering thing -> free fight: Cyberzone
L4210   t18   Cyberzone 1 | greenhat hacker -> free fight: Cyberzone
L4257   t18   Cyberzone 1 | slithering thing -> free fight: Cyberzone
L4386   t18   Cyberzone 1 | slithering thing -> free fight: Cyberzone
L4513   t18   Cyberzone 1 | greenhat hacker -> free fight: Cyberzone
L4556   t18   Cyberzone 1 | greenhat hacker -> free fight: Cyberzone
L4607   t18   Cyberzone 1 | slithering thing -> free fight: Cyberzone
L4763   t18   The Coral Corral | sea cowboy -> paid kill
L4877   t19   The Coral Corral | sea cow -> saber Force
L4903   t19   The Coral Corral | sea cow -> saber Force
L5089   t19   Shadow Rift (The Misspelled Cemetary) | shadow guy -> free fight: Shadow Rift
L5162   t19   Shadow Rift (The Misspelled Cemetary) | shadow slab -> free fight: Shadow Rift
L5222   t19   Shadow Rift (The Misspelled Cemetary) | shadow tree -> free fight: Shadow Rift
L5292   t19   Shadow Rift (The Misspelled Cemetary) | shadow guy -> free fight: Shadow Rift
L5360   t19   Shadow Rift (The Misspelled Cemetary) | shadow guy -> free fight: Shadow Rift
L5436   t19   Shadow Rift (The Misspelled Cemetary) | shadow guy -> free fight: Shadow Rift
L5495   t19   Shadow Rift (The Misspelled Cemetary) | shadow slab -> free fight: Shadow Rift
L5571   t19   Shadow Rift (The Misspelled Cemetary) | shadow guy -> free fight: Shadow Rift
L5632   t19   Shadow Rift (The Misspelled Cemetary) | shadow guy -> free fight: Shadow Rift
L5710   t19   Shadow Rift (The Misspelled Cemetary) | shadow tree -> free fight: Shadow Rift
L5768   t19   Shadow Rift (The Misspelled Cemetary) | shadow tree -> free fight: Shadow Rift
L5931   t19   The Coral Corral | Mer-kin rustler -> banish: Bowl a Curveball
L5963   t19   The Coral Corral | Mer-kin rustler -> paid kill
L6047   t20   The Coral Corral | Mer-kin rustler -> paid kill
L6120   t21   The Coral Corral | Mer-kin rustler -> paid kill
L6215   t22   The Coral Corral | sea cow -> banish: Reflex Hammer
L6246   t22   The Coral Corral | Mer-kin rustler -> banish: Snokebomb
L6270   t22   The Coral Corral | tumbleweed -> free kill: shadow brick
L6304   t22   The Coral Corral | tumbleweed -> free kill: shadow brick
L6337   t22   The Coral Corral | tumbleweed -> free kill: shadow brick
L6371   t22   The Coral Corral | tumbleweed -> paid kill
L6411   t23   The Coral Corral | tumbleweed -> paid kill
L6455   t24   The Coral Corral | tumbleweed -> paid kill
L6492   t25   The Coral Corral | wild seahorse -> seahorse tamed (cowbell+lasso)
L6610   t25   Anemone Mine | killer clownfish -> paid kill
L6671   t26   Anemone Mine | Mer-kin miner -> paid kill
L7208   t32   Mer-kin Elementary School | Mer-kin monitor -> paid kill
L7311   t33   Mer-kin Elementary School | Mer-kin punisher -> paid kill
L7400   t34   Mer-kin Elementary School | Mer-kin punisher -> paid kill
L7493   t35   Mer-kin Elementary School | Mer-kin punisher -> paid kill
L7583   t36   Mer-kin Elementary School | Mer-kin teacher -> paid kill
L7725   t37   Mer-kin Elementary School | Mer-kin monitor -> paid kill
L7828   t38   Mer-kin Elementary School | Mer-kin monitor -> paid kill
L7928   t39   Mer-kin Elementary School | Mer-kin monitor -> paid kill
L8037   t40   Mer-kin Elementary School | Mer-kin punisher -> paid kill
L8124   t41   Mer-kin Elementary School | Mer-kin teacher -> paid kill
L8248   t42   Mer-kin Elementary School | Mer-kin teacher -> paid kill
L8368   t44   Mer-kin Elementary School | Mer-kin teacher -> paid kill
L8480   t45   Mer-kin Elementary School | Mer-kin monitor -> paid kill
L8601   t46   Mer-kin Elementary School | Mer-kin punisher -> paid kill
L8717   t47   Mer-kin Elementary School | Mer-kin punisher -> paid kill
L8819   t48   Mer-kin Elementary School | Mer-kin monitor -> paid kill
L8924   t49   Mer-kin Elementary School | Mer-kin teacher -> paid kill
L9035   t50   Mer-kin Elementary School | Mer-kin monitor -> paid kill
L9143   t51   Mer-kin Elementary School | Mer-kin teacher -> free kill: darts bullseye
L9243   t51   Mer-kin Elementary School | Mer-kin punisher -> paid kill
L9348   t52   Mer-kin Elementary School | Mer-kin monitor -> paid kill
L9450   t53   Mer-kin Elementary School | Mer-kin punisher -> paid kill
L9565   t55   Mer-kin Elementary School | Mer-kin punisher -> paid kill
L9671   t56   Mer-kin Elementary School | Mer-kin monitor -> paid kill
L9780   t57   Mer-kin Elementary School | Mer-kin teacher -> paid kill
L9919   t58   Mer-kin Elementary School | Mer-kin punisher -> paid kill
L10013  t59   Mer-kin Elementary School | Mer-kin teacher -> paid kill
L10129  t60   Mer-kin Elementary School | Mer-kin monitor -> paid kill
L10248  t61   Mer-kin Elementary School | Mer-kin punisher -> paid kill
L10345  t62   Mer-kin Elementary School | Mer-kin teacher -> paid kill
L10456  t64   Mer-kin Elementary School | Mer-kin teacher -> paid kill
L10627  t66   Mer-kin Library | Mer-kin drifter -> paid kill
L10718  t67   durable dolphin whistle | rotten dolphin thief -> paid kill
L10791  t68   Mer-kin Library | Mer-kin researcher -> paid kill
L10870  t69   Mer-kin Library | Mer-kin alphabetizer -> paid kill
L10963  t70   Mer-kin Library | Mer-kin drifter -> paid kill
L11071  t71   Mer-kin Library | Mer-kin drifter -> paid kill
L11258  t74   Mer-kin Temple (Right Door) | Yog-Urt, Elder Goddess of Hatred -> paid kill
L11420  t75   Mer-kin Gymnasium | Mer-kin juicer -> paid kill
L11571  t78   Mer-kin Gymnasium | Mer-kin poseur -> paid kill
L11693  t80   Mer-kin Gymnasium | Mer-kin trainer -> paid kill
L11811  t82   Mer-kin Gymnasium | Mer-kin juicer -> paid kill
L11893  t83   Mer-kin Gymnasium | Mer-kin poseur -> paid kill
L12031  t85   Mer-kin Gymnasium | Mer-kin poseur -> paid kill
L12107  t86   Mer-kin Gymnasium | Mer-kin trainer -> paid kill
L12181  t87   Mer-kin Gymnasium | Mer-kin trainer -> paid kill
L12323  t90   Mer-kin Gymnasium | Mer-kin juicer -> paid kill
L12414  t91   Mer-kin Gymnasium | Mer-kin juicer -> paid kill
L12502  t92   Mer-kin Gymnasium | Mer-kin poseur -> paid kill
L12584  t93   Mer-kin Gymnasium | Mer-kin poseur -> paid kill
L12662  t94   Mer-kin Gymnasium | Mer-kin trainer -> paid kill
L12765  t95   Mer-kin Gymnasium | Mer-kin trainer -> paid kill
L12844  t96   Mer-kin Gymnasium | Mer-kin juicer -> paid kill
L13034  t98   Mer-kin Gymnasium | Mer-kin poseur -> free run: Spring Away
L13107  t98   Mer-kin Gymnasium | Mer-kin juicer -> banish: Bowl a Curveball
L13321  t100  Mer-kin Colosseum | Mer-kin balldodger -> free kill: Club 'Em Back in Time
L13392  t100  Mer-kin Colosseum | Mer-kin balldodger -> free kill: Club 'Em Back in Time
L13457  t100  Mer-kin Colosseum | Mer-kin netdragger -> free kill: Club 'Em Back in Time
L13532  t100  Mer-kin Colosseum | Mer-kin bladeswitcher -> free kill: Club 'Em Back in Time
L13598  t100  Mer-kin Colosseum | Mer-kin balldodger -> free kill: Club 'Em Back in Time
L13667  t100  Mer-kin Colosseum | Mer-kin netdragger -> free fight: bat wings flap
L13708  t100  Mer-kin Colosseum | Mer-kin bladeswitcher -> paid kill
L13750  t101  Mer-kin Colosseum | Mer-kin balldodger -> paid kill
L13790  t102  Mer-kin Colosseum | Mer-kin netdragger -> paid kill
L13831  t103  Mer-kin Colosseum | Mer-kin bladeswitcher -> free fight: bat wings flap
L13875  t103  Mer-kin Colosseum | Mer-kin balldodger -> paid kill
L13915  t104  Mer-kin Colosseum | Mer-kin netdragger -> paid kill
L13971  t105  Mer-kin Colosseum | Mer-kin bladeswitcher -> paid kill
L14017  t106  Mer-kin Colosseum | Georgepaul, the Balldodger -> paid kill
L14058  t107  Mer-kin Colosseum | Johnringo, the Netdragger -> paid kill
L14173  t108  The Caliginous Abyss | eye in the darkness -> paid kill
L14243  t109  The Caliginous Abyss | eye in the darkness -> paid kill
L14296  t110  The Caliginous Abyss | school of many -> paid kill
L14342  t111  The Caliginous Abyss | eye in the darkness -> free kill: darts bullseye
L14378  t111  The Caliginous Abyss | eye in the darkness -> paid kill
L14420  t112  The Caliginous Abyss | eye in the darkness -> paid kill
L14485  t113  The Caliginous Abyss | slithering thing -> paid kill
L14531  t114  The Caliginous Abyss | slithering thing -> paid kill
L14592  t115  The Caliginous Abyss | slithering thing -> paid kill
L14667  t116  The Marinara Trench | eye in the darkness -> free (UNCLASSIFIED)
L14699  t116  Madness Bakery | gingerbread murderer -> paid kill
L14855  t118  Mer-kin Temple (Left Door) | Shub-Jigguwatt, Elder God of Violence -> paid kill
L15006  t119  Mer-kin Temple (Center Door) | The Nautical Seaceress -> free fight: bat wings flap
```
