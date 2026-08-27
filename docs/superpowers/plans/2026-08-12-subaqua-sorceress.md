# SubAqua Phase 4: Sorceress Endgame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the ash `sorceress()` spine from `seahorseName`-set through the Nautical Seaceress: teflon mining + crappy disguise, the three deepcity zones (Elementary/Library/Gymnasium), the dreadscroll solver with a native seedfinder port, the High Priest loop, skate-park war, Yog-Urt, colosseum, Shub-Jigguwatt, the finale, plus the net-turn-positive Phase 3 deferrals — ending with the full per-tier runplan composition and a public README.

**Architecture:** Per `docs/superpowers/specs/2026-08-11-subaqua-design.md` §5–§6, §8–§9. Quest-level state re-derives from mafia prefs (`isMerkinHighPriest`, `isMerkinGladiatorChampion`, `shubJigguwattDefeated`, `yogUrtDefeated`, `lastColosseumRoundWon`, `dreadScroll1..8`, `mineState3`); dynamic boss/gladiator fights run as `adv1(loc, -1, filter)` in-process callbacks (spec §5 Layer 2), everything else through Phase 1-3 `CombatStrategy` macros and `resources/` ladders. Seedfinder's seed-space math is ported from source (`/Users/xn/sites/KOL/seedfinder`, HEAD ad70b27) on top of mafia's own PHP-RNG builtins (`phpSeed`/`phpRand`/`phpMtRand`, JS-exposed in `kolmafia` typings:510-514).

**Tech Stack:** TypeScript on grimoire-kolmafia 0.3.33 / libram 0.11.23 / kolmafia typings, rollup (three CJS bundles), yarn 4.

**Source key** (all citations re-extracted 2026-08-12 from the NEW UnderTheSea HEAD `ab1105e`, branch chartreusenator — the Aug 8 line numbers in older plans are dead): UTS = `../UnderTheSea/scripts/UnderTheSea.ash` (3063 lines), G = `globals.ash` (1998), CCS = `UnderTheSeaCCS.ash` (1342), CH = `UnderTheSea_Choice.ash` (305), mafia = `../kolmafia/src/net/sourceforge/kolmafia/`, SF = `/Users/xn/sites/KOL/seedfinder/scripts/seedfinder/`.

**Upstream sync 2026-08-15 — UnderTheSea HEAD moved `ab1105e` → `c84c28b`.** All UTS/CCS/G line citations in this plan remain **ab1105e-pinned**: commit `c4a2f9b` ("Condense the commentary") rewrote 57 comment blocks with zero code changes, and `7ac379b` normalized CRLFs, so every line number shifted (UTS is now 2986 lines, CCS 1193, G 1961). Resolve any cite with `git -C ../UnderTheSea show ab1105e:scripts/<file>` rather than reading the working tree at the cited line. Functional deltas since ab1105e, all dispositioned — none change this plan's tasks:

- `611a915` (corral: never banish the lasso/leather source while its drop is needed; `doneWithCowboy` threshold 21 → 23 to reserve the tame's own lasso) — **ported to Phase 3 code** (`src/tasks/monkees/corral.ts`, 2026-08-15): `lassosDone()` now uses 23; the banish guard was already satisfied structurally by task ordering. `doneWithCowboy`/`doneWithSeaCow` now live at G:638-650/G:652-660 (HEAD).
- `c84c28b` (replace hand-rolled `universe()` solver with mafia's `reverse_numberology()`; drops `uniInt`/`uniAdv` globals and the sign map from G) — **no port**: numberology was dropped from SubAqua on net-turn grounds (Phase 3 plan, "Deliberate deferrals"); the drop decision stands, and the simpler built-in is noted here should live runs ever re-open it.
- `78cfbbe` (pearl farming: re-drive Waterproofly via Asdon instead of re-dressing; print-before-abort) and `76e2f03` (`uts_loop` pref: drain astral pilsners before the postloop farm) — **out of scope**: both live in `pearlResCheck`/`pearlPostloop`, and SubAqua ships no aftercore/postloop by design (spec scope).

**Upstream sync 2026-08-26 — UnderTheSea HEAD moved `c84c28b` → `89982f5`** (4 first-parent commits carrying a 113-commit astro/tottington merge: `3adbc6d`, `c8e98d6`, `9eb5cd7`, `6b7cd80`). `globals.ash` is now **`UnderTheSeaGlobals.ash`** (rename, 86% similar); every G cite in this plan still resolves at `git -C ../UnderTheSea show ab1105e:scripts/globals.ash`, and "at 89982f5" cites below name the new file. Sizes at 89982f5: UTS 3144, CCS 1207, G 2155, CH 327. Dispositions — Phase 1-3 ports landed on main the same day; Phase 4 deltas are recorded as **"Upstream 2026-08-26 amendment"** paragraphs under Tasks 5, 7, 8, 11, 12, 13, 14 and must be honored when those tasks execute:

- **Ported to Phase 1-3 code (2026-08-26):** `rivetHunt()` enters for a missing porthole/broken helmet too (`saber.ts diverHuntActive()`), and closes a 6-7/8 rivet gap with monkey-paw wishes then the one-rivet pull (new `helmet.ts` "Rivet Gap" task — the old pull sat behind `ready: rivetsDone` and never fired; new `resources/paw.ts`); `farmPrayerbeads()` wishes on the paw first (`outpost.ts` Prayerbeads prepare); guild unlock — the tearaway-pants moxie shortcut skipped the OCG visits (`guild.ts` Guild Finish now completes on `questG03Ego`), the Guilded Youth tests are noncombat hunts so Guild Test now free-runs (kill only the Goth Kid's crayon wanderers), wears -combat, fields the Artistic Goth Kid, and pulls a stored GAP; `freeRun()` gains the Pair of Stomping Boots (weight/5 runaways on `_banderRunaways`, `FightRequest.java:11861-11865`) and the navel ring, with the GAP/navel Waterproofly rule scoped to underwater zones; CCS `free_kill()` never spends Club 'Em Back in Time when drops matter (`dropSafe: false`); `doSWord()` lasso threshold 6 → 7 (`corral.ts swordOut()`); `iotmChecklist` detects Meteor Lore instead of Macrometeorite + guide, `skillChecklist()` ported into `subaqua sim` (trimmed to skills SubAqua casts), antidote added to the sim pull list; the FLUDA pull dropped from `init.ts` (it only serves the dropped shadow-rift subsystem — `9eb5cd7` gates it on the pay phone for the same reason). `MyActionDefaults.freeRun` now degrades to a kill on surface zones (the indigo taffy is underwater-only).
- **No port needed:** `use_familiar()` unowned-familiar guards (engine `createOutfit()` already strips them); monkey-castle visits in trunks (`underwater: true` tasks); corral `-equip peridot of peril` (engine `customize()` avoids the Peridot on every non-peridot task) and `codpiece()` per-insert NC / `unequip` cleanups (no in-run socketing); `summon()` returning false (our `summon()` aborts, and every caller's `ready()` gates on `summonsAvailable()`); Fitzsimmons `equipSwimTrunks()` loops; `pullEverything` abort + `reportRundownStalled` + `usePilsners` (postloop, out of scope); seahorse-tamer `cowbell`/`lasso` typo (our `seahorseMacro` already requires a lasso); stray `;` after the `Use the Force` guard (macros, not consults); crystal-ball/`trackedMonsters` lowercase compares (no crystal ball use; macros); the flytrap spade/skeleton-store chain incl. choices 1059/1596 (our pellet task is a single Peridot + forceItems fight); `shadowRift()` affinity gate, `bcz_gaze_ready()`/elementary `NCtoC` gates, `canBaseballBanish()`/baseball diamond (all in dropped subsystems); the photo-booth BAFH clan hop (auto-joining another clan is outside a public script's remit — our abort text already names BAFH; possession already decides in `completed()`).
- **Dropped, priced (table below):** Summon Taffy libram cast + red-taffy underwater throw, pulled-yellow-taffy YR source, Waffle Day / Kokomo dailies, `sea` maximizer keyword, Disco Nap for Marked by the Don.

## Global Constraints

- Runs inside KoLmafia's Rhino JS runtime — no Node APIs; `kolmafia` stays `external` in rollup.
- Script prefs are `subaqua_` (persistent) / `_subaqua_` (daily). New this phase: `subaqua_seedCandidates`, `subaqua_seedCandidatesAsc`, `subaqua_seedScanFloor` (all owned by `lib/dreadscroll.ts`). No other new prefs.
- `$item`/`$effect`/`$skill`/`$location`/`$monster` templates **module-level**; names pre-checked against `../kolmafia/src/data/*.txt` but `yarn lint` is the authority — if it rejects a name, find the real one in the data files and report the correction, never guess. New lagging-plugin names (if any) use the documented-eslint-disable convention from main (six existing sites, e.g. `src/tasks/monkees/corral.ts:30`) — verify the name is real in mafia data first.
- **No `user_confirm`**; aborts carry instructions. **No adventuring from engine hooks** (`post()` may call `dreadSeedCheck()` — pure pref reads/writes — but never adventures).
- Every adventuring task has a `limit`; every degradation explicit.
- Binding Phase 1-3 rulings honored: tier logic only in `runplans.ts` + `ResourcePolicy`; choice 1387 globally option 3 (run-wide property; **saber is NEVER equipped in the colosseum** — the CCS confirms its last-resort clause stays dead there, CCS:1220-1228); equip-gated provides; `hasBreathingEffect()` effects-only; black glass is an accessory (`equip:` array); grimoire CombatStrategy action methods take ONE arg.
- Combat filters (`(round, monster, text) => string`) return **libram `Macro` strings** (`Macro.…toString()`), never hand-built BALLS text. Filter invariants from the ash: every branch advances the round or aborts; never return an open fight (the ladder ends in `attack`); 3-strikes stuck-round abort (CCS:387-389, 490-492).
- Verification cycle: `yarn check && yarn lint` every task; `yarn build` additionally at Tasks 3, 4, 7, 12, 14. Commit after every task. GOTCHA: `yarn mafia` deploys from the CURRENT checkout's dist — never run it from the worktree unless deploying deliberately.

## Ground-truth corrections locked by research

These override spec-era shorthand; each was verified in mafia source or the new ash HEAD this phase's research pass:

1. **No telegraph counter-skill system exists in the ash** — no bust/sweat/sack keyword matching, no Ball/Net/Blade counter casts, anywhere at HEAD or eeb1ba5. The real colosseum regime is: **nuke-first opening** (1 special-free wind-up round, CCS:165-174, 416-426), delevel openers behind it (CCS:232-265), and a **bladeswitcher reflect-stall** read off each submitted action's response (CCS:209-217: `"twirling his blade around himself"` → 10, `"an especially dope move"` → 11), with a wording-independent backstop (bladeswitcher + >400 HP lost in one round → stall 10, CCS:474-477). Mafia's telegraph decorator (`FightDecorator.java:167-232`) documents the counter skills, but they require per-weapon critical-hit unlocks out of reach in-run (CCS:176-181) — the port ships the ash's stall regime and nothing else.
2. **No `% 3` weapon-rotation outfit exists in the ash** — every colosseum round wears the same spell-damage/mys outfit with a computed coefficient (UTS:2203-2219); kills are spell nukes. The `% 3` schedule (mafia `RelayRequest.java:1116-1200`: lastRound%3 → 0 balldodger/dragnet, 1 netdragger/switchblade, 2 bladeswitcher/dodgeball; bosses Georgepaul/Johnringo/Ringogeorge at rounds 13/14/15) is used only to know _which_ monster is next (the filter keys off `last monster` anyway).
3. **`gladiatorBladeMovesKnown` mafia bug confirmed** at `FightRequest.java:4926` (blade branch writes the Ball pref) — never read the `*MovesKnown` prefs.
4. **Mining pref is `mineState3`** (36-char row-major 6×6, `(row-1)*6+(col-1)`, codes `o`/`*`/`X`/`?`, `MineDecorator.java:76-103`); mine URL square is `which = row*8 + col` on the same 1-based coordinates (`MineDecorator.java:57-65`). The ash reads raw page text + `mineLayout3` instead — the port uses `mineState3`. The ash's square policy (G:585-632) is a fixed column-3 shaft (3,6)→(3,5)→(3,4)→(3,3)→(3,2)→(2,2)→(4,2)→(5,2), then promising sparkles at row<4 not adjacent to velcro/vinyl ore, then any sparkle at row<4. The spec §9 "prefer rows 4-6" note conflicts with the run-proven ash filter (`y_coor >= 4 → continue`); **the ash implementation wins** (the wiki likely counts rows from the other edge). "Never `grandpa mine`" = never ask Grandpa about mining (no code needed; nothing visits that dialog).
5. **"Ators Gonna Ate"** is Gymnasium choice **701** ("get an item" / skip — `ChoiceAdventures.java:3612-3619`). The ash's guard is: +combat mood/outfit and a hard abort when an NC-forcer is pending (UTS:638-639). No other special-casing exists.
6. **Wet Crap For Sale** is the Sea-path coinmaster `shop.php?whichshop=sandpenny` (`WetCrapForSaleRequest.java:9-30`). Stat buffs exist — scroll of sea strength/smarts/smarm, **1000 sand pennies** each, +250 mainstat underwater for 50 turns (npcstores.txt:476-478, modifiers.txt:7816-7818) — but the ash never buys them and wins the finale with the spell outfit alone; the port buys only sea gel (10), waterlogged scroll of healing (10), and water-logged pill (30) like the ash (UTS:2183-2188, 702-713, 2987-2991).
7. **Temple doors are not choices** — `sea_merkin.php?action=temple&subaction=left|center|right` locations. Gating (`KoLAdventure.java:2325-2411`): every deepcity zone needs `seahorseName` non-empty + the zone's Mer-kin outfit; Left Door = `isMerkinGladiatorChampion` && !`shubJigguwattDefeated` + Gladiatorial Gear; Right Door = `isMerkinHighPriest` && !`yogUrtDefeated` + Scholar's Vestments; Center Door = both gods dead, no outfit. Mafia auto-equips the required outfit on adventure (`prepareForAdventure`, KoLAdventure.java:2867-2890). `merkinQuestPath` is explicitly not maintained for Sea-path gating.
8. **Grandma barter rows** (coinmasters.txt:679-690): crappy mask = aerated diving helmet + 3 pristine fish scales (ROW124); crappy tailpiece = sea chaps + teflon swim fins + 3 scales (ROW125); gladiator mask/tailpiece = crappy piece + headguard/thighguard (ROW126/127); scholar mask/tailpiece = crappy piece + facecowl/waistrope (ROW129/130). The **reverse** rows (scholar→crappy 131/1619, gladiator→crappy 128/1618) are commented out in mafia's data — they work in-game only via raw `visitUrl("shop.php?whichshop=grandma&action=buyitem&quantity=1&whichrow=…")`, exactly as the ash does (UTS:2147-2152).
9. **`dreadScrollGuesses`** entries are `<8-digit-guess>:<wrong-count>`, wrong-count = failure-effect duration ÷ 3 (`DreadScrollManager.recordFailure`, 315-350). The existing choice.ts solver's exact-Hamming filter is correct.
10. **Mom's buff is real, free, and unclaimed by the ash**: `mom` CLI, 7 options (`MomRequest.java:43-55` — hot/cold/stench/spooky/sleaze = +7 res; critical = Mark of Candy Cain +20% crit/spell crit; stats = Cereal Killer +200 exp), 1/day (`_momFoodReceived`), requires the Sea Monkee quest **finished** and underwater gear (auto-equipped by mafia's Checkpoint).
11. **Micrometeorite has no daily cap** — `_micrometeoriteUses` models potency decay (−25% → −1%/use → −10% floor, `FightRequest.java:10522-10526`); the 10/day row belongs to Macrometeorite. The opener gate is moxie-based only (CCS:247-252).
12. **Eating any sushi with a Mer-kin worktea in inventory drinks the tea** and writes `dreadScroll7` (`SushiRequest.java:542-543` → `DreadScrollManager.handleWorktea`). Timing = "hold worktea, then eat a nigiri"; no special sushi.
13. **`isKBandSushiEnough()` has an off-by-one in the ash** (G:116-128): it tests seed answers `[4]`/`[7]` (0-based → game clues **5 and 8**) while `dreadSeedCheck` maps `dreadScrollX ← dreadscroll[x-1]`; it also concatenates pairs without a separator (false `contains_text` matches). The port tests clues 4 and 7 (indexes 3 and 6) with a real Set.
14. **`elementaryQueue` is write-only dead state** in the ash (CH:115-140, zero readers) — not ported. Elementary NCs: 396 opt 3 unlocks janitor's closet, 397 opt 2 bathrooms, 398 opt 1 teacher's lounge (`ChoiceControl.java:5084-5103`); 399 (closet) opt 1 fights a Mer-kin monitor, 400 (lounge) opt 1 fights a teacher, 401 (bathrooms) opt 2 takes a wordquiz, 705 (hallpass) opt 4 takes a wordquiz and mafia deducts the hallpass on visit (`ChoiceControl.java:7290-7291`).
15. **seedfinder is a seed identifier, not a guess solver**: 7-digit seeds 1000000–9999999; every randomization replays off `phpSeed(seed)` — a handle carrying two INDEPENDENT streams (mafia `Rng.java`): `phpRand` (glibc additive-feedback, `PHPRandom.java`) drives `shuffle` (bang potions `"scitdembh"`, condo order `"emdfbs"`), `phpMtRand` (PHP Mersenne Twister, `PHPMTRandom.java`) drives the dreadscroll (8 straight draws of `mt_rand(1,4)`, SF/seedfinder_calc.ash:34-41) and the seahorse name (SF:66-85). ~137 seeds share any full answer string, so clues alone never pin a seed — but the **seahorse name** (known the moment Phase 3 ends) partitions the space ~768 ways, condo order (`leprecondoNeedOrder` first letters, SF/SeedCriteria.ash:93-111) up to 720 ways, and each clue ~4 ways. The 148 MB index tables are not shipped; we scan.
16. **Colosseum regimen details** (UTS:2165-2224): 11 unguents + 5 sea gels stocked every round (10-stall + Yog reserves, CCS:288-303); `BCZ: Dial it up to 11` cast from `lastColosseumRoundWon >= 3` when the effect is down and the skill known (the twice-fixed paren bug's final form, UTS:2200-2202); null-day exploit at `>= 6` when shavings < 8; Patriotic Eagle fielded while `screechCombats > 0` (recharge ticks only on plain wins, UTS:1647-1650, 2209-2215) else foul ball; "Been There, Won That" force-completes both prefs (UTS:2220-2223, also parsed natively by `SeaMerkinRequest.java:57-66`).

## Deferral pricing (spec §9 net-turn rule — decisions, not options)

| Phase 3 deferral                                                                                                        | Decision                                          | Pricing rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skate-park war + fountain Fishy                                                                                         | **IN** (Task 7)                                   | War resolution = 1 forced NC with skate blade equipped ("Holey Rollers"; bladeless serves "Picking Sides", G:213-221); pays a free 30-turn Fishy every day (`skate lutz`, `_skateBuff1`, statuseffects.txt:552) replacing a fish-sauce/nigiri forever. Doubles as the Deep-Tainted/gummiheart burn zone.                                                                                                                                                                                                   |
| Mom daily buff                                                                                                          | **DROP** (user decision 2026-08-27)               | Was **IN** (Task 9) on turn-cost grounds (free, 0 turns, 1/day). Dropped by user decision 2026-08-27: it was a plan addition, not an ash port, and the route does not lean on `mom stats`.                                                                                                                                                                                                                                                                                                                 |
| Worktea-sushi clue 7 + godRunGuard                                                                                      | **IN** (Task 12)                                  | 2 fullness + a pull vs up to 3 wrong 703 guesses × ~9-adv Deep-Tainted burns.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| dreadSeedCheck post() hook                                                                                              | **IN** (Tasks 1, 4)                               | Zero-turn clue inference; skips knucklebone/sushi/vocabulary work outright when the seed pins.                                                                                                                                                                                                                                                                                                                                                                                                             |
| Elementary/Library/Gymnasium regimes                                                                                    | **IN** (Tasks 6, 11, 12)                          | Core route.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Shub null-day pull reservation                                                                                          | **IN** (Task 2)                                   | Insertion point already commented in pulls.ts:55-63.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Source Terminal enhance/duplicate                                                                                       | **IN** (Task 9)                                   | Free: 3×(25+) turns of +30% item/day (`ChoiceControl.java:9070-9072`); duplicate 1/day doubles a monitor's cheatsheet table.                                                                                                                                                                                                                                                                                                                                                                               |
| Corral-Leather McTwist guard                                                                                            | **DROP**                                          | Its only live window — corral farming with a maximizer-picked pro skateboard — closed with Phase 3's live-frozen spine; `forceGranted()`'s own comment already scopes it to combat builders. Revisit only if the smoke test surfaces a skateboard equip.                                                                                                                                                                                                                                                   |
| Shadow-rift subsystem                                                                                                   | **DROP** (again)                                  | Value (free lasso reps, Shadow Waters, Wave Fishy) is real for payphone accounts, but (a) its window is pre-taming — inside the live-frozen Phase 3 spine, (b) the ash's own choice script handles only 1500 of the rift's choice surface (1499 labyrinth and 1566 Wave-zone rely on ambient mafia/user settings — unacceptable for a no-dialog public release), (c) Phase 3 corral training already converges. Re-entry criterion: smoke test shows lasso training > ~8 real turns on a payphone account. |
| NCtoC + Club 'Em Across the Battlefield                                                                                 | **DROP**                                          | The ash's gate ("don't cast after an NC already became this combat", CCS:1048-1053) is a _runtime_ fight decision; our macros compile before the adventure, so the gate cannot be honored and misfires would convert catalog-card NCs we want. 5/day marginal combats don't buy back that risk. `elementaryQueue` dead in the ash — also dropped.                                                                                                                                                          |
| Codpiece gem socketing                                                                                                  | **DROP in-run socketing; IN pearl pry** (Task 13) | We never socket gems in-run (peridot/BCZ ride as normal accessories), so `if_equip`'s unsocket dance is moot. Pearls must come OUT before the finale (loop repo `thesea.ts:38-46`: "Gems are the only way to carry pearls past the Astral Gash… they have to come back out").                                                                                                                                                                                                                              |
| Baseball diamond, backup camera, Macrometeorite/CHEAT-CODE, Map the Monsters, Time-Spinner, Pocket Professor, otoscope  | **DROP**                                          | Combat-optimizer layers. Peridot (choice 1557, engine-native) + Source Terminal duplicate already force/double monitors; the marginal copies mostly matter on the long vocabulary route, which the seed narrowing makes rare. Macrometeorite/Professor/otoscope aren't used in the ash's sorceress phase at all (G:1346-1365, 1204-1212, 1414-1432).                                                                                                                                                       |
| Wet Crap stat scrolls                                                                                                   | **DROP**                                          | 1000 pennies each; ash-proven unnecessary (finale is 2 advs in the spell outfit).                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Bang-potion throws (CCS:625-639)                                                                                        | **DROP**                                          | Bang potions come from DoD spading, dropped in Phase 3 on net-turn grounds — no in-path supply. The seed criteria still read `lastBangPotion819..827` (free: empty prefs are wildcards).                                                                                                                                                                                                                                                                                                                   |
| Summon Taffy daily cast + red-taffy throw (upstream `6b7cd80`, UTS:276-278, CCS:240-241 at 89982f5)                     | **DROP**                                          | One Libram of Pulled Taffy cast a day for a random taffy; the red taffy is a +moxie item buff (Cinnamon Challenger, modifiers.txt:6070), the yellow one a YR we do not throw. MP for a maybe; no turn value.                                                                                                                                                                                                                                                                                               |
| pulled yellow taffy as a YR/forceItems source (ash pulls it for the skateboard-less corral opener, UTS:1671 at 89982f5) | **DEFER**                                         | Underwater-only YR (items.txt:6390). Would matter only on low tier with no pro skateboard; re-price after the low-tier smoke test — it would slot into `selectYellowRay()` as a pull-gated rung.                                                                                                                                                                                                                                                                                                           |
| Waffle Day / Summon Kokomo Resort Pass dailies (UTS:481-486 at 89982f5)                                                 | **DROP**                                          | Waffles are only thrown by the ash's `replaceEnemy()` re-rolls, which we never ported; the Kokomo pass grants aftercore zone access (Tropical Contact High, modifiers.txt:8408). Neither buys a turn in-run.                                                                                                                                                                                                                                                                                               |
| `sea` maximizer keyword (upstream corral/tame strings)                                                                  | **DROP**                                          | `Evaluator.java:396-404`: forces the Adventure Underwater + Underwater Familiar booleans. Our engine already force-equips a breather and a familiar breather as hard `equip` constraints, so the keyword adds nothing; it is a one-line upgrade if a smoke test ever shows the maximizer dropping the breather.                                                                                                                                                                                            |
| Disco Nap for Marked by the Don (UTS:256-257 at 89982f5)                                                                | **DROP**                                          | The effect only comes from the Möbius "trifecta" option, which our 1562 priorities never pick; mafia's Disco Nap list (`UneffectRequest.java:505-520`) does not include it, and the effect is flagged `noremove`.                                                                                                                                                                                                                                                                                          |

## File structure (this phase)

```
src/
  args.ts              MODIFY: + seedScan flag
  main.ts              MODIFY: sinceKolmafiaRevision(29108) (phpSeed floor, SF/seedfinder.ash:4)
  lib/
    dreadscroll.ts     CREATE: seed derivations, candidate scan+cache, dreadSeedCheck,
                       isKnucklebonesAndSushiEnough, godRunGuardCheck
    shub.ts            CREATE: shubDelevelFactor/Projection/PrepShort (pure math)
  resources/
    policy.ts          MODIFY: + conserveFreeFights, usePyec, shubInsurancePulls
    pulls.ts           MODIFY: + null-day exploit reservation (the commented Phase 4 slot)
    fishy.ts           MODIFY: export eatSushi; + skate-lutz rung
  engine/
    engine.ts          MODIFY: post() dreadSeedCheck hook
  standalone/
    choice.ts          MODIFY: + 396-401, 701, 705; 703 hardening
  tasks/
    runplans.ts        MODIFY: final composition
    sorceress/
      fights.ts        CREATE: gladiatorFilter, yogUrtFilter, shubFilter, centerDoorFilter
      gym.ts           CREATE: gymnasiumTurn, gladiatorGearStep, gearQuest
      colosseum.ts     CREATE: colosseumPrep/outfit, colosseumQuest
      skatepark.ts     CREATE: skateWarOpen, skateParkTurn, claimIceBuff, skateParkQuest
      burn.ts          CREATE: burnTurnElsewhere
      mine.ts          CREATE: teflon ore + crappy disguise (mineQuest)
      daily.ts         CREATE: sorceressDailies (Mom, PYEC, terminal), sourceEnhanceItems
      school.ts        CREATE: schoolQuest (unlocks, routes, vocabulary, scholar gear)
      library.ts       CREATE: libraryQuest (DDV, farm, knucklebone, worktea, High Priest)
      yogurt.ts        CREATE: yogUrtQuest
      shub.ts          CREATE: shubQuest
      finale.ts        CREATE: finaleQuest (pearl pry, center door, penny dump)
README.md              REPLACE: public release README
```

**Cross-task naming contract** (later tasks use these exact names): `candidateSeeds(): number[] | undefined`, `dreadSeedCheck(): void`, `isKnucklebonesAndSushiEnough(): boolean`, `godRunGuardCheck(): void`, `calculateDreadscroll(seed: number): number[]`, `shubDelevelFactor(it: Item): number`, `shubDelevelProjection(shavingsSpokenFor: number): number`, `shubPrepShort(shavingsSpokenFor?: number): boolean`, `shubDelevelers: Item[]`, `CombatFilter`, `gladiatorFilter(): CombatFilter`, `yogUrtFilter(): CombatFilter`, `shubFilter(): CombatFilter`, `centerDoorFilter(): CombatFilter`, `gymnasiumTurn(): void`, `gladiatorGearStep(): void`, `gearQuest(): Quest`, `colosseumRoundPrep(): void`, `colosseumQuest(): Quest`, `skateWarOpen(): boolean`, `skateParkTurn(): void`, `claimIceBuff(): void`, `skateParkQuest(): Quest`, `burnTurnElsewhere(): boolean`, `mineQuest(): Quest`, `sorceressDailies(): Quest`, `sourceEnhanceItems(): void`, `schoolQuest(): Quest`, `libraryQuest(): Quest`, `yogUrtQuest(): Quest`, `shubQuest(): Quest`, `finaleQuest(): Quest`, `eatSushi(): boolean` (fishy.ts export). Policy fields: `conserveFreeFights: boolean`, `usePyec: boolean`, `shubInsurancePulls: boolean`.

---

### Task 1: Seedfinder port — `src/lib/dreadscroll.ts`

**Files:**

- Create: `src/lib/dreadscroll.ts`
- Modify: `src/args.ts` (add `seedScan`), `src/main.ts` (revision floor)

**Interfaces:**

- Consumes: `phpSeed`/`phpRand`/`phpMtRand`/`Rng` (kolmafia builtins, JS-exposed; require r29108 per SF/seedfinder.ash:4), `args` (args.ts), libram `get`/`set`.
- Produces: `calculateBangPotions(seed): string`, `calculateCondoOrder(seed): string`, `calculateDreadscroll(seed): number[]`, `calculateSeahorseName(seed): string`, `candidateSeeds(): number[] | undefined`, `dreadSeedCheck(): void`, `isKnucklebonesAndSushiEnough(): boolean`, `godRunGuardCheck(): void`.

- [ ] **Step 1: Bump the revision floor in `src/main.ts`** — change `sinceKolmafiaRevision(29057)` to `sinceKolmafiaRevision(29108)` (the `php_seed` family landed in r29108 — SF/seedfinder.ash:4 `since r29108;`).

- [ ] **Step 2: Add the `seedScan` arg to `src/args.ts`** — alongside `godRunGuard`, following the existing `Args.flag` style:

```ts
  seedScan: Args.flag({
    help: "Enable the dreadscroll seed-space scan (native seedfinder port). Disable if the one-time 9M-seed scan is too slow on your machine; the Mastermind solver still works without it.",
    default: true,
    setting: "",
  }),
```

- [ ] **Step 3: Write `src/lib/dreadscroll.ts`**

```ts
import {
  abort,
  myAscensions,
  phpMtRand,
  phpRand,
  phpSeed,
  print,
  Rng,
  turnsPlayed,
} from "kolmafia";
import { get, set } from "libram";

import { args } from "../args";

/**
 * Native port of VeeArrKoL/seedfinder (checkout at /Users/xn/sites/KOL/seedfinder,
 * HEAD ad70b27), the dreadscroll seed-space spader UnderTheSea imports
 * (globals.ash:1). A "seed" is the 7-digit per-ascension PHP RNG seed
 * (1000000..9999999, seedfinder.ash:10-12); replaying draws off phpSeed(seed)
 * reproduces the bang-potion order, Leprecondo need order, the eight
 * dreadscroll answers, and the seahorse name. One phpSeed handle carries TWO
 * independent streams (mafia Rng.java): phpRand = glibc rand (shuffle),
 * phpMtRand = PHP Mersenne Twister (dreadscroll, seahorse name).
 *
 * seedfinder's 148 MB lookup tables are NOT shipped; we scan the seed space
 * once, cache the survivors, and re-filter the cache as clues land. All
 * writes here go to dreadScroll1..8 (mafia-owned clue prefs) and the three
 * subaqua_seed* cache prefs.
 */

const SEED_MIN = 1000000;
const SEED_MAX = 9999999;
/** Cache survivors only when the list is this small; otherwise record the
 * constraint count and retry after new evidence lands. */
const CACHE_MAX = 2000;

/** Fisher-Yates over the requested stream (SF/seedfinder_util.ash:15-40). */
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

/** SF/seedfinder_calc.ash:21-23 — 9-letter permutation of "scitdembh". */
export function calculateBangPotions(seed: number): string {
  return shuffled("scitdembh", phpSeed(seed), false);
}

/** SF/seedfinder_calc.ash:25-27 — 6-letter permutation of "emdfbs". */
export function calculateCondoOrder(seed: number): string {
  return shuffled("emdfbs", phpSeed(seed), false);
}

/** SF/seedfinder_calc.ash:34-41 — eight straight mt_rand(1,4) draws. */
export function calculateDreadscroll(seed: number): number[] {
  const r = phpSeed(seed);
  const rv: number[] = [];
  for (let i = 0; i < 8; i++) rv.push(phpMtRand(r, 1, 4));
  return rv;
}

// Seahorse name tables, verbatim from SF/seedfinder_calc.ash:67-70
// (data collected by Fart Scauce #2813285; inline in the ash, no data files).
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

/** SF/seedfinder_calc.ash:72-85 — a 4 on the type roll is redrawn (and
 * CONSUMES an MT output); all draws come from the MT stream. */
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
  clues: number[]; // dreadScroll1..8; 0 = unknown
  seahorse: string; // "" = unknown, else exact match
  condo: string; // 6 chars over "emdfbs"/"?"
  bang: string; // 9 chars over "scitdembh"/"?"
};

/** SF/SeedCriteria.ash:80-143 — observations to criteria, "?" = unknown. */
function playerCriteria(): Criteria {
  const clues: number[] = [];
  for (let i = 1; i <= 8; i++) clues.push(get(`dreadScroll${i}`, 0));

  let condo = "??????";
  const needs = get("leprecondoNeedOrder", "");
  if (needs !== "") {
    condo = "";
    for (const need of needs.split(",")) condo += need.charAt(0);
    while (condo.length < 6) condo += "?";
    if (!/^[emdfbs?]{6}$/.test(condo)) condo = "??????"; // SF:106-110 distrust
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

/** Constraint strength — used to decide when a failed scan is worth retrying. */
function constraintCount(c: Criteria): number {
  return (
    c.clues.filter((v) => v > 0).length +
    (c.seahorse !== "" ? 1 : 0) +
    c.condo.split("").filter((ch) => ch !== "?").length +
    c.bang.split("").filter((ch) => ch !== "?").length
  );
}

/** SF/SeedCriteria.ash:277-313, cheapest derivation first. */
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

/**
 * Candidate seeds under the current evidence, or undefined when unknown
 * (scan disabled, criteria too weak, or survivors over the cache cap).
 * The first successful scan is O(9M) through the phpSeed bridge — a
 * once-per-ascension cost, paid only after the seahorse name plus two more
 * clues exist; afterwards the cached list re-filters in microseconds.
 */
export function candidateSeeds(): number[] | undefined {
  if (!args.seedScan) return undefined;
  const c = playerCriteria();

  if (get("subaqua_seedCandidatesAsc", -1) === myAscensions()) {
    const cached = get("subaqua_seedCandidates", "");
    if (cached !== "") {
      const seeds = cached
        .split(",")
        .map((s) => parseInt(s))
        .filter((seed) => matches(c, seed));
      set("subaqua_seedCandidates", seeds.join(","));
      return seeds;
    }
  }

  // Full-scan triggers: seahorse name (always set in this phase) + >= 2 clues.
  if (c.seahorse === "" || c.clues.filter((v) => v > 0).length < 2) return undefined;
  // A prior scan overflowed at this constraint strength: wait for new evidence.
  if (constraintCount(c) <= get("subaqua_seedScanFloor", 0)) return undefined;

  const start = Date.now();
  const seeds: number[] = [];
  for (let seed = SEED_MIN; seed <= SEED_MAX; seed++) {
    if (matches(c, seed)) {
      seeds.push(seed);
      if (seeds.length > CACHE_MAX) break;
    }
  }
  if (seeds.length > CACHE_MAX) {
    set("subaqua_seedScanFloor", constraintCount(c));
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
  set("subaqua_seedCandidates", seeds.join(","));
  set("subaqua_seedCandidatesAsc", myAscensions());
  return seeds;
}

/**
 * Ash dreadSeedCheck (G:672-684) waits for a UNIQUE seed before writing
 * clues. Deviation, documented: any clue on which ALL surviving candidates
 * agree is already determined — writing it early is strictly more
 * information at zero risk.
 */
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

/**
 * True iff the knucklebone (clue 4) + worktea sushi (clue 7) will pin the
 * seed — every candidate has a distinct (clue4, clue7) pair — so the long
 * cheatsheet/vocabulary route can be skipped. Fixes the ash's off-by-one
 * (G:116-128 tests indexes [4]/[7] = clues 5 and 8) and its separator-less
 * contains_text pair matching; see the plan's ground-truth notes.
 */
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

/**
 * Arg-gated god-run insurance (ash UTS:2684-2690): at <= 17 turns played with
 * clue 7 unknown, refuse to brute-force choice 703 (each wrong guess costs a
 * Deep-Tainted Mind burn). The library quest's worktea task runs first when
 * it can; reaching this abort means it could not.
 */
export function godRunGuardCheck(): void {
  if (!args.godRunGuard) return;
  if (turnsPlayed() > 17 || get("dreadScroll7", 0) !== 0) return;
  abort(
    "godRunGuard: on god-run pace (<= 17 turns) with dreadscroll clue 7 unknown. " +
      "Acquire a Mer-kin worktea and eat a sea sushi (the tea rides along and reveals the clue), then rerun.",
  );
}
```

- [ ] **Step 4: Verify** — Run: `yarn check && yarn lint` — Expected: pass. If tsc cannot find `Rng`/`phpSeed` in the `kolmafia` module, they are at `node_modules/kolmafia/index.d.ts:510-514` — report what the actual exported names are and adapt (do not reimplement the RNG).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dreadscroll.ts src/args.ts src/main.ts
git commit -m "feat: native seedfinder port — seed derivations, candidate scan, clue inference"
```

---

### Task 2: Shub math, null-day pull reservation, policy fields

**Files:**

- Create: `src/lib/shub.ts`
- Modify: `src/resources/pulls.ts`, `src/resources/policy.ts`

**Interfaces:**

- Consumes: existing `PullReservation` shape (pulls.ts:45-51), `pulledToday` (pulls.ts:21), `ResourcePolicy` (policy.ts).
- Produces: `shubDelevelFactor(it): number`, `shubDelevelProjection(shavingsSpokenFor): number`, `shubPrepShort(shavingsSpokenFor?): boolean`, `shubDelevelers: Item[]`; policy fields `conserveFreeFights`, `usePyec`, `shubInsurancePulls`; the null-day reservation.

- [ ] **Step 1: Write `src/lib/shub.ts`** — pure math, shared by prep projection, the pull reservation, and the in-fight caster so they can never drift (ash keeps it in globals.ash:150-187 for the same reason):

```ts
import { Item, itemAmount } from "kolmafia";
import { $effect, $item, $items, have } from "libram";

/**
 * Shub-Jigguwatt delevel factors (ash globals.ash:150-156; header comment
 * CCS:535-538): jam band bootleg halves his attack, shavings take 30%,
 * rattle/kit 25% — all MULTIPLICATIVE on purpose, and none deal damage
 * (damage triggers his doubling 20%-max-HP retaliation).
 */
export function shubDelevelFactor(it: Item): number {
  if (it === $item`jam band bootleg`) return 0.5;
  if (it === $item`crayon shavings`) return 0.7;
  return 0.75; // rattler rattle, electronics kit
}

export const shubDelevelers = $items`jam band bootleg, crayon shavings, rattler rattle, electronics kit`;

/** Ash shubDelevelProjection (globals.ash:165-174): the attack fraction left
 * after throwing the whole current stock, with `shavingsSpokenFor` shavings
 * set aside (Yog-Urt's fight throws up to two first). */
export function shubDelevelProjection(shavingsSpokenFor: number): number {
  let remaining = 1.0;
  for (const it of shubDelevelers) {
    let n = itemAmount(it);
    if (it === $item`crayon shavings`) n = Math.max(0, n - shavingsSpokenFor);
    for (let i = 0; i < n; i++) remaining *= shubDelevelFactor(it);
  }
  return remaining;
}

/** Ash shubPrepShort (globals.ash:181-187): prep is short unless the stock
 * projects his attack to <= 25%, or Null Afternoon covers the fight. */
export function shubPrepShort(shavingsSpokenFor = 0): boolean {
  return shubDelevelProjection(shavingsSpokenFor) > 0.25 && !have($effect`Null Afternoon`);
}
```

- [ ] **Step 2: Add the null-day reservation to `src/resources/pulls.ts`** — replace the sentence "Phase 4 adds that entry here." in the block comment above `pullReservations` (pulls.ts:55-63) with "The null-day entry below is that Phase 4 addition.", then insert as a new entry in the `pullReservations` array (after the "crayon shavings" entry at pulls.ts:70-74):

```ts
  {
    // Shub null-day exploit (ash reservedPulls() globals.ash:235-239): hold a
    // slot for Null Afternoon while Shub is undefeated and the delevel stock
    // projects short. Yog-Urt's fight may throw up to two crayon shavings
    // first, so they are spoken for (shubPrepShort(2)).
    name: "null-day exploit",
    item: $item`null-day exploit`,
    needed: () =>
      !get("shubJigguwattDefeated") && shubPrepShort(2) && !pulledToday($item`null-day exploit`),
  },
```

Add `import { shubPrepShort } from "../lib/shub";` and `get` to the libram import if not present.

- [ ] **Step 3: Extend `ResourcePolicy` in `src/resources/policy.ts`** — add three fields to the type (with doc comments) and to all three tier records:

```ts
/** High shiny banks free-fight riders (bat wings / retro cape) for
 * aftercore instead of spending them on colosseum/finale outfits
 * (ash !highShiny() gates at UTS:2179-2196, 2963-2969). */
conserveFreeFights: boolean;
/** Platinum Yendorian Express Card use in-run (ash gates on !highShiny(),
 * UTS:2325-2330). */
usePyec: boolean;
/** Pull gremlin juice + hand chalk before Shub when the account is likely
 * to miss (ash lowShiny() branch, UTS:2932-2944); all tiers still pull
 * them when buffed muscle < 1250 — that half is game-state, not tier. */
shubInsurancePulls: boolean;
```

Values — low: `conserveFreeFights: false, usePyec: true, shubInsurancePulls: true`; mid: `false, true, false`; high: `true, false, false`.

- [ ] **Step 4: Verify** — Run: `yarn check && yarn lint` — Expected: pass. `null-day exploit` / `jam band bootleg` / `rattler rattle` / `electronics kit` are real items (items.txt); if lint disagrees, check the data file and report.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shub.ts src/resources/pulls.ts src/resources/policy.ts
git commit -m "feat: shub delevel math, null-day pull reservation, phase-4 policy fields"
```

---

### Task 3: Choice bundle — elementary school, gymnasium, hallpass, 703 hardening

**Files:**

- Modify: `src/standalone/choice.ts`

**Interfaces:**

- Consumes: existing handler chain in `main(choice, _page)` (choice.ts:25), `getDreadscrollGuess()` (choice.ts:171-235).
- Produces: handlers for 396, 397, 398, 399, 400, 401, 701, 705; hardened 703.

- [ ] **Step 1: Add the deepcity handlers** — insert into the else-if chain (near the existing 310/312-315 sea handlers), one branch per choice:

```ts
} else if (choice === 396) {
  // Woolly Scaly Bully: option 3 unlocks the janitor's closet (monitor
  // fights, ChoiceControl.java:5084-5089); other options just lose HP.
  runChoice(3);
} else if (choice === 397) {
  // Bored of Education: option 2 unlocks the bathrooms (wordquiz NC 401,
  // ChoiceControl.java:5091-5096).
  runChoice(2);
} else if (choice === 398) {
  // A Mer-kin Graffiti: option 1 unlocks the teacher's lounge — the
  // merkinElementaryTeacherUnlock the library route needs
  // (ChoiceControl.java:5098-5103).
  runChoice(1);
} else if (choice === 399) {
  // The Case of the Closet: fight the Mer-kin monitor (cheatsheet source);
  // ash CH:126-131 takes option 1 too.
  runChoice(1);
} else if (choice === 400) {
  // No Rest for the Room: fight the Mer-kin teacher (ash CH:126-131).
  runChoice(1);
} else if (choice === 401) {
  // Raising Cane: option 2 takes a Mer-kin wordquiz (ash CH:134-140).
  runChoice(2);
} else if (choice === 701) {
  // Ators Gonna Ate (Gymnasium): option 1 takes the item
  // (ChoiceAdventures.java:3612-3619; ash simple-case list CH:44,55).
  runChoice(1);
} else if (choice === 705) {
  // Halls Passing in the Night: option 4 takes a wordquiz; mafia already
  // deducted the hallpass on visit (ChoiceControl.java:7290-7291).
  runChoice(4);
}
```

- [ ] **Step 2: Harden the 703 solver** — in `getDreadscrollGuess()` (choice.ts:171-235), two fixes:

(a) Guard the enumeration cost: at the top of the function, count unknowns first; with more than 4 unknown clues the 4^n candidate space explodes (65,536 codes × O(n²) scoring hangs Rhino). The route never uses the scroll that blind (clues 1/6/8 gate acquisition), but a manual `use` shouldn't hang:

```ts
const unknowns = [];
for (let i = 1; i <= 8; i++) {
  if (get(`dreadScroll${i}`, 0) === 0) unknowns.push(i);
}
if (unknowns.length > 4) {
  // Too blind to enumerate; answer the known clues and 1s elsewhere —
  // mafia records the guess and its wrong-count either way, which is
  // evidence the next attempt uses.
  return Array.from({ length: 8 }, (_, i) => `${get(`dreadScroll${i + 1}`, 0) || 1}`).join("");
}
```

(b) Fix the empty-pool edge: after the `dreadScrollGuesses` filtering loop, `possibleCodes` can be empty (contradictory history — e.g. a pref was hand-edited); `bestCode` would be `undefined` and the handler would submit garbage. Add immediately after the filtering loop:

```ts
if (possibleCodes.length === 0) {
  // Contradictory guess history; fall back to known clues + 1s rather
  // than submitting "undefined". (The ash's 4->3->2->1 clue-7 brute force
  // is subsumed by the Hamming filter when the history is consistent.)
  return Array.from({ length: 8 }, (_, i) => `${get(`dreadScroll${i + 1}`, 0) || 1}`).join("");
}
```

Match the function's actual local variable names when editing (the array of candidate strings is `possibleCodes` on main; adapt if it differs).

- [ ] **Step 3: Verify** — Run: `yarn check && yarn lint && yarn build` — Expected: pass; three bundles. Grep `dist/KoLmafia/scripts/subaqua/subaqua_choice.js` for `396` to confirm the new handlers bundled.

- [ ] **Step 4: Commit**

```bash
git add src/standalone/choice.ts
git commit -m "feat: deepcity choice handlers (396-401, 701, 705) and dreadscroll solver hardening"
```

---

### Task 4: Engine post() hook — seed narrowing

**Files:**

- Modify: `src/engine/engine.ts`

**Interfaces:**

- Consumes: `dreadSeedCheck` (Task 1).
- Produces: per-turn clue inference (the ash's post_adv hook, UTS:253-254).

- [ ] **Step 1: Add the hook to `post()`** — at the end of the existing `post(task)` method body (after `emergencyDiet();`):

```ts
// Dreadscroll seed narrowing (ash post_adv UTS:253-254): active exactly
// between the seahorse tame and High Priesthood. Pure pref reads/writes —
// candidateSeeds() gates its own one-time scan cost (>= 2 clues + name)
// and cache-filters afterwards; no adventuring, per the hooks rule.
if (get("seahorseName") !== "" && !get("isMerkinHighPriest")) {
  dreadSeedCheck();
}
```

Add `import { dreadSeedCheck } from "../lib/dreadscroll";` (grouped with the other `../lib` imports).

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint && yarn build` — Expected: pass; three bundles (the main bundle now pulls in lib/dreadscroll — confirm `dist/KoLmafia/scripts/subaqua/subaqua.js` grew and still parses via the build's own success).

- [ ] **Step 3: Commit**

```bash
git add src/engine/engine.ts
git commit -m "feat: engine post() dreadscroll seed-narrowing hook"
```

---

### Task 5: Combat filters — `src/tasks/sorceress/fights.ts`

**Upstream 2026-08-26 amendment:** `yogUrtFilter` gains a fifth heal throw when only one prayerbead is equipped — see Task 12 §4. Nothing else in this task moved: the colosseum, Shub and center-door regimes are unchanged upstream (`gladiatorFilter` cites stay valid at ab1105e).

**Files:**

- Create: `src/tasks/sorceress/fights.ts`

**Interfaces:**

- Consumes: `killMacro` (engine/combat), `currentPolicy` (resources/policy), `shubDelevelFactor`/`shubDelevelers` (lib/shub).
- Produces: `CombatFilter`, `gladiatorFilter(opts?)`, `yogUrtFilter()`, `shubFilter()`, `centerDoorFilter()`.

All four are **stateful closures** passed to `adv1(loc, -1, filter)`; the runtime calls them once per round with the current fight text — which is the response to the previously submitted action, exactly the read the ash's reflect regime requires (CCS:176-208: the tells appear only in an action's response, never in a re-fetched fight page).

- [ ] **Step 1: Write `src/tasks/sorceress/fights.ts`**

```ts
import {
  abort,
  equippedAmount,
  itemAmount,
  Item,
  Monster,
  monsterAttack,
  mpCost,
  myBuffedstat,
  myClass,
  myHp,
  myLocation,
  myMaxhp,
  myMp,
} from "kolmafia";
import {
  $class,
  $effect,
  $item,
  $items,
  $location,
  $monster,
  $skill,
  $stat,
  get,
  have,
  Macro,
} from "libram";

import { killMacro } from "../../engine/combat";
import { shubDelevelers, shubDelevelFactor } from "../../lib/shub";
import { currentPolicy } from "../../resources/policy";

export type CombatFilter = (round: number, monster: Monster, text: string) => string;

const bladeswitcher = $monster`Mer-kin bladeswitcher`;
// Named-boss names contain commas, so no $monsters template (it splits on
// commas); six individual constants (freeRounds(), CCS:165-174).
const gladiators = [
  $monster`Mer-kin balldodger`,
  $monster`Mer-kin netdragger`,
  bladeswitcher,
  $monster`Georgepaul, the Balldodger`,
  $monster`Johnringo, the Netdragger`,
  $monster`Ringogeorge, the Bladeswitcher`,
];

/**
 * Bladeswitcher reflect tells (CCS:209-217). ONLY the regular bladeswitcher:
 * the netdragger must not stall (his special halves max HP once — stalling
 * ten rounds vs ~1000/round healing loses a four-round fight, CCS:129-132)
 * and Ringogeorge shares the name but has no specials (CCS:133-138).
 */
function reflectStall(monster: Monster, text: string): number {
  if (monster !== bladeswitcher) return 0;
  if (text.includes("twirling his blade around himself")) return 10; // live
  if (text.includes("an especially dope move")) return 11; // wind-up, one round early
  return 0;
}

/** Stall stock guard (CCS:288-303): while Yog-Urt is pending, one sea gel and
 * one Pungent Unguent are hers. */
function stallSpare(it: Item): boolean {
  const reserved = !get("yogUrtDefeated") ? 1 : 0;
  return itemAmount(it) > reserved;
}

/** One stall round (CCS:329-337). Thrown items deal no damage -> reflect
 * nothing; every branch advances the round; free delevelers are BANNED here
 * (once-per-combat skills may already be spent — a refused submission would
 * not advance the round, CCS:305-328). */
function stallAction(): string {
  if (myHp() * 2 < myMaxhp() && stallSpare($item`sea gel`)) {
    return Macro.tryItem($item`sea gel`).toString();
  }
  if (stallSpare($item`Doc Galaktik's Pungent Unguent`)) {
    return Macro.tryItem($item`Doc Galaktik's Pungent Unguent`).toString();
  }
  if (stallSpare($item`sea gel`)) return Macro.tryItem($item`sea gel`).toString();
  return Macro.attack().toString();
}

/**
 * The gladiator regime (port of cleanUp(), CCS:339-495, plus the colosseum
 * free_kill rule CCS:6-45): nuke-first on the special-free wind-up round,
 * delevel openers once on a clear round, reflect-stall with renewal cap,
 * Club 'Em Back in Time as the only colosseum-legal free kill, spell ladder,
 * 3-strikes stuck-round abort. Also serves the Gymnasium (same monsters,
 * CCS:1199-1218) — there it additionally banks skate-war NC forcers and
 * throws dreadscroll hint scrolls (opts.gym).
 */
export function gladiatorFilter(opts: { gym?: boolean } = {}): CombatFilter {
  let stallLeft = 0;
  let stalled = 0;
  let openersDone = false;
  let microUsed = false;
  let spinnerUsed = false;
  let weaksauceUsed = false;
  let mortarFired = false;
  let forcerBanked = false;
  let healTossed = false;
  let killTossed = false;
  let lastRound = -1;
  let lastHp = -1;
  let stuck = 0;

  return (round, monster, text) => {
    if (round === lastRound) {
      stuck += 1;
      if (stuck > 3)
        abort(
          "Gladiator fight is not advancing rounds; aborting rather than looping (CCS:490-492).",
        );
    } else {
      stuck = 0;
      if (stallLeft > 0) {
        stallLeft -= 1;
        stalled += 1;
      }
    }
    lastRound = round;

    if (!gladiators.includes(monster)) return killMacro(false).toString(); // wanderers

    // Reflect bookkeeping off this round's page (= previous action's response).
    const renewed = reflectStall(monster, text);
    if (renewed > 0 && stalled < 14 && renewed > stallLeft) stallLeft = renewed; // renewal cap CCS:393-415
    if (stallLeft === 0 && monster === bladeswitcher && lastHp >= 0 && lastHp - myHp() > 400) {
      stallLeft = 10; // wording-independent backstop, CCS:474-477
    }
    lastHp = myHp();
    if (stallLeft > 0) return stallAction();

    // Gymnasium extras, clean rounds only (CCS:1199-1213): bank a skate-war
    // forcer, throw dreadscroll hint scrolls.
    if (opts.gym) {
      if (!forcerBanked && text.includes("Launch spikolodon spikes")) {
        forcerBanked = true;
        return Macro.trySkill($skill`Launch spikolodon spikes`).toString();
      }
      if (!forcerBanked && text.includes("McHugeLarge avalanche")) {
        forcerBanked = true;
        return Macro.trySkill($skill`McHugeLarge avalanche`).toString();
      }
      if (
        !healTossed &&
        get("dreadScroll2", 0) === 0 &&
        itemAmount($item`Mer-kin healscroll`) > 0
      ) {
        healTossed = true;
        return Macro.tryItem($item`Mer-kin healscroll`).toString();
      }
      if (
        !killTossed &&
        get("dreadScroll5", 0) === 0 &&
        itemAmount($item`Mer-kin killscroll`) > 0
      ) {
        killTossed = true; // gladiators are mer-kin phylum (monsters.txt:427-436)
        return Macro.tryItem($item`Mer-kin killscroll`).toString();
      }
    }

    const geyser = $skill`Saucegeyser`;
    const storm = $skill`Saucestorm`;
    const canGeyser = have(geyser) && myMp() >= mpCost(geyser);
    const canStorm = have(storm) && myMp() >= mpCost(storm);

    // Nuke-first: round 1 is special-free — every special needs a wind-up
    // (freeRounds()=1, CCS:143-174; bbee792: "a first-round nuke ended 45 of
    // 47 ordinary fights"). Skip openers while the nuke leads.
    const leadWithNuke = round <= 1 && (canGeyser || canStorm);
    if (!leadWithNuke && !openersDone) {
      // develOpeners (CCS:232-265): fire only while under-develeveled; each
      // response is read for the reflect on the NEXT call. Micrometeorite has
      // NO daily cap (_micrometeoriteUses is potency decay, 9e148ee).
      const underleveled = myBuffedstat($stat`Moxie`) + 10 < monsterAttack();
      if (underleveled && !microUsed && have($skill`Micrometeorite`)) {
        microUsed = true;
        return Macro.trySkill($skill`Micrometeorite`).toString();
      }
      if (underleveled && !spinnerUsed && itemAmount($item`Time-Spinner`) > 0) {
        spinnerUsed = true;
        return Macro.tryItem($item`Time-Spinner`).toString();
      }
      if (
        underleveled &&
        !weaksauceUsed &&
        have($skill`Curse of Weaksauce`) &&
        myMp() >= mpCost($skill`Curse of Weaksauce`)
      ) {
        weaksauceUsed = true;
        return Macro.trySkill($skill`Curse of Weaksauce`).toString();
      }
      openersDone = true;
    }

    // Club 'Em Back in Time: the one instakill that works on instakill-immune
    // gladiators (30% max HP + frees the fight); colosseum-only, 5/day,
    // mid-tier policy (CCS:24-45). Clean rounds only — clubbing a reflecting
    // bladeswitcher returns the damage.
    if (
      myLocation() === $location`Mer-kin Colosseum` &&
      currentPolicy().allowClubEmBackInTime &&
      get("_clubEmTimeUsed") < 5 &&
      text.includes("Club 'Em Back in Time")
    ) {
      return Macro.trySkill($skill`Club 'Em Back in Time`).toString();
    }

    // Kill ladder (CCS:433-472): LTS for muscle-leading Seal Clubbers OUTSIDE
    // the colosseum vs low phys resistance; else Saucegeyser; else Stuffed
    // Mortar Shell (never vs the bladeswitcher — its damage lands a round
    // late, unprotectable) + Saucestorm; else plain attacks.
    if (
      myClass() === $class`Seal Clubber` &&
      have($skill`Lunging Thrust-Smack`) &&
      myBuffedstat($stat`Muscle`) >= myBuffedstat($stat`Mysticality`) &&
      myLocation() !== $location`Mer-kin Colosseum` &&
      monster.physicalResistance < 50 &&
      myMp() >= mpCost($skill`Lunging Thrust-Smack`)
    ) {
      return Macro.trySkill($skill`Lunging Thrust-Smack`).toString();
    }
    if (canGeyser) return Macro.trySkill(geyser).toString();
    if (canStorm) {
      if (
        !mortarFired &&
        monster !== bladeswitcher &&
        have($skill`Stuffed Mortar Shell`) &&
        myMp() >= mpCost($skill`Stuffed Mortar Shell`) + mpCost(storm)
      ) {
        mortarFired = true;
        return Macro.trySkill($skill`Stuffed Mortar Shell`).toString();
      }
      return Macro.trySkill(storm).toString();
    }
    return Macro.attack().toString();
  };
}

// Yog-Urt item ladders (CCS:499-517; the ash's duplicate mouthsoap entry is
// an $items[] artifact, collapsed here). Dedup is closure-local instead of
// parsing _lastCombatActions.
const yogDelevelOrder = $items`Mer-kin mouthsoap, crayon shavings, table tennis ball, sea cowbell`;
const yogHealOrder = $items`sea gel, Mer-kin healscroll, waterlogged scroll of healing, soggy used band-aid, New Age healing crystal`;

/**
 * Yog-Urt, Right Door (CCS:1230-1249). Phys: 100 (monsters.txt:804) — spells
 * only. Two funkslinged deleveler+heal pairs (heal solo when moxie already
 * outpaces her attack), bead-count-conditional extra heals, the
 * elixir+unguent pair, then the spell ladder.
 */
export function yogUrtFilter(): CombatFilter {
  const thrown = new Set<Item>();
  let step = 0;
  let lastRound = -1;
  let stuck = 0;

  const next = (order: Item[]): Item | undefined =>
    order.find((it) => itemAmount(it) > 0 && !thrown.has(it));

  return (round, monster, text) => {
    if (round === lastRound) {
      stuck += 1;
      if (stuck > 3) abort("Yog-Urt fight is not advancing rounds; aborting rather than looping.");
    } else stuck = 0;
    lastRound = round;
    void monster;
    void text;

    if (step < 2) {
      step += 1;
      const deleveler =
        myBuffedstat($stat`Moxie`) + 10 > monsterAttack() ? undefined : next(yogDelevelOrder);
      const heal = next(yogHealOrder);
      if (!heal) {
        abort(
          "Out of Yog-Urt healing items mid-fight (CCS:510-517) — acquire sea gel / Mer-kin healscroll / waterlogged scroll of healing and rerun.",
        );
      } else if (deleveler && have($skill`Ambidextrous Funkslinging`)) {
        thrown.add(deleveler);
        thrown.add(heal);
        return Macro.tryItem([deleveler, heal]).toString();
      } else {
        thrown.add(heal);
        return Macro.tryItem(heal).toString();
      }
    }
    if (step === 2) {
      step += 1;
      if (equippedAmount($item`Mer-kin prayerbeads`) < 3) {
        const heal = next(yogHealOrder);
        if (heal) {
          thrown.add(heal);
          return Macro.tryItem(heal).toString();
        }
      }
    }
    if (step === 3) {
      step += 1;
      if (equippedAmount($item`Mer-kin prayerbeads`) < 2) {
        const heal = next(yogHealOrder);
        if (heal) {
          thrown.add(heal);
          return Macro.tryItem(heal).toString();
        }
      }
    }
    if (step === 4) {
      step += 1;
      if (
        itemAmount($item`Doc Galaktik's Homeopathic Elixir`) > 0 &&
        itemAmount($item`Doc Galaktik's Pungent Unguent`) > 0 &&
        have($skill`Ambidextrous Funkslinging`)
      ) {
        return Macro.tryItem([
          $item`Doc Galaktik's Homeopathic Elixir`,
          $item`Doc Galaktik's Pungent Unguent`,
        ]).toString();
      }
    }
    if (have($skill`Saucegeyser`) && myMp() >= mpCost($skill`Saucegeyser`)) {
      return Macro.trySkill($skill`Saucegeyser`).toString();
    }
    if (have($skill`Saucestorm`) && myMp() >= mpCost($skill`Saucestorm`)) {
      return Macro.trySkill($skill`Saucestorm`).toString();
    }
    return Macro.attack().toString(); // her HP is 750; the attack tail is the ash's safety net (CCS:1247-1248)
  };
}

/**
 * Shub-Jigguwatt, Left Door (CCS:1251-1256, 539-568). Elem: 95
 * (monsters.txt:606) — physical only, and delevel items deal no damage (his
 * retaliation doubles on damage). Funksling same-item pairs while the
 * projection stays above the ~0.25 floor; then swing until it ends. Losing
 * is a sanctioned retry (engine post() Shub-loss carve-out).
 */
export function shubFilter(): CombatFilter {
  let remaining = have($effect`Null Afternoon`) ? 0.05 : 1.0;
  let lastRound = -1;
  let stuck = 0;

  return (round, monster, text) => {
    if (round === lastRound) {
      stuck += 1;
      if (stuck > 3) abort("Shub fight is not advancing rounds; aborting rather than looping.");
    } else stuck = 0;
    lastRound = round;
    void monster;
    void text;

    if (remaining > 0.05) {
      const d = shubDelevelers.find((it) => itemAmount(it) > 0);
      if (d) {
        const f = shubDelevelFactor(d);
        if (
          itemAmount(d) >= 2 &&
          remaining * f * f >= 0.2 &&
          have($skill`Ambidextrous Funkslinging`)
        ) {
          remaining *= f * f;
          return Macro.tryItem([d, d]).toString();
        }
        remaining *= f;
        return Macro.tryItem(d).toString();
      }
      remaining = 0; // stock exhausted; prep math should have prevented this
    }
    return Macro.attack().toString();
  };
}

/** Center Door (CCS:1258-1266): two Raise Backup Dancers when known (pure
 * damage boost — skipped, not errored, on other classes), then the ladder. */
export function centerDoorFilter(): CombatFilter {
  let dancers = 0;
  let lastRound = -1;
  let stuck = 0;

  return (round, monster, text) => {
    if (round === lastRound) {
      stuck += 1;
      if (stuck > 3)
        abort("Seaceress fight is not advancing rounds; aborting rather than looping.");
    } else stuck = 0;
    lastRound = round;
    void monster;
    void text;

    if (
      dancers < 2 &&
      have($skill`Raise Backup Dancer`) &&
      myMp() >= mpCost($skill`Raise Backup Dancer`)
    ) {
      dancers += 1;
      return Macro.trySkill($skill`Raise Backup Dancer`).toString();
    }
    if (have($skill`Saucegeyser`) && myMp() >= mpCost($skill`Saucegeyser`)) {
      return Macro.trySkill($skill`Saucegeyser`).toString();
    }
    if (have($skill`Saucestorm`) && myMp() >= mpCost($skill`Saucestorm`)) {
      if (
        have($skill`Stuffed Mortar Shell`) &&
        myMp() >= mpCost($skill`Stuffed Mortar Shell`) + mpCost($skill`Saucestorm`)
      ) {
        return Macro.trySkill($skill`Stuffed Mortar Shell`).toString();
      }
      return Macro.trySkill($skill`Saucestorm`).toString();
    }
    return Macro.attack().toString();
  };
}
```

Notes for the implementer: `monster.physicalResistance` is the kolmafia Monster proxy field (check `node_modules/kolmafia/index.d.ts` if tsc rejects the casing and report). Skill/item names to lint-verify: `Launch spikolodon spikes`, `McHugeLarge avalanche`, `BCZ: Dial it up to 11` (Task 6), `Raise Backup Dancer`, `Doc Galaktik's Homeopathic Elixir`, `Time-Spinner`, `Mer-kin mouthsoap`, `table tennis ball`. The unused-parameter `void monster; void text;` pattern keeps the shared `CombatFilter` signature under `noUnusedParameters` — if the repo's tsconfig doesn't flag them, drop the voids.

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/tasks/sorceress/fights.ts
git commit -m "feat: gladiator/yog/shub/seaceress combat filters (nuke-first, reflect stall, delevel math)"
```

---

### Task 6: Gymnasium + colosseum — `gym.ts`, `colosseum.ts`

**Files:**

- Create: `src/tasks/sorceress/gym.ts`, `src/tasks/sorceress/colosseum.ts`

**Interfaces:**

- Consumes: `gladiatorFilter` (Task 5), `recover` (lib), `skateWarOpen` (Task 7 — forward import; Task 7 creates the file, so **implement Task 7's `skatepark.ts` `skateWarOpen` stub first if executing strictly in order**: the two tasks may be built in either order, and Task 7's file has no imports from this one), `currentPolicy`.
- Produces: `gymnasiumTurn()`, `gladiatorGearStep()`, `gearQuest(): Quest`, `colosseumRoundPrep()`, `colosseumRoundTurn()`, `colosseumQuest(): Quest`.

Helpers are **self-dressing** (raw `maximize()` + `equip()`, like the ash's `tempEquipment`) because the burn ladder (Task 7) calls them outside any task's outfit machinery; their wrapper tasks use function-`do` with `underwater: true` (engine `prepare()` keeps Fishy up) and **no `outfit` field** (mafia's deepcity auto-outfit supplies breathing, KoLAdventure.java:2867-2890).

- [ ] **Step 1: Write `src/tasks/sorceress/gym.ts`**

```ts
import {
  abort,
  adv1,
  availableAmount,
  buy,
  cliExecute,
  equip,
  itemAmount,
  maximize,
  visitUrl,
} from "kolmafia";
import { $coinmaster, $item, $location, $slot, get, have } from "libram";

import { Quest } from "../../engine/task";
import { recover } from "../../lib";

import { gladiatorFilter } from "./fights";
import { skateWarOpen } from "./skatepark";

const headguard = $item`Mer-kin headguard`;
const thighguard = $item`Mer-kin thighguard`;
const gladMask = $item`Mer-kin gladiator mask`;
const gladTail = $item`Mer-kin gladiator tailpiece`;

/**
 * One gymnasium turn (ash gymnasium(), UTS:617-641): +combat (the "Ators
 * Gonna Ate" NC guard is combat-rate pressure plus the forcer abort below),
 * skate-war NC-forcer gear banked when the war still needs one, 800 HP floor
 * (setRecoveryTargets UTS:216-225).
 */
export function gymnasiumTurn(): void {
  if (get("noncombatForcerActive")) {
    abort(
      "An NC forcer is pending while headed to the Mer-kin Gymnasium — it would be wasted on the zone NC (ash UTS:638-639). Spend it (e.g. at the Skate Park) and rerun.",
    );
  }
  const pieces: string[] = [];
  if (skateWarOpen()) {
    if (have($item`McHugeLarge left ski`) && get("_mcHugeLargeAvalancheUses", 0) < 3) {
      pieces.push("+equip McHugeLarge left ski");
    } else if (have($item`Jurassic Parka`) && get("_spikolodonSpikeUses", 0) < 5) {
      cliExecute("parka spikolodon");
      pieces.push("+equip Jurassic Parka");
    }
  }
  maximize(["combat rate", ...pieces].join(", "), false);
  recover(800);
  adv1($location`Mer-kin Gymnasium`, -1, gladiatorFilter({ gym: true }));
}

/**
 * Trade guards for the gladiator set (ash gladiatorGearStep tail,
 * UTS:2139-2157): sell scholar pieces back at Grandma's UNMODELED reverse
 * rows (131/1619 — commented out in mafia's coinmasters.txt:682,684, so raw
 * URLs exactly like the ash), then coinmaster-buy the gladiator set
 * (ROW126/127: crappy piece + guard).
 *
 * Deviation from ash, deliberate: the trade is gated on yogUrtDefeated. The
 * ash lets its burn ladder trade before Yog-Urt, which can strand her — the
 * Right Door requires Scholar's Vestments (KoLAdventure.java:2325-2411) and
 * the sell-back consumes them with the facecowl/waistrope already spent.
 */
export function gladiatorGearStep(): void {
  gymnasiumTurn();
  if (itemAmount(thighguard) === 0 || itemAmount(headguard) === 0) return;
  if (!get("yogUrtDefeated")) return;
  equip($slot`hat`, $item.none);
  equip($slot`pants`, $item.none);
  equip($item`really, really nice swimming trunks`);
  if (itemAmount($item`Mer-kin scholar mask`) > 0) {
    visitUrl("shop.php?whichshop=grandma&action=buyitem&quantity=1&whichrow=131");
  }
  if (itemAmount($item`Mer-kin scholar tailpiece`) > 0) {
    visitUrl("shop.php?whichshop=grandma&action=buyitem&quantity=1&whichrow=1619");
  }
  for (const it of [gladMask, gladTail]) {
    if (availableAmount(it) === 0) buy($coinmaster`Grandma Sea Monkey`, 1, it);
  }
}

export function gearQuest(): Quest {
  return {
    name: "Gladiator Gear",
    tasks: [
      {
        name: "Guard Grind",
        // The || is deliberate (ash UTS:2854-2857): the colosseum outfit
        // needs BOTH pieces.
        ready: () => get("yogUrtDefeated"),
        completed: () => availableAmount(gladMask) > 0 && availableAmount(gladTail) > 0,
        do: gladiatorGearStep,
        underwater: true,
        limit: {
          soft: 18,
          message: "Gladiator guards are not dropping; check the gymnasium grind.",
        },
      },
    ],
  };
}
```

- [ ] **Step 2: Write `src/tasks/sorceress/colosseum.ts`**

```ts
import {
  adv1,
  buy,
  itemAmount,
  maximize,
  myBuffedstat,
  myMaxhp,
  numericModifier,
  retrieveItem,
  use,
  useFamiliar,
  useSkill,
} from "kolmafia";
import {
  $coinmaster,
  $effect,
  $familiar,
  $item,
  $location,
  $skill,
  $stat,
  get,
  have,
  set,
} from "libram";

import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { currentPolicy } from "../../resources/policy";

import { gladiatorFilter } from "./fights";

const gel = $item`sea gel`;
const unguent = $item`Doc Galaktik's Pungent Unguent`;
const cmoi = $item`Congressional Medal of Insanity`;

/**
 * Per-round regimen (ash colosseumRound(), UTS:2165-2224): 11 unguents +
 * 5 sea gels (10-round stall stock + Yog-Urt's reserves, CCS:288-303);
 * Up To 11 from round 4 on (the twice-fixed gate's FINAL form,
 * UTS:2200-2202: lastRoundWon >= 3 && effect down && skill known);
 * null-day at >= 6 while shavings are short for Shub.
 */
export function colosseumRoundPrep(): void {
  if (itemAmount(unguent) < 11) retrieveItem(11, unguent);
  while (itemAmount(gel) < 5 && itemAmount($item`sand penny`) >= 10) {
    // Both loop conditions only move on a successful buy (ash UTS:2183-2188).
    if (!buy($coinmaster`Wet Crap For Sale`, 1, gel)) break;
  }
  if (
    get("lastColosseumRoundWon", 0) >= 3 &&
    !have($effect`Up To 11`) &&
    have($skill`BCZ: Dial it up to 11`)
  ) {
    useSkill($skill`BCZ: Dial it up to 11`);
  }
  if (
    get("lastColosseumRoundWon", 0) >= 6 &&
    itemAmount($item`crayon shavings`) < 8 &&
    itemAmount($item`null-day exploit`) > 0 &&
    !have($effect`Null Afternoon`)
  ) {
    use($item`null-day exploit`);
  }
}

/** One colosseum round (UTS:2165-2224 + CCS:1220-1228: full-HP recovery,
 * eagle-recharge familiar, spell-damage coefficient outfit, free-fight
 * riders per tier policy; never the saber, never free runs). */
export function colosseumRoundTurn(): void {
  colosseumRoundPrep();
  if (have($familiar`Patriotic Eagle`) && get("screechCombats", 0) > 0 && have(cmoi)) {
    // Worthless-for-screech fights tick the recharge down (940514c; recharge
    // counts only plain wins, UTS:1647-1650).
    useFamiliar($familiar`Patriotic Eagle`);
  } else if (have($familiar`Foul Ball`)) {
    useFamiliar($familiar`Foul Ball`);
  }
  const pieces = ["+equip Mer-kin gladiator mask", "+equip Mer-kin gladiator tailpiece"];
  if (have(cmoi)) pieces.push("+equip Congressional Medal of Insanity");
  const policy = currentPolicy();
  if (
    policy.allowClubEmBackInTime &&
    get("_clubEmTimeUsed", 0) < 5 &&
    have($item`legendary seal-clubbing club`)
  ) {
    pieces.push("+equip legendary seal-clubbing club");
  }
  if (!policy.conserveFreeFights) {
    if (get("_batWingsFreeFights", 0) < 5 && have($item`bat wings`)) {
      pieces.push("+equip bat wings");
    } else if (have($item`Unwrapped knock-off retro superhero cape`)) {
      pieces.push("+equip Unwrapped knock-off retro superhero cape");
    }
  }
  // Diminishing-returns coefficient (UTS:2216-2217): weight spell damage %
  // against mys by the current multiplier.
  const coeff =
    (60 + myBuffedstat($stat`Mysticality`) / 2.5) / (numericModifier("Spell Damage Percent") + 1);
  maximize([`${coeff.toFixed(2)} spell damage percent`, "mys", ...pieces].join(", "), false);
  recover(myMaxhp()); // colosseum floor is FULL HP (setRecoveryTargets UTS:219-220)
  adv1($location`Mer-kin Colosseum`, -1, gladiatorFilter());
  if (get("lastEncounter") === "Been There, Won That") {
    // Belt and suspenders — mafia parses this too (SeaMerkinRequest.java:57-66).
    set("lastColosseumRoundWon", 15);
    set("isMerkinGladiatorChampion", true);
  }
}

export function colosseumQuest(): Quest {
  return {
    name: "Colosseum",
    tasks: [
      {
        name: "Fifteen Rounds",
        ready: () =>
          itemAmount($item`Mer-kin gladiator mask`) +
            itemAmount($item`Mer-kin gladiator tailpiece`) >=
            2 || get("isMerkinGladiatorChampion"),
        completed: () => get("lastColosseumRoundWon", 0) >= 15 || get("isMerkinGladiatorChampion"),
        do: colosseumRoundTurn,
        underwater: true,
        limit: {
          soft: 25,
          message: "Colosseum rounds are not being won; inspect the gladiator filter.",
        },
      },
    ],
  };
}
```

If the maximizer rejects the retro cape without a mode, set it first with `cliExecute("retrocape heck kill")` before `maximize` (ash UTS:2192-2196 does the mode dance in the finale block; report which form worked).

- [ ] **Step 3: Verify** — Run: `yarn check && yarn lint` — Expected: pass, except `./skatepark` unresolved — acceptable ONLY if executing Tasks 6 and 7 together; otherwise create Task 7's `skatepark.ts` first. If executing strictly sequentially, do Task 7 Step 1 now and fold its verify into this one.

- [ ] **Step 4: Commit**

```bash
git add src/tasks/sorceress/gym.ts src/tasks/sorceress/colosseum.ts
git commit -m "feat: gymnasium grind, gladiator gear trade, colosseum rounds"
```

---

### Task 7: Skate park + burn ladder + Fishy rung

**Upstream 2026-08-26 amendment** (`c8e98d6`, `6b7cd80`): `skateWarOpen()` refreshes `sea_skatepark.php` and tests only `skateParkStatus == "war"` (the Holey Rollers queue proxy is gone — already applied in the code below; `import { booleanModifier, equip } from "kolmafia"` joins the imports); `claimIceBuff()` dresses for breathing before the buff visit; the CCS only fires spikolodon spikes / MCHUGELARGE avalanche as skate-war NC forcers while the war is on (CCS:1067-1070 at 89982f5) — Task 6's gymnasium extras must gate on `skateWarOpen()` the same way. The Phase 2 skate-blade pull reservation (`pulls.ts`) keeps its queue check: a `needed()` predicate cannot load a page, and the check is only ever conservative.

**Files:**

- Create: `src/tasks/sorceress/skatepark.ts`, `src/tasks/sorceress/burn.ts`
- Modify: `src/resources/fishy.ts`

**Interfaces:**

- Consumes: `forceNextNoncombat` (resources/ncforce), `pullSequence`/`pullBudgetAllows` (resources/pulls), `killMacro` (engine/combat), `gymnasiumTurn`/`gladiatorGearStep` (Task 6), `colosseumRoundTurn` (Task 6).
- Produces: `skateWarOpen()`, `skateParkTurn()`, `claimIceBuff()`, `skateParkQuest(): Quest`, `burnTurnElsewhere(): boolean`, exported `eatSushi()` and the lutz rung in fishy.ts.

- [ ] **Step 1: Write `src/tasks/sorceress/skatepark.ts`**

```ts
import { adv1, availableAmount, cliExecute, equip, itemAmount, maximize, visitUrl } from "kolmafia";
import { $item, $location, $slot, get, have } from "libram";

import { killMacro } from "../../engine/combat";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { forceNextNoncombat } from "../../resources/ncforce";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";

const blade = $item`skate blade`;

/** War-open test. Upstream 2026-08-26 (`c8e98d6`): the pref can be stale,
 * so refresh it from the zone page and drop the Holey Rollers queue proxy
 * (UTS:668-673 at 89982f5). A page load is free. */
export function skateWarOpen(): boolean {
  visitUrl("sea_skatepark.php");
  return get("skateParkStatus") === "war";
}

/** Lutz = the daily 30-turn Fishy, ice state only (SkateParkRequest.java:35-76;
 * statuseffects.txt:552). Called outside any task outfit, so it dresses
 * itself: the buff visit needs breathing gear (upstream `equipSwimTrunks()`
 * before every state2buff1 visit, UTS:2350-2353 at 89982f5). */
export function claimIceBuff(): void {
  if (get("skateParkStatus") === "ice" && !get("_skateBuff1")) {
    if (!booleanModifier("Adventure Underwater")) equip($item`really, really nice swimming trunks`);
    visitUrl("sea_skatepark.php?action=state2buff1");
  }
}

/**
 * One war-resolution attempt (ash skatePark(), UTS:643-671): Holey Rollers
 * only fires with a skate blade EQUIPPED — bladeless serves Picking Sides
 * instead, costing an extra turn and forcer (G:213-221). Peridot must come
 * off: choice 1557 would hijack the forced NC into a fight.
 */
export function skateParkTurn(): void {
  if (availableAmount(blade) === 0 && pullBudgetAllows(blade)) pullSequence(blade);
  forceNextNoncombat();
  if (get("noncombatForcerActive")) {
    equip($item`really, really nice swimming trunks`);
    cliExecute("unequip Peridot of Peril");
    if (itemAmount(blade) > 0) equip($slot`weapon`, blade);
  } else {
    maximize("-combat, -equip Peridot of Peril", false);
    if (availableAmount(blade) > 0) equip($slot`weapon`, blade);
  }
  recover();
  adv1($location`The Skate Park`, -1, () => killMacro(false).toString());
  claimIceBuff();
}

export function skateParkQuest(): Quest {
  return {
    name: "Skate Park",
    tasks: [
      {
        // Ash resolves the war before Yog-Urt (cleanup loop UTS:2727-2731);
        // burns during Deep-Tainted waits usually finish it earlier for free.
        name: "War Resolution",
        ready: skateWarOpen,
        completed: () => !skateWarOpen(),
        do: skateParkTurn,
        underwater: true,
        limit: {
          soft: 8,
          message: "The skate-park war is not resolving; check NC forcers and the skate blade.",
        },
      },
    ],
  };
}
```

- [ ] **Step 2: Write `src/tasks/sorceress/burn.ts`**

```ts
import { availableAmount } from "kolmafia";
import { $item, get } from "libram";

import { colosseumRoundTurn } from "./colosseum";
import { gladiatorGearStep, gymnasiumTurn } from "./gym";
import { claimIceBuff, skateParkTurn, skateWarOpen } from "./skatepark";

/**
 * The productive turn-sink ladder (ash burnTurnElsewhere(), UTS:2236-2267),
 * used by the Deep-Tainted Mind and Gummiheart waits: skate war first, then
 * gymnasium (guard farming; the gear TRADE stays post-Yog — see gym.ts's
 * scholar-strand guard), then colosseum rounds. The ash's caliginous rung
 * (questS02Monkees step12) is dropped: Phase 3's momQuest finishes that
 * quest before the sorceress phase begins.
 *
 * Returns false when nothing useful remains — callers abort with the ash's
 * 1-in-40 essay (UTS:2719-2721).
 */
export function burnTurnElsewhere(): boolean {
  if (skateWarOpen()) {
    skateParkTurn();
    return true;
  }
  if (
    availableAmount($item`Mer-kin gladiator mask`) === 0 ||
    availableAmount($item`Mer-kin gladiator tailpiece`) === 0
  ) {
    if (get("yogUrtDefeated")) gladiatorGearStep();
    else gymnasiumTurn();
    claimIceBuff();
    return true;
  }
  if (get("lastColosseumRoundWon", 0) < 15) {
    colosseumRoundTurn();
    return true;
  }
  return false;
}
```

- [ ] **Step 3: Fishy lutz rung + eatSushi export in `src/resources/fishy.ts`** — (a) change `function eatSushi(` to `export function eatSushi(`; (b) insert a new rung in `maintainFishy()` between the fishy-pipe rung and the pull-meal rung:

```ts
// Rung 1.5: Lutz the Ice Skate — free 30-turn Fishy once the skate war
// resolved for ice (statuseffects.txt:552; SkateParkRequest state2buff1).
if (get("skateParkStatus") === "ice" && !get("_skateBuff1")) {
  cliExecute("skate lutz");
  if (have(fishy)) return;
}
```

- [ ] **Step 4: Verify** — Run: `yarn check && yarn lint && yarn build` — Expected: pass; three bundles (Task 6's `./skatepark` import now resolves).

- [ ] **Step 5: Commit**

```bash
git add src/tasks/sorceress/skatepark.ts src/tasks/sorceress/burn.ts src/resources/fishy.ts
git commit -m "feat: skate-park war, burn-turn ladder, lutz fishy rung"
```

---

### Task 8: Teflon mining + crappy disguise — `src/tasks/sorceress/mine.ts`

**Upstream 2026-08-26 amendment** (`6b7cd80`, UTS:640-641 at 89982f5): `liftBeatenUp()` runs only once a teflon ore is in hand — cave-in Beaten Up is left standing while the Unaccompanied Miner trips continue (they are unaffected), so the Walrus/rest cost is paid once, after the dig succeeds. Mirror that in the dig task's post-dig cleanup: clear Beaten Up only when `itemAmount($item\`teflon ore\`) > 0`.

**Files:**

- Create: `src/tasks/sorceress/mine.ts`

**Interfaces:**

- Consumes: `discretionaryPull`/`pullSequence`/`pulledToday`/`pullBudgetAllows` (pulls), `recover` (lib), `itemDropEffects` (moods), `CombatStrategy` (engine/combat), `killMacro`.
- Produces: `mineQuest(): Quest`.

Why this exists (ash UTS:2295-2354, 2450-2478): deepcity access needs a Mer-kin disguise; the crappy tailpiece is Grandma-bartered from **sea chaps + teflon swim fins + 3 pristine fish scales** (ROW125), the fins smith from **teflon ore** (items.txt:3728: `smith`), and the crappy mask from **aerated diving helmet + 3 scales** (ROW124) — `retrieveItem` resolves both chains. Ore comes from the Anemone Mine mini-game (`mine=3`), which needs the Mer-kin digpick; the five daily Unaccompanied Miner picks and the lodestone's Loded effect make it turn-free. The ash's pre-farm of 10 sand dollars (UTS:2452-2454) has no consumer in the trade rows and is dropped.

- [ ] **Step 1: Write `src/tasks/sorceress/mine.ts`**

```ts
import {
  abort,
  adv1,
  availableAmount,
  equip,
  itemAmount,
  retrieveItem,
  use,
  useSkill,
  visitUrl,
} from "kolmafia";
import { $effect, $item, $items, $location, $skill, get, have } from "libram";

import { CombatStrategy, killMacro } from "../../engine/combat";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { itemDropEffects } from "../../lib/moods";
import { discretionaryPull, pulledToday, pullSequence } from "../../resources/pulls";

const digpick = $item`Mer-kin digpick`;
const ore = $item`teflon ore`;
const crappyMask = $item`crappy Mer-kin mask`;
const crappyTailpiece = $item`crappy Mer-kin tailpiece`;
const scale = $item`pristine fish scale`;
const blackGlass = $item`black glass`;
const masks = $items`Mer-kin gladiator mask, Mer-kin scholar mask, crappy Mer-kin mask`;
const tailpieces = $items`Mer-kin gladiator tailpiece, Mer-kin scholar tailpiece, crappy Mer-kin tailpiece, teflon swim fins`;

function maskOwned(): boolean {
  return masks.some((it) => availableAmount(it) > 0);
}
function tailpieceOwned(): boolean {
  return tailpieces.some((it) => availableAmount(it) > 0);
}

/** Lucky! ladder (ash getLucky, G:259-275; the heartstone %luck rung is
 * skipped — %fn-family naming, add only if a live account needs it). The
 * 3/day hermit clover cap is the caller's abort condition. */
function getLucky(): void {
  if (have($effect`Lucky!`)) return;
  if (
    have($skill`Aug. 2nd: Find an Eleven-Leaf Clover Day`) &&
    !get("_aug2Cast", false) &&
    get("_augSkillsCast", 0) < 5
  ) {
    useSkill($skill`Aug. 2nd: Find an Eleven-Leaf Clover Day`);
    if (have($effect`Lucky!`)) return;
  }
  retrieveItem($item`11-leaf clover`);
  if (itemAmount($item`11-leaf clover`) > 0) use($item`11-leaf clover`);
}

// ── mining square selection (ash mineNum G:585-632, on mafia's mineState3:
// 36-char row-major 6x6, index (row-1)*6+(col-1), '*' = promising chunk,
// 'o' = open cavern (MineDecorator.java:76-103); dig URL which = row*8+col
// (MineDecorator.java:57-65)) ──
const SHAFT: [number, number][] = [
  [3, 6],
  [3, 5],
  [3, 4],
  [3, 3],
  [3, 2],
  [2, 2],
  [4, 2],
  [5, 2],
];

function stateAt(state: string, col: number, row: number): string {
  return state.charAt((row - 1) * 6 + (col - 1));
}

/** Bad-ore adjacency via mineLayout3's found-ore fragments "#N<img .../x.gif"
 * (ash adjacentCaverns G:566-583). */
function adjacentBadOre(col: number, row: number): boolean {
  const layout = get("mineLayout3", "");
  return [
    [col - 1, row],
    [col + 1, row],
    [col, row - 1],
    [col, row + 1],
  ].some(([c, r]) => {
    const m = new RegExp(`#${r * 8 + c}<img src="[^"]*/([^"]+)\\.gif"`).exec(layout);
    return m !== null && (m[1].includes("velcroore") || m[1].includes("vinylore"));
  });
}

function pickSquare(state: string): [number, number] {
  // 1. The fixed column-3 shaft, in ash order (G:592-601).
  const shaft = SHAFT.find(([c, r]) => stateAt(state, c, r) !== "o");
  if (shaft) return shaft;
  // 2. Promising chunks at row < 4 not adjacent to velcro/vinyl ore (G:604-618).
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < 36; i++) {
      if (state.charAt(i) !== "*") continue;
      const col = (i % 6) + 1;
      const row = Math.floor(i / 6) + 1;
      if (row >= 4) continue;
      if (pass === 0 && adjacentBadOre(col, row)) continue;
      return [col, row];
    }
  }
  abort(
    "Generic mining did not find teflon ore; mine Anemone Mine (mine 3) manually. TIP: the ores show up in adjacent veins of 5 (ash G:629-631).",
  );
  return [3, 6]; // unreachable; abort() throws
}

/** One dig (ash teflon(), UTS:603-615). Beaten Up from cave-ins is cleared by
 * engine post(). */
function mineSquare(): void {
  equip(digpick);
  equip($item`really, really nice swimming trunks`);
  visitUrl("mining.php?mine=3"); // refresh mineState3
  const state = get("mineState3", "");
  if (state.length !== 36) {
    abort(
      "mineState3 did not parse (expected 36 chars); visit mining.php?mine=3 manually and rerun.",
    );
  }
  const [col, row] = pickSquare(state);
  visitUrl(`mining.php?mine=3&which=${row * 8 + col}`);
}

export function mineQuest(): Quest {
  return {
    name: "Teflon",
    tasks: [
      {
        // Digpick first (ash UTS:2299-2318): pull it when policy allows,
        // else farm Anemone Mine with +item until it drops.
        name: "Digpick",
        ready: () => !tailpieceOwned() && itemAmount(ore) === 0,
        completed: () => availableAmount(digpick) > 0 || tailpieceOwned() || itemAmount(ore) > 0,
        prepare: (): void => {
          recover();
          if (availableAmount(digpick) === 0) discretionaryPull(digpick);
        },
        do: $location`Anemone Mine`,
        combat: new CombatStrategy().kill(),
        outfit: { modifier: "item" },
        effects: itemDropEffects,
        limit: {
          soft: 8,
          message: "No Mer-kin digpick after 8 turns; pull one manually and rerun.",
        },
      },
      {
        // Free picks (5/day Unaccompanied Miner) -> lodestone Loded picks ->
        // real-turn digs, one square per do() (ash UTS:2315-2354).
        name: "Mine Teflon",
        ready: () => availableAmount(digpick) > 0 && !tailpieceOwned(),
        completed: () => itemAmount(ore) > 0 || tailpieceOwned(),
        prepare: (): void => {
          recover();
          const freePicks =
            have($skill`Unaccompanied Miner`) && get("_unaccompaniedMinerUsed", 0) < 5;
          if (!freePicks && !have($effect`Loded`) && !pulledToday($item`lodestone`)) {
            if (pullSequence($item`lodestone`)) use($item`lodestone`);
          }
        },
        do: mineSquare,
        freeaction: () =>
          (have($skill`Unaccompanied Miner`) && get("_unaccompaniedMinerUsed", 0) < 5) ||
          have($effect`Loded`),
        underwater: true,
        limit: {
          soft: 20,
          message:
            "Teflon ore is not appearing. A minin' dynamite pull gives one more free blast (ash hint UTS:2348-2350), or mine manually — ores show in adjacent veins of 5.",
        },
      },
      {
        // Crappy mask: 3 pristine fish scales via Lucky! caliginous abyss
        // trips (ash UTS:2455-2466), then Grandma ROW124 via retrieveItem.
        name: "Crappy Mask",
        ready: () => !maskOwned(),
        completed: maskOwned,
        do: (): void => {
          if (availableAmount(scale) >= 3) {
            retrieveItem(crappyMask);
            return;
          }
          getLucky();
          if (!have($effect`Lucky!`)) {
            abort(
              `Need ${3 - availableAmount(scale)} more pristine fish scale(s) and out of hermitage clovers (3/day). Get scales (Lucky! caliginous abyss, or Madness Reef choice 310 conversions), then rerun.`,
            );
          }
          equip(blackGlass); // accessory; required for the Abyss (KoLAdventure CALIGINOUS_ABYSS gate)
          recover();
          adv1($location`The Caliginous Abyss`, -1, () => killMacro(false).toString());
        },
        underwater: true,
        limit: {
          soft: 8,
          message: "Pristine fish scales are not accumulating for the crappy mask.",
        },
      },
      {
        name: "Crappy Tailpiece",
        ready: () => !tailpieceOwned() && itemAmount(ore) > 0,
        completed: tailpieceOwned,
        do: (): void => {
          if (availableAmount(scale) >= 3) {
            // Chain: teflon ore -> smith teflon swim fins -> ROW125 trade;
            // mafia's retrieveItem walks it.
            retrieveItem(crappyTailpiece);
            return;
          }
          getLucky();
          if (!have($effect`Lucky!`)) {
            abort(
              `Need ${3 - availableAmount(scale)} more pristine fish scale(s) and out of hermitage clovers (3/day). Get scales, then rerun.`,
            );
          }
          equip(blackGlass);
          recover();
          adv1($location`The Caliginous Abyss`, -1, () => killMacro(false).toString());
        },
        underwater: true,
        limit: {
          soft: 8,
          message: "Pristine fish scales are not accumulating for the crappy tailpiece.",
        },
      },
    ],
  };
}
```

Note: if `retrieveItem(crappyTailpiece)` cannot see the smith step (mafia occasionally needs the fins made first), add `retrieveItem($item`teflon swim fins`)` before it and report; the sea chaps input exists from Phase 3's helmet/lasso work.

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass. `Loded` / `lodestone` / `Unaccompanied Miner` / `Aug. 2nd: Find an Eleven-Leaf Clover Day` are real names; lint is the authority.

- [ ] **Step 3: Commit**

```bash
git add src/tasks/sorceress/mine.ts
git commit -m "feat: teflon mining (mineState3 shaft policy) and crappy disguise barter"
```

---

### Task 9: Sorceress dailies — `src/tasks/sorceress/daily.ts`

**Files:**

- Create: `src/tasks/sorceress/daily.ts`

**Interfaces:**

- Consumes: `currentPolicy` (policy), `pullSequence` (pulls), libram `SourceTerminal`.
- Produces: `sorceressDailies(): Quest`, `sourceEnhanceItems(): void` (consumed by Task 10's farm prepare).

- [ ] **Step 1: Write `src/tasks/sorceress/daily.ts`**

```ts
import { cliExecute, use } from "kolmafia";
import { $item, get, have, SourceTerminal } from "libram";

import { Quest } from "../../engine/task";
import { haveAnywhere } from "../../lib";
import { currentPolicy } from "../../resources/policy";
import { pullSequence } from "../../resources/pulls";

const pyec = $item`Platinum Yendorian Express Card`;

/** Free +30% item, up to 3/day with CRAM+SCRAM chips (ChoiceControl.java:
 * 9070-9072); called from item-farm task prepares (ash mood hook UTS:74-77). */
export function sourceEnhanceItems(): void {
  if (!SourceTerminal.have()) return;
  if (have(SourceTerminal.Buffs.Items)) return;
  if (SourceTerminal.enhanceUsesRemaining() <= 0) return;
  SourceTerminal.enhance(SourceTerminal.Buffs.Items);
}

export function sorceressDailies(): Quest {
  return {
    name: "Sorceress Dailies",
    tasks: [
      {
        // Free daily buff the ash never claims (MomRequest.java:43-55; 7
        // options). "stats" = Cereal Killer, +200 exp -> mys -> spell damage.
        // Mafia auto-equips underwater gear for the visit (Checkpoint).
        name: "Mom Buff",
        ready: () => get("questS02Monkees") === "finished",
        completed: () => get("_momFoodReceived", false),
        do: () => void cliExecute("mom stats"),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        // PYEC (ash UTS:2323-2330, !highShiny gate -> usePyec policy). The
        // storage take is a real ronin pull — pullSequence keeps the books.
        name: "PYEC",
        ready: () => currentPolicy().usePyec && haveAnywhere(pyec),
        completed: () => get("expressCardUsed", false),
        do: (): void => {
          if (!have(pyec)) pullSequence(pyec);
          if (have(pyec)) use(pyec);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        // Slot duplicate.edu (ash sourceEducate G:984-988): 1/day in-path;
        // spent by the school monitor macro (Task 10).
        name: "Terminal Educate",
        ready: () => SourceTerminal.have(),
        completed: () => SourceTerminal.getSkills().includes(SourceTerminal.Skills.Duplicate),
        do: () => void SourceTerminal.educate(SourceTerminal.Skills.Duplicate),
        freeaction: true,
        limit: { tries: 1 },
      },
    ],
  };
}
```

If `SourceTerminal.Skills.Duplicate` is not a `Skill` (check `node_modules/libram/dist/resources/2016/SourceTerminal.d.ts:79` for `educate`'s parameter type), adapt to the module's actual shapes and report — do not hand-roll terminal URLs.

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/tasks/sorceress/daily.ts
git commit -m "feat: sorceress dailies — mom buff, PYEC, terminal duplicate educate"
```

---

### Task 10: Elementary school — `src/tasks/sorceress/school.ts`

**Files:**

- Create: `src/tasks/sorceress/school.ts`

**Interfaces:**

- Consumes: `isKnucklebonesAndSushiEnough` (Task 1), `sourceEnhanceItems` (Task 9), `sneakEffects`/`itemDropEffects` (moods), `sneakFamiliar` (engine/outfit), `pullSequence`/`pullBudgetAllows` (pulls), `recover`.
- Produces: `schoolQuest(): Quest`.

Route decision (ash UTS:2498-2614): when `isKnucklebonesAndSushiEnough()` — every candidate seed distinguishable by clues 4+7 — the school only needs the teacher unlock and the facecowl/waistrope drops (short route). Otherwise the long route grinds cheatsheets (monitors), the bunwig, and Mer-kin vocabulary to 90. Tasks re-evaluate the predicate every engine pass, so the long route **self-cancels** the moment seed narrowing catches up (an improvement over the ash's one-shot decision at UTS:2498). Hallpasses are closeted during -combat trips (an NC 705 eats a pass, CH-equivalent; ash brackets every trip, UTS:2503-2547) and reclaimed for +item trips.

- [ ] **Step 1: Write `src/tasks/sorceress/school.ts`**

```ts
import {
  availableAmount,
  buy,
  closetAmount,
  equip,
  itemAmount,
  maximize,
  pullsRemaining,
  putCloset,
  restoreHp,
  takeCloset,
  use,
  useSkill,
} from "kolmafia";
import { $coinmaster, $item, $location, $monster, $skill, $slot, get, have, Macro } from "libram";

import { CombatStrategy } from "../../engine/combat";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { isKnucklebonesAndSushiEnough } from "../../lib/dreadscroll";
import { itemDropEffects, sneakEffects } from "../../lib/moods";
import { sneakFamiliar } from "../../engine/outfit";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";
import { sourceEnhanceItems } from "./daily";

const school = $location`Mer-kin Elementary School`;
const hallpass = $item`Mer-kin hallpass`;
const cheatsheet = $item`Mer-kin cheatsheet`;
const wordquiz = $item`Mer-kin wordquiz`;
const facecowl = $item`Mer-kin facecowl`;
const waistrope = $item`Mer-kin waistrope`;
const bunwig = $item`Mer-kin bunwig`;
const monitor = $monster`Mer-kin monitor`;
const crappyPieces = [$item`crappy Mer-kin mask`, $item`crappy Mer-kin tailpiece`];

function cowlAndRope(): boolean {
  return (
    (availableAmount(facecowl) > 0 || availableAmount($item`Mer-kin scholar mask`) > 0) &&
    (availableAmount(waistrope) > 0 || availableAmount($item`Mer-kin scholar tailpiece`) > 0)
  );
}

function vocabularyDone(): boolean {
  return get("merkinVocabularyMastery", 0) >= 90 || isKnucklebonesAndSushiEnough();
}

export function schoolQuest(): Quest {
  return {
    name: "School",
    tasks: [
      {
        // Clue 3 first — it feeds the seed scan before any school turn is
        // spent (ash casts it at UTS:2486-2492). Deep Dark Visions must be
        // permed (sim.ts warns); without it the clue can still arrive by
        // seed inference.
        name: "Deep Dark Visions",
        ready: () => have($skill`Deep Dark Visions`),
        completed: () => get("dreadScroll3", 0) !== 0,
        do: (): void => {
          maximize("50 spooky res, hp", false);
          restoreHp(1000);
          useSkill($skill`Deep Dark Visions`);
        },
        freeaction: true,
        limit: { tries: 12, message: "Deep Dark Visions is not yielding dreadscroll clue 3." },
      },
      {
        // Teacher's lounge unlock via -combat NCs (ash UTS:2508-2528 /
        // 2582-2598). Choice handlers 396-398 take every unlock. The short
        // route escapes as soon as the cowl+rope pair lands.
        name: "School Unlocks",
        completed: () =>
          get("merkinElementaryTeacherUnlock", false) || cowlAndRope(),
        prepare: (): void => {
          putCloset(itemAmount(hallpass), hallpass);
          recover();
        },
        do: school,
        combat: new CombatStrategy().kill(),
        outfit: () => ({
          modifier: "-combat",
          equip: crappyPieces,
          familiar: sneakFamiliar(),
        }),
        effects: sneakEffects,
        limit: { soft: 15, message: "The teacher's lounge is not unlocking (choices 396-398)." },
      },
      // ...tasks continue in the next block (same array)...
```

The long route's vocabulary work is split into a use-task and a farm-task (grimoire cannot mix a zero-turn `use` branch and an engine-run adventure in one `do`); they alternate naturally via list order and `ready()`. Continue the `tasks` array:

```ts
      {
        // Long route: spend quizzes whenever a cheatsheet is on hand.
        name: "Use Wordquiz",
        ready: () =>
          !isKnucklebonesAndSushiEnough() &&
          itemAmount(wordquiz) > 0 &&
          (itemAmount(cheatsheet) > 0 || pullsRemaining() > 0),
        completed: vocabularyDone,
        do: (): void => {
          if (itemAmount(cheatsheet) === 0) pullSequence(cheatsheet);
          if (itemAmount(cheatsheet) > 0) use(wordquiz);
        },
        freeaction: true,
        limit: { tries: 15, message: "Wordquiz uses are not raising merkinVocabularyMastery." },
      },
      {
        // Long route: farm monitors (cheatsheets), the bunwig, and quizzes.
        // Peridot pins the monitor (engine choice-1557 write); the ash used
        // mimic eggs (choiceAdventure1589 victim=852, UTS:1015) — Peridot is
        // our already-built equivalent. Duplicate doubles the drop table
        // (1/day; trySkill self-gates once spent).
        name: "Farm School",
        ready: () => !isKnucklebonesAndSushiEnough(),
        completed: () =>
          vocabularyDone() ||
          (itemAmount(wordquiz) > 0 && (itemAmount(cheatsheet) > 0 || pullsRemaining() > 0)),
        prepare: (): void => {
          takeCloset(closetAmount(hallpass), hallpass);
          sourceEnhanceItems();
          recover();
        },
        do: school,
        peridot: monitor,
        combat: new CombatStrategy()
          .macro(() => Macro.trySkill($skill`Duplicate`), monitor)
          .kill(),
        outfit: () => ({
          modifier: availableAmount(bunwig) > 0 ? "item" : "item, hat drop",
          equip: crappyPieces,
        }),
        effects: itemDropEffects,
        limit: { soft: 30, message: "School farming is not producing cheatsheets/wordquizzes." },
      },
      {
        // Both routes: the facecowl/waistrope pair for scholar gear
        // (+item; ash UTS:2600-2614 incl. the hallpass top-up pull).
        name: "Cowl and Rope",
        completed: cowlAndRope,
        prepare: (): void => {
          takeCloset(closetAmount(hallpass), hallpass);
          sourceEnhanceItems();
          if (
            (availableAmount(facecowl) > 0 || availableAmount(waistrope) > 0) &&
            availableAmount(hallpass) === 0 &&
            pullBudgetAllows(hallpass)
          ) {
            pullSequence(hallpass);
          }
          recover();
        },
        do: school,
        combat: new CombatStrategy().kill(),
        outfit: { modifier: "item", equip: crappyPieces },
        effects: itemDropEffects,
        limit: { soft: 20, message: "The facecowl/waistrope pair is not dropping." },
      },
      {
        // Grandma trade (ash buyScholarGear G:419-432): hat/pants must be
        // bare — the pieces being traded may be worn.
        name: "Buy Scholar Gear",
        ready: cowlAndRope,
        completed: () =>
          availableAmount($item`Mer-kin scholar mask`) > 0 &&
          availableAmount($item`Mer-kin scholar tailpiece`) > 0,
        do: (): void => {
          equip($slot`hat`, $item.none);
          equip($slot`pants`, $item.none);
          equip($item`really, really nice swimming trunks`);
          if (availableAmount($item`Mer-kin scholar mask`) === 0) {
            buy($coinmaster`Grandma Sea Monkey`, 1, $item`Mer-kin scholar mask`);
          }
          if (availableAmount($item`Mer-kin scholar tailpiece`) === 0) {
            buy($coinmaster`Grandma Sea Monkey`, 1, $item`Mer-kin scholar tailpiece`);
          }
        },
        freeaction: true,
        limit: { tries: 2 },
      },
    ],
  };
}
```

Final task order inside `schoolQuest`: Deep Dark Visions, School Unlocks, Use Wordquiz, Farm School, Cowl and Rope, Buy Scholar Gear (one `tasks` array across the two blocks above). Trim any import the final file does not use.

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass. `Duplicate` is the Source Terminal combat skill (classskills.txt); if lint flags it as unknown, verify in the data file and use the documented-disable convention only if it is real but lagging.

- [ ] **Step 3: Commit**

```bash
git add src/tasks/sorceress/school.ts
git commit -m "feat: elementary school — unlocks, dual-route vocabulary grind, scholar gear"
```

---

### Task 11: Library, dreadscroll spading, High Priest — `src/tasks/sorceress/library.ts`

**Upstream 2026-08-26 amendment** (`6b7cd80`, UTS:778-785 at 89982f5): the blood cubic zirconia rides only while scroll drops are still needed (healscroll < 2, or worktea/knucklebone missing with `dreadScroll7 == 0`, or killscroll missing with `dreadScroll5 == 0`); once they are in hand the accessory slot goes back to the maximizer. In the Library Farm outfit below, add the BCZ to `equip` under exactly that condition and to `avoid` otherwise.

**Files:**

- Create: `src/tasks/sorceress/library.ts`

**Interfaces:**

- Consumes: `godRunGuardCheck` (Task 1), `burnTurnElsewhere` (Task 7), `eatSushi` (fishy), `sourceEnhanceItems` (Task 9), `saberForcesFree` (resources/saber), `pullSequence`/`pulledToday` (pulls), `CombatStrategy`, `Task.saberPurpose`.
- Produces: `libraryQuest(): Quest`.

- [ ] **Step 1: Write `src/tasks/sorceress/library.ts`**

```ts
import {
  abort,
  availableAmount,
  fullnessLimit,
  itemAmount,
  myFullness,
  retrieveItem,
  use,
} from "kolmafia";
import { $effect, $item, $location, $monster, get, have, Macro } from "libram";

import { CombatStrategy } from "../../engine/combat";
import { sneakFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { godRunGuardCheck } from "../../lib/dreadscroll";
import { itemDropEffects, sneakEffects } from "../../lib/moods";
import { eatSushi } from "../../resources/fishy";
import { pulledToday, pullSequence } from "../../resources/pulls";
import { saberForcesFree } from "../../resources/saber";

import { burnTurnElsewhere } from "./burn";
import { sourceEnhanceItems } from "./daily";

const library = $location`Mer-kin Library`;
const dreadscroll = $item`Mer-kin dreadscroll`;
const researcher = $monster`Mer-kin researcher`;
const scholarPieces = [$item`Mer-kin scholar mask`, $item`Mer-kin scholar tailpiece`];
const worktea = $item`Mer-kin worktea`;
const knucklebone = $item`Mer-kin knucklebone`;

function catalogCluesKnown(): boolean {
  return [1, 6, 8].every((n) => get(`dreadScroll${n}`, 0) !== 0);
}

export function libraryQuest(): Quest {
  return {
    name: "Library",
    tasks: [
      {
        // Farm the dreadscroll + catalog clues 1/6/8 (choice 704, handled in
        // the bundle; mafia tracks merkinCatalogChoices). Outfit flips like
        // the ash (merkinLib G:726-760): +item while the scroll is missing
        // (researcher scrolls, worktea, knucklebone are the 10% slots),
        // -combat once it drops (the remaining need is the catalog NC). The
        // researcher saber Force lands both combat scrolls in one charge —
        // the monodent stays OUT of the weapon slot while a spare charge
        // exists (G:733-748); Phase 3's engine handles the equip.
        name: "Library Farm",
        completed: () => availableAmount(dreadscroll) > 0 && catalogCluesKnown(),
        prepare: (): void => {
          sourceEnhanceItems();
          recover();
        },
        do: library,
        saberPurpose: "researcher",
        combat: new CombatStrategy()
          .macro(() => {
            // Combat clue throws (CCS:1155-1163; every library monster is
            // mer-kin phylum, so no phylum guard needed here).
            const m = new Macro();
            if (get("dreadScroll2", 0) === 0) m.tryItem($item`Mer-kin healscroll`);
            if (get("dreadScroll5", 0) === 0) m.tryItem($item`Mer-kin killscroll`);
            return m;
          })
          .forceItems(researcher)
          .kill(),
        outfit: () => {
          const scrollsMissing =
            itemAmount($item`Mer-kin killscroll`) === 0 ||
            itemAmount($item`Mer-kin healscroll`) === 0 ||
            itemAmount(worktea) === 0 ||
            itemAmount(knucklebone) === 0;
          const saberForResearcher =
            scrollsMissing && saberForcesFree() > 0 && have($item`Fourth of May Cosplay Saber`);
          const monodent =
            !saberForResearcher && scrollsMissing && have($item`monodent of the sea`)
              ? [$item`monodent of the sea`]
              : [];
          if (availableAmount(dreadscroll) === 0) {
            return { modifier: "item", equip: [...scholarPieces, ...monodent] };
          }
          return { modifier: "-combat", equip: scholarPieces, familiar: sneakFamiliar() };
        },
        effects: () => (availableAmount(dreadscroll) === 0 ? itemDropEffects() : sneakEffects()),
        limit: {
          soft: 30,
          message: "Library is yielding neither the dreadscroll nor catalog clues.",
        },
      },
      {
        // Clue 4 (ash UTS:2629-2634): knucklebone bounce.
        name: "Knucklebone",
        ready: () => availableAmount(dreadscroll) > 0 && get("dreadScroll4", 0) === 0,
        completed: () => get("dreadScroll4", 0) !== 0,
        do: (): void => {
          if (itemAmount(knucklebone) === 0 && !pulledToday(knucklebone)) pullSequence(knucklebone);
          if (itemAmount(knucklebone) === 0) {
            abort(
              "No Mer-kin knucklebone (drop it in the library or load one in Hagnk's); acquire one and rerun.",
            );
          }
          use(knucklebone);
        },
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // Clue 7 (ash UTS:2635-2640): any sushi eaten while holding a
        // worktea drinks the tea (SushiRequest.java:542-543). Skipped when
        // vocabulary can read the scroll line (>= 90); the 703 handler
        // brute-forces the single unknown otherwise.
        name: "Worktea Sushi",
        ready: () =>
          availableAmount(dreadscroll) > 0 &&
          get("dreadScroll7", 0) === 0 &&
          get("merkinVocabularyMastery", 0) < 90,
        completed: () => get("dreadScroll7", 0) !== 0 || get("merkinVocabularyMastery", 0) >= 90,
        do: (): void => {
          if (itemAmount(worktea) === 0 && !pulledToday(worktea)) pullSequence(worktea);
          if (itemAmount(worktea) === 0) {
            abort(
              "No Mer-kin worktea for clue 7 (farm the library alphabetizer or load one in Hagnk's), or raise vocabulary to 90; then rerun.",
            );
          }
          if (fullnessLimit() - myFullness() < 2) {
            abort(
              "No room for a 2-fullness nigiri to drink the worktea; free up fullness and rerun.",
            );
          }
          retrieveItem($item`white rice`);
          if (!eatSushi()) {
            abort(
              "Could not roll a nigiri (need fish meat + white rice + the sushi mat); fix supplies and rerun.",
            );
          }
        },
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // Use the scroll; a wrong guess grants Deep-Tainted Mind, burned on
        // the skate/gym ladder (ash High Priest loop UTS:2682-2723).
        name: "High Priest",
        ready: () => availableAmount(dreadscroll) > 0 && catalogCluesKnown(),
        completed: () => get("isMerkinHighPriest", false),
        do: (): void => {
          if (have($effect`Deep-Tainted Mind`)) {
            if (!burnTurnElsewhere()) {
              abort(
                "Hit a 1-in-40 situation — spend 1 non-free turn anywhere and rerun (ash UTS:2719-2721).",
              );
            }
            return;
          }
          godRunGuardCheck();
          use(dreadscroll); // fires choice 703; the bundle submits the answers
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

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass. `monodent of the sea` casing per items.txt; `effects` as a delayed function must match the Task type (Phase 3 uses `effects: itemDropEffects` — a function returning `Effect[]` — so the arrow form is type-compatible; if tsc disagrees, split the task's effects to the dominant +item case and report).

- [ ] **Step 3: Commit**

```bash
git add src/tasks/sorceress/library.ts
git commit -m "feat: library farm, dreadscroll clue spading, high priest loop"
```

---

### Task 12: Yog-Urt — `src/tasks/sorceress/yogurt.ts`

**Upstream 2026-08-26 amendment** (`6b7cd80` — the Yog-Urt healing rework, G:691-757 and UTS:2696-2905 at 89982f5; supersedes the bead/heal accounting in the code below, which must be executed in this amended form):

1. **Healing model.** Replace `healingSlotFillers() >= 3` with the ash's throw budget. Heals needed by prayerbeads equipped: `{0: 21, 1: 5, 2: 3, 3: 2}` (`YogHealingsNeeded`); heals owned = the number of DISTINCT healing item types on hand among sea gel, Mer-kin healscroll, waterlogged scroll of healing, soggy used band-aid, New Age healing crystal (`YogHealingsOwned()`); the prayerbead farm/pull loops run while `needed[min(beads, 3)] - owned > pullsRemaining()` (every ash site — post-hallpass, post-facecowl, pre-fight — now uses this one condition instead of the old `3 - beads > pulls` / `< 2` pair). Two beads + a healing crystal + band-aid pull is therefore a complete kit; three beads still preferred when the outpost farm is free.
2. **HP prediction replaces the flat max-HP abort.** Port `trueHPPercent()` (`(myMaxhp() - numericModifier("Maximum HP")) / (myBuffedstat(Muscle) + 3)`, rounded to 2 places) and `YogHpCheck()`: predicted post-debuff Muscle = `round(30 * (1 + numericModifier("Muscle Percent")/100)) + numericModifier("Muscle")`; predicted HP = `round((mus + 3) * trueHPPercent()) + numericModifier("Maximum HP")`; `maxHeal` = the smallest heal among the owned types the fight will throw (HealingHP: sea gel 500, healscroll 300, waterlogged 250, band-aid 1000, crystal 500). If `predictedHP * 0.9 > maxHeal` and Gummiheart is up: pull the **soft green echo eyedrop antidote** and `uneffect Gummiheart`, re-predict; abort "Muscle/HP too high" only if still over. The Gummiheart Burn task stays as the first, free option; the antidote is the fallback the ash added because the burn ladder can run dry. Take the antidote pull **before** the healscroll pull when `trueHPPercent() >= 1.4` (UTS:2830-2836: the late pulls can exhaust the day's budget before the check runs; under 1.4 HP/Muscle a flat +100 Muscle cannot reach the threshold). The antidote is in the sim pull list already.
3. **Fight familiar.** `use_familiar("exp")` — a familiar that never attacks, so the boss soaks its experience: Chest Mimic → Cooler Yeti → Cookbookbat → none (UTS:29-37 at 89982f5). Set it in the Yog-Urt task outfit (`familiar:`), same for Shub (Task 13). The bathysphere/das boot lands via the engine's familiar-breathing enforcement.
4. **Filter (Task 5 `yogUrtFilter`).** The CCS throws a fifth heal when only one prayerbead is equipped (CCS:1107-1108 at 89982f5: a third `equipped_amount(prayerbeads) < 2` throw). Add a `step === 4` heal branch guarded by `equippedAmount(beads) < 2` before the elixir/unguent pair.

**Files:**

- Create: `src/tasks/sorceress/yogurt.ts`

**Interfaces:**

- Consumes: `burnTurnElsewhere` (Task 7), `yogUrtFilter` (Task 5), `pullSequence`/`pulledToday` (pulls), `currentPolicy`, `recover`.
- Produces: `yogUrtQuest(): Quest`.

- [ ] **Step 1: Write `src/tasks/sorceress/yogurt.ts`**

```ts
import {
  abort,
  adv1,
  availableAmount,
  buy,
  equip,
  itemAmount,
  myMaxhp,
  retrieveItem,
  use,
  useSkill,
} from "kolmafia";
import { $coinmaster, $effect, $item, $items, $location, $skill, $slot, get, have } from "libram";

import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { currentPolicy } from "../../resources/policy";
import { pulledToday, pullSequence } from "../../resources/pulls";

import { burnTurnElsewhere } from "./burn";
import { yogUrtFilter } from "./fights";

const beads = $item`Mer-kin prayerbeads`;
const healscroll = $item`Mer-kin healscroll`;
const waterlogged = $item`waterlogged scroll of healing`;
const gel = $item`sea gel`;
const unguent = $item`Doc Galaktik's Pungent Unguent`;
const elixir = $item`Doc Galaktik's Homeopathic Elixir`;
const crystal = $item`New Age healing crystal`;
const bandaid = $item`soggy used band-aid`;
const yogDelevelStock = $items`Mer-kin mouthsoap, crayon shavings, table tennis ball, sea cowbell`;

function delevelersOwned(): number {
  // ash delevelers() (G:634-640; its duplicate mouthsoap entry collapsed).
  return yogDelevelStock.filter((it) => itemAmount(it) > 0).length;
}

function healingSlotFillers(): number {
  return availableAmount(beads) + itemAmount(bandaid) + itemAmount(crystal);
}

function yogPrepComplete(): boolean {
  return (
    itemAmount(healscroll) > 0 &&
    itemAmount(waterlogged) > 0 &&
    itemAmount(gel) > 0 &&
    itemAmount(unguent) > 0 &&
    itemAmount(elixir) > 0 &&
    delevelersOwned() >= 2 &&
    healingSlotFillers() >= 3
  );
}

export function yogUrtQuest(): Quest {
  return {
    name: "Yog-Urt",
    tasks: [
      {
        // Gummiheart inflates max HP past the <= 311 ceiling; burn its turns
        // on route work first (ash UTS:2744-2762, stall-guarded).
        name: "Gummiheart Burn",
        ready: () => have($effect`Gummiheart`) && !get("yogUrtDefeated"),
        completed: () => !have($effect`Gummiheart`),
        do: (): void => {
          if (!burnTurnElsewhere()) {
            abort(
              "Gummiheart is inflating max HP past what the healing items can out-heal and there is nowhere left to burn its turns. Spend them anywhere, or remove it (soft green echo eyedrop antidote), then rerun (ash UTS:2814-2815).",
            );
          }
        },
        underwater: true,
        limit: { soft: 12, message: "Gummiheart is not burning down." },
      },
      {
        // Stock the fight (ash UTS:2740-2803): healscroll pull, Wet Crap
        // heals, Doc Galaktik pair, two delevelers (null-day covers a
        // shortfall via Null Afternoon), three prayerbead-slot fillers.
        name: "Yog Prep",
        ready: () => get("isMerkinHighPriest", false) && !get("yogUrtDefeated"),
        completed: yogPrepComplete,
        do: (): void => {
          if (itemAmount(healscroll) === 0 && !pulledToday(healscroll)) pullSequence(healscroll);
          if (itemAmount(waterlogged) === 0 && itemAmount($item`sand penny`) >= 10) {
            buy($coinmaster`Wet Crap For Sale`, 1, waterlogged);
          }
          if (itemAmount(gel) === 0 && itemAmount($item`sand penny`) >= 10) {
            buy($coinmaster`Wet Crap For Sale`, 1, gel);
          }
          retrieveItem(unguent);
          retrieveItem(elixir);
          if (delevelersOwned() < 2 && !pulledToday($item`null-day exploit`)) {
            if (pullSequence($item`null-day exploit`)) use($item`null-day exploit`);
          }
          if (delevelersOwned() < 2 && !have($effect`Null Afternoon`)) {
            abort(
              "Yog-Urt prep is short: need two deleveler types (Mer-kin mouthsoap / crayon shavings / table tennis ball / sea cowbell) or Null Afternoon. Farm the corral for cowbells or pull delevelers, then rerun.",
            );
          }
          if (availableAmount(beads) < 3 && !pulledToday(beads)) pullSequence(beads);
          if (healingSlotFillers() < 3 && !pulledToday(crystal)) pullSequence(crystal);
          if (healingSlotFillers() < 3 && !pulledToday(bandaid)) pullSequence(bandaid);
          if (healingSlotFillers() < 3) {
            abort(
              "Fewer than three prayerbeads/band-aid/crystal accessories for Yog-Urt; farm outpost prayerbeads (-combat, healer saber) manually or load pulls, then rerun.",
            );
          }
        },
        freeaction: true,
        limit: { tries: 3 },
      },
      {
        // The fight (UTS:2783-2816 + CCS:1230-1249): -hp outfit, three bead
        // slots, hard max-HP ceiling, Cannelloni Cocoon to full.
        name: "Yog-Urt",
        ready: () =>
          yogPrepComplete() && !have($effect`Gummiheart`) && get("isMerkinHighPriest", false),
        completed: () => get("yogUrtDefeated", false),
        prepare: (): void => {
          for (const slot of [$slot`acc1`, $slot`acc2`, $slot`acc3`].slice(
            0,
            availableAmount(beads),
          )) {
            equip(slot, beads);
          }
          if (have($skill`Cannelloni Cocoon`)) useSkill($skill`Cannelloni Cocoon`);
          recover(311, 100);
          if (myMaxhp() > 311) {
            abort(
              "Too much HP to beat Yog-Urt (need < 312 after debuff) — check what's granting HP (ash CCS:1231-1232).",
            );
          }
        },
        do: () => void adv1($location`Mer-kin Temple (Right Door)`, -1, yogUrtFilter()),
        outfit: () => ({
          modifier:
            "moxie, hot damage, cold damage, spooky damage, sleaze damage, stench damage, -hp, -equip tiny yam cannon",
          equip: [
            $item`Mer-kin scholar mask`,
            $item`Mer-kin scholar tailpiece`,
            ...(currentPolicy().conserveFreeFights ? [] : [$item`bat wings`]),
          ],
        }),
        underwater: true,
        limit: { tries: 3, message: "Yog-Urt is not dying; check the deleveler/heal stock." },
      },
    ],
  };
}
```

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint && yarn build` — Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/tasks/sorceress/yogurt.ts
git commit -m "feat: yog-urt — gummiheart burn, prep ladder, right-door fight"
```

---

### Task 13: Shub-Jigguwatt + finale — `shub.ts`, `finale.ts`

**Upstream 2026-08-26 amendment** (`6b7cd80`, UTS:3002-3010, 3040-3047 at 89982f5): the Shub outfit below sets no familiar, which leaves whatever fought last — an attacking familiar deals damage and triggers his doubling retaliation. Add `familiar:` = the non-attacking "exp" pick (Chest Mimic → Cooler Yeti → Cookbookbat → `$familiar.none`; see Task 12 §3) to the Shub-Jigguwatt task, and give the Nautical Seaceress outfit the same familiar rule for the free experience (the ash adds `bathysphere(toy cupid bow)` to both — the engine's familiar-breathing enforcement covers it). The Scarysauce removal below is already the fixed form (the ash's old `"uneffect" + ef` lacked the space).

**Files:**

- Create: `src/tasks/sorceress/shub.ts`, `src/tasks/sorceress/finale.ts`

**Interfaces:**

- Consumes: `shubPrepShort` (Task 2), `shubFilter`/`centerDoorFilter` (Task 5), `currentPolicy`, `pullSequence`/`pulledToday`, libram `EternityCodpiece`.
- Produces: `shubQuest(): Quest`, `finaleQuest(): Quest`.

- [ ] **Step 1: Write `src/tasks/sorceress/shub.ts`**

```ts
import {
  abort,
  adv1,
  cliExecute,
  itemAmount,
  myBuffedstat,
  myMaxhp,
  use,
  useSkill,
} from "kolmafia";
import { $effect, $item, $location, $skill, $stat, get, have } from "libram";

import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { shubPrepShort } from "../../lib/shub";
import { currentPolicy } from "../../resources/policy";
import { pulledToday, pullSequence } from "../../resources/pulls";

import { shubFilter } from "./fights";

export function shubQuest(): Quest {
  return {
    name: "Shub",
    tasks: [
      {
        // Delevel stock check (ash UTS:2878-2903): the null-day exploit's
        // Null Afternoon substitutes for the whole stock. The golem-summon
        // shortfall lane is dropped — shavings arrive via the Phase 3
        // grandpa golem lane + the standing 9-shaving pull reservation.
        name: "Shub Prep",
        ready: () => get("isMerkinGladiatorChampion", false) && !get("shubJigguwattDefeated"),
        completed: () => !shubPrepShort(0),
        do: (): void => {
          if (!pulledToday($item`null-day exploit`) && pullSequence($item`null-day exploit`)) {
            use($item`null-day exploit`);
          }
          if (shubPrepShort(0)) {
            abort(
              "Shub prep is short: need delevelers that floor his attack (two jam band bootlegs, four crayon shavings, or a mix — bootlegs count double, rattler rattle / electronics kit slightly less than a shaving) or Null Afternoon. Paw wishes, golem fights and rollover pulls all work; acquire and rerun (ash UTS:2896-2903).",
            );
          }
        },
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // The fight (UTS:2905-2955 + CCS:1251-1256): DA/mus outfit over the
        // gladiator set, insurance consumables, Ruthless Efficiency BEFORE
        // the MP dump ("emptying the pool blunts the pre-fight bolt",
        // UTS:2946-2954), full HP, then physical-only swings behind the
        // multiplicative delevel. A loss is a sanctioned retry (engine
        // post()'s Shub carve-out): rerun re-preps and re-enters.
        name: "Shub-Jigguwatt",
        ready: () => get("isMerkinGladiatorChampion", false) && !shubPrepShort(0),
        completed: () => get("shubJigguwattDefeated", false),
        prepare: (): void => {
          if (have($effect`Scarysauce`)) cliExecute("uneffect Scarysauce");
          if (currentPolicy().shubInsurancePulls || myBuffedstat($stat`Muscle`) < 1250) {
            if (itemAmount($item`gremlin juice`) === 0 && !pulledToday($item`gremlin juice`)) {
              pullSequence($item`gremlin juice`);
            }
            if (
              itemAmount($item`handful of hand chalk`) === 0 &&
              !pulledToday($item`handful of hand chalk`)
            ) {
              pullSequence($item`handful of hand chalk`);
            }
          }
          if (itemAmount($item`gremlin juice`) > 0) use($item`gremlin juice`);
          if (itemAmount($item`handful of hand chalk`) > 0) use($item`handful of hand chalk`);
          recover(myMaxhp(), 0);
          if (have($skill`Ruthless Efficiency`)) useSkill($skill`Ruthless Efficiency`);
          if (have($skill`Empathy of the Newt`)) cliExecute("cast * empathy of the newt");
        },
        do: () => void adv1($location`Mer-kin Temple (Left Door)`, -1, shubFilter()),
        outfit: {
          modifier: "damage absorption, mus",
          equip: [$item`Mer-kin gladiator mask`, $item`Mer-kin gladiator tailpiece`],
        },
        underwater: true,
        limit: {
          tries: 4,
          message:
            "Shub keeps winning; stock more delevelers (each loss also weakens him) and rerun.",
        },
      },
    ],
  };
}
```

- [ ] **Step 2: Write `src/tasks/sorceress/finale.ts`**

```ts
import {
  adv1,
  availableAmount,
  buy,
  cliExecute,
  equippedItem,
  itemAmount,
  unequip,
} from "kolmafia";
import { $coinmaster, $item, $location, EternityCodpiece, get, have } from "libram";

import { Quest } from "../../engine/task";
import { questStepOf, recover } from "../../lib";
import { currentPolicy } from "../../resources/policy";

import { centerDoorFilter } from "./fights";

const pearl = $item`unblemished pearl`;

function bothGodsDead(): boolean {
  return get("shubJigguwattDefeated", false) && get("yogUrtDefeated", false);
}

export function finaleQuest(): Quest {
  return {
    name: "Finale",
    tasks: [
      {
        // The five pearls came in codpiece-smuggled (init Pearl Guard);
        // they have to come back OUT for the quest (loop repo
        // thesea.ts:38-46 pryPearls — unequip(slot) works; equip() on
        // codpiece slots does not).
        name: "Pry Pearls",
        ready: bothGodsDead,
        completed: () =>
          !EternityCodpiece.have() ||
          EternityCodpiece.SLOTS.every((slot) => equippedItem(slot) !== pearl),
        do: (): void => {
          for (const slot of EternityCodpiece.SLOTS) {
            if (equippedItem(slot) === pearl) unequip(slot);
          }
          cliExecute("refresh inv");
        },
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // Two center-door advs (ash UTS:2959-2974); the CCS-side fight is
        // centerDoorFilter. Plain high-stats fight — no gimmicks
        // (monsters.txt:1457: Atk 2000 Def 2500 HP 4000).
        name: "Nautical Seaceress",
        ready: bothGodsDead,
        completed: () => questStepOf("questL13Final") >= 999,
        prepare: () => recover(),
        do: () => void adv1($location`Mer-kin Temple (Center Door)`, -1, centerDoorFilter()),
        outfit: () => ({
          modifier: "spell damage percent, mys",
          equip: [
            $item`Mer-kin gladiator mask`,
            $item`Mer-kin gladiator tailpiece`,
            $item`Congressional Medal of Insanity`,
            ...(!currentPolicy().conserveFreeFights &&
            get("_batWingsFreeFights", 0) < 5 &&
            have($item`bat wings`)
              ? [$item`bat wings`]
              : []),
          ],
        }),
        underwater: true,
        limit: { tries: 5, message: "The Seaceress is not falling; check spell damage and MP." },
      },
      {
        // Post-quest penny dump + council (ash UTS:2985-2995). main.ts's
        // postloopCommand hook fires once every task completes.
        name: "Penny Dump",
        ready: () => questStepOf("questL13Final") >= 999,
        completed: () => itemAmount($item`sand penny`) <= 10,
        do: (): void => {
          while (itemAmount($item`sand penny`) > 30) {
            if (!buy($coinmaster`Wet Crap For Sale`, 1, $item`water-logged pill`)) break;
          }
          while (itemAmount($item`sand penny`) > 10) {
            if (!buy($coinmaster`Wet Crap For Sale`, 1, $item`waterlogged scroll of healing`))
              break;
          }
          cliExecute("council");
          cliExecute("council");
        },
        freeaction: true,
        limit: { tries: 2 },
      },
    ],
  };
}
```

- [ ] **Step 3: Verify** — Run: `yarn check && yarn lint` — Expected: pass. `EternityCodpiece.SLOTS` are `$slots\`codpiece1..5\``(libram dist/resources/2026/EternityCodpiece.d.ts);`equippedItem`/`unequip` accept them.

- [ ] **Step 4: Commit**

```bash
git add src/tasks/sorceress/shub.ts src/tasks/sorceress/finale.ts
git commit -m "feat: shub prep + left-door fight, pearl pry, seaceress finale, penny dump"
```

---

### Task 14: Runplan composition, README, release cleanup

**Upstream 2026-08-26 amendment** (`6b7cd80`, UTS:2927-2932 at 89982f5): the late-pull ladder (peppermint parasol, ink bladder, Mer-kin pinkslip, stuffed yam stinkbomb, Louder Than Bomb, anchor bomb — wherever Task 14's runplan or a daily task lands it) skips the parasol when a navel ring or GAP is owned **anywhere** (`haveAnywhere`, i.e. Hagnk's counts — the GAP pull in Phase 3's Guild Test already brings it in on payphone accounts); `pulls.ts`'s escape-gear reservation keeps its inventory test (`availableAmount`), since a stored GAP still needs its own pull. README: mention that `subaqua sim` now prints a permable-skill checklist (required / big turn saver / optional) alongside the IOTM and pull lists.

**Files:**

- Modify: `src/tasks/runplans.ts`
- Replace: `README.md`

**Interfaces:**

- Consumes: every quest factory from Tasks 6-13.
- Produces: the complete per-tier runplan; the public README.

- [ ] **Step 1: Final `src/tasks/runplans.ts`** — extend the existing composition (keep the Phase 3 header comment, append to it):

```ts
import { getTasks } from "grimoire-kolmafia";

import { Task } from "../engine/task";
import { Tier } from "../lib/tier";

import { initQuest } from "./init";
import { bigBrotherQuest } from "./monkees/bigbrother";
import { corralQuest } from "./monkees/corral";
import { currentsQuest } from "./monkees/currents";
import { grandpaQuest } from "./monkees/grandpa";
import { guildTasks } from "./monkees/guild";
import { helmetQuest } from "./monkees/helmet";
import { momQuest, wandererTasks } from "./monkees/mom";
import { outpostQuest } from "./monkees/outpost";
import { pelletQuest } from "./monkees/pellet";
import { colosseumQuest } from "./sorceress/colosseum";
import { sorceressDailies } from "./sorceress/daily";
import { finaleQuest } from "./sorceress/finale";
import { gearQuest } from "./sorceress/gym";
import { libraryQuest } from "./sorceress/library";
import { mineQuest } from "./sorceress/mine";
import { schoolQuest } from "./sorceress/school";
import { shubQuest } from "./sorceress/shub";
import { skateParkQuest } from "./sorceress/skatepark";
import { yogUrtQuest } from "./sorceress/yogurt";

/**
 * One composition per tier (spec §3). List order is priority: init dailies,
 * wanderer redemptions, the seaMonkees() spine (Phase 3), then the
 * sorceress endgame in ash order (UTS:2269-2999): dailies, teflon/disguise,
 * school, library/High Priest, skate war, Yog-Urt, gladiator gear,
 * colosseum, Shub, finale. Phase 4 quests carry NO tier options — their
 * tier behavior lives entirely in ResourcePolicy (conserveFreeFights,
 * usePyec, shubInsurancePulls, allowClubEmBackInTime, pull gates).
 */
export function buildRunplan(tier: Tier): Task[] {
  const wanderers = { name: "Wanderers", tasks: wandererTasks() };
  const high = tier === "high";
  return getTasks([
    initQuest(),
    wanderers,
    guildTasks({ phonelessSwordOnly: !high, unlockGuild: !high }),
    pelletQuest(),
    bigBrotherQuest(),
    grandpaQuest({ golem: !high }),
    outpostQuest(),
    currentsQuest(),
    helmetQuest({ summonLane: !high }),
    momQuest({ cyber: !high }),
    corralQuest({ opener: !high, swordLane: high }),
    sorceressDailies(),
    mineQuest(),
    schoolQuest(),
    libraryQuest(),
    skateParkQuest(),
    yogUrtQuest(),
    gearQuest(),
    colosseumQuest(),
    shubQuest(),
    finaleQuest(),
  ]);
}
```

- [ ] **Step 2: Replace `README.md`** with the public release README (skeleton: `../UnderTheSea/README.md` — read it for tone; content below is complete):

```markdown
# SubAqua

A one-shot speedrun script for the **11,037 Leagues Under the Sea** challenge
path (path id 55), written in TypeScript on grimoire-kolmafia/libram. It runs
the path from initialization through the Nautical Seaceress with minimal
resource waste, then stops — no aftercore, no farming.

## Requirements

- KoLmafia r29108 or later.
- A Sauceror (or at least a Saucegeyser/Saucestorm caster) is the tested
  route; other classes fall back to plain attacks in boss fights.
- **Five unblemished pearls loaded into the Eternity Codpiece before you
  ascend** — the finale needs them and they cannot be acquired in-path.
  `subaqua sim` checks this and everything below.
- **Deep Dark Visions permed** (dreadscroll clue 3's only in-run source; the
  seed solver can often infer it, but don't bet a run on it).
- Sushi-rolling mat installed; permanent sea zone unlocks (Dive Bar,
  Marinara Trench, Anemone Mine, Skate Park, Madness Reef) done; underwater
  maps purchased.
- A clan photobooth with the Sheriff kit (e.g. BAFH).

## Usage

    subaqua sim        # pre-ascension checklist + tier verdict; no server hits that spend anything
    subaqua            # run the route
    subaqua actions=10 # run 10 tasks and stop (incremental testing)
    subaqua list       # print the runplan with per-task completion

Options: `tier=low|mid|high` (override detection), `buyLimit=N` (mall spend
ceiling per purchase; defaults to your autoBuyPriceLimit), `godRunGuard`
(abort at <= 17 turns played if dreadscroll clue 7 is unknown),
`seedScan=false` (disable the one-time dreadscroll seed-space scan),
`postloopCommand="..."` (CLI to run after the finale).

## Tiers

Detected at startup (override with `tier=`):

- **low**: owns none of 2002 Mr. Store Catalog / cursed monkey's paw /
  august scepter. Farms instead of pulling; conserves nothing.
- **high**: `garbo_valueOfFreeFight` > `valueOfAdventure`. Banks free
  fights and copies for aftercore; darts-only free kills.
- **mid**: everything else. Spends everything on speed.

## Safety

The script never opens confirmation dialogs; when it cannot proceed it
aborts with instructions. All state is re-derived from KoLmafia's own quest
tracking, so aborting anywhere and rerunning is always safe.

## Building from source

    yarn install && yarn build && yarn mafia   # deploys dist/ into your mafia folder
```

- [ ] **Step 3: Release-cruft check** — `ls dependencies.txt webpack.config.js prefs.txt 2>/dev/null` — spec §7 wants them gone; if any survived Phases 1-3, `git rm` them. Also confirm `src/sim.ts` still lists the pearls/DDV/sushi-mat/zone checks (spec §7) — grep `sim.ts` for "Deep Dark Visions"; no edit expected.

- [ ] **Step 4: Verify** — Run: `yarn check && yarn lint && yarn build` — Expected: pass; three bundles. Then confirm the composition compiles the whole spine: `grep -c "name:" src/tasks/runplans.ts` is not meaningful — instead run `node -e "1"` — no; the real check is the build itself plus a manual read of `buildRunplan` against this plan's order.

- [ ] **Step 5: Commit**

```bash
git add src/tasks/runplans.ts README.md
git commit -m "feat: full per-tier runplan with sorceress endgame; public README"
```

---

## Phase exit criteria

- `yarn check`, `yarn lint`, `yarn build` all green; three bundles.
- `subaqua list` prints the full route: init → monkee spine → sorceress endgame, with completed-status flags.
- Live validation is the **user's**: incremental `subaqua actions=N` runs. Everything re-derives from mafia state (`isMerkinHighPriest`, `lastColosseumRoundWon`, `shubJigguwattDefeated`, …), so re-runs fast-forward; a Shub loss re-preps and retries by design.
- The run terminates at `questL13Final == "finished"` + penny dump; `postloopCommand` fires from main.ts on that route-terminal condition (`routeComplete()` in finale.ts), NOT on every task reporting complete — several tasks are legitimately not-applicable rather than complete on a given account (no PYEC, no Source Terminal, no Skate Park map, a prep whose stock the boss fight consumed), so an all-complete trigger could never fire.

## Deliberate deferrals and drops (tracked, not gaps)

Dropped this phase, with reasoning recorded in the pricing table above: shadow-rift subsystem (re-entry criterion: smoke test shows corral lasso training > ~8 real turns on a payphone account), NCtoC/Club 'Em Across the Battlefield + `elementaryQueue`, in-run codpiece gem socketing, Corral-Leather McTwist guard, baseball diamond / backup camera / Macrometeorite / Map the Monsters / Time-Spinner-refight / Pocket Professor / otoscope optimizer layers, Wet Crap stat scrolls, bang-potion delevel throws, the ash's Steely-Eyed-Squint library interleave (UTS:2568-2578), the ash's golem-summon Shub-shortfall lane (UTS:2907-2915 — shavings arrive via the Phase 3 golem lane + pull reservation; the abort essay covers the residue), the ash's 10-sand-dollar pre-farm before the disguise (UTS:2452-2454 — no consumer in the verified trade rows), and the heartstone %luck rung of getLucky. If live runs surface any of these as real turn losses, they slot into the existing task structure without redesign.

## Self-review notes (resolved during planning)

- **Telegraph counters and `% 3` weapon rotation from spec §5 are consciously NOT implemented** — research showed neither exists in the battle-tested ash (ground-truth corrections 1-2); the spec's own caveat ("primary kill plan stays the ash's spell route") is the controlling clause. The stall regime + nuke-first port is the ash's final, twice-bug-fixed form.
- **Scholar-strand guard** (gym.ts): the ash's burn ladder can trade Scholar's Vestments away before Yog-Urt needs them at the Right Door; our trade gates on `yogUrtDefeated`. Deviation documented in code.
- **`isKnucklebonesAndSushiEnough` off-by-one fixed** relative to the ash (clues 4/7, not 5/8) — with `dreadSeedCheck`'s mapping as the authority, matching the ash's own `dreadScrollX ← dreadscroll[x-1]`.
- **dreadSeedCheck improvement**: writes any clue all candidates agree on, not only at uniqueness — strictly more information, zero risk.
- **Seed-scan cost containment**: full scan gated on seahorse name + ≥2 clues, one-shot per constraint level (`subaqua_seedScanFloor`), cached per ascension, arg-disableable (`seedScan=false`), and the 703 Mastermind solver remains a complete fallback.
- **Choice-1387/saber invariants**: no Phase 4 site touches choice 1387 or equips the saber in the colosseum; the library researcher Force reuses the Phase 3 purpose ladder (`saberPurpose: "researcher"`).
- **Type consistency check**: `CombatFilter` consumers all call `adv1(loc, -1, filter())`; `Quest`/`Task` factories match Phase 3's shapes; policy fields referenced (`conserveFreeFights`, `usePyec`, `shubInsurancePulls`, `allowClubEmBackInTime`) all exist after Task 2.
