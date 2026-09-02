# 2026-08-27 post-run diagnosis — subaqua (turns 1–70) vs UnderTheSea (71–137)

Source: `~/Library/Application Support/KoLmafia/sessions/chartreusenator_20260827.txt`
(subaqua = lines 83254–95292, UTS = 95346–102985). Baselines: UTS runs 08-16..08-26
(same path, one start per day on clean days), deployed ash `scripts/UnderTheSea*.ash`.
Deployed subaqua build: worktree `phase4-sorceress` HEAD 17d3d61 (live fixes landed
mid-run: 84a3fda, dba0206, 40ac1ab, c08dc0e, 17d3d61).

## TL;DR

1. **The run was slow because of a config change, not (mainly) script bugs.** At log:83487 the
   user ran `set garbo_valueOfFreeFight = 12000`. With `valueOfAdventure = 6000`, both scripts'
   tier rule (`highShiny()` = `garbo_valueOfFreeFight > valueOfAdventure`, Globals:79;
   `lib/tier.ts:17-19`) flipped **mid → high** (log:83490). High tier is the _free-fight-conserving_
   regime in the ash itself: dart-only free kills (CCS:7-13), no backup camera (UTS:761), no
   golem recall (UTS:1271), no bat wings / Club 'Em (UTS:2297-2299), no shadow-rift lasso
   training (UTS:2433), Abyss grind to 40 instead of the Cyberzone lane (UTS:1583-1612).
   `garbo_valueOfFreeFight` had never been set on this account before today, so **UTS has never
   run in high mode here** — the 42–47-turn baselines (08-16..08-26) are all mid-tier runs with
   86–109 free combats each. Today: subaqua 13 free combats, UTS 18.
2. **subaqua's abort was a missing rung, identical in the ash.** `Teflon/Crappy Tailpiece`
   aborts when 3 hermit clovers are spent (`mine.ts`); the deployed ash aborts at the exact same
   point (UTS:2572 — and did, at log:97701). UTS only "finished" because the user hand-drove
   Madness Reef → _Heavily Invested in Pun Futures_ → _The Economist of Scales_ (choice 311/1 then
   310/2 ×2: 20 rough scales → 2 pristine, log:97784-97799). subaqua had banked 22 rough scales
   from its four _University of Fish_ trips; the exchange is a 1–2 turn task it doesn't have.
3. **Real subaqua defects found** (turn cost today in parentheses): round-1 lasso throw never fires
   (`!pastround 1` is already true on the first action → `lassoTrainingCount` stayed 0; UTS spent
   turns 71–79 training/taming) (~9); no school-of-many handling in the Abyss (7 zero-progress
   turns); Mine Teflon digs refused at 0 HP (534 wasted requests, 2 reruns); Grandpa outfit
   `-combat, item` at equal weight (3 combats in 6 turns); dolphin whistle fired with 9 lassos in
   stock (1); VHS recorded on a school of many at progress 0 (+2 instead of +3). Plus the four bugs
   already fixed live today (peridot 1557 loop, helmet gating, lodestone, unbounded mining).
4. **UTS needed 7 restarts and 4 manual interventions** to finish: Asdon fuel abort, "acquire
   fishy failed" ×3 (user: `wish lucky` → The Haggling; `use pocket wish` fishy; pulled an
   11-leaf clover → The Haggling), CCS abort on a Mer-kin rustler, the scales abort (user: manual
   Madness Reef), a lost bladeswitcher fight in the colosseum. Its endgame took 66 turns vs its
   own 27–30 on mid-tier days.

## Timeline

| Turns   | Owner    | Phase                                                             | Today | UTS mid-tier baseline (08-26) |
| ------- | -------- | ----------------------------------------------------------------- | ----- | ----------------------------- |
| 1–2     | subaqua  | Init, Sword Imprint (locket → cowboy), Garden, Wreck rescue       | 2     | 4–5                           |
| 3–8     | subaqua  | Grandpa (Trench)                                                  | 6     | 3                             |
| 9–33    | subaqua  | Outpost (Grandma 5, Lockkey 17, Stashbox 3)                       | 25    | 4–5                           |
| 34–52   | subaqua  | Abyss Mom (grind to 40)                                           | 19    | ~1 paid (+6 Cyberzone free)   |
| 52–60   | subaqua  | Corral leather + lassos (no training happened)                    | 9     | ~1                            |
| 61–62   | subaqua  | Digpick, Mine Teflon (3 reruns)                                   | 2     | 1                             |
| 62–64   | subaqua  | Crappy Mask: 3 Lucky! trips (Aug 2nd skill + 2 hermit clovers)    | 3     | 3                             |
| 65–70   | subaqua  | Wreck rivets (peridot loop rerun; 2 Forces) → helmet → mask       | 6     | ~1                            |
| 70      | subaqua  | Tailpiece: 3rd hermit clover → 1 pristine; **abort: need 2 more** | 1     | 1                             |
| 71–79   | UTS      | numberology, backupLasso training (Trench 8 + Corral 10), taming  | 9     | 0 (shadow rift)               |
| 80–81   | **user** | Madness Reef → Economist of Scales (2 pristine)                   | 2     | —                             |
| 82–104  | UTS      | Elementary School (19), Library (6), dreadscroll                  | 26    | 8                             |
| 105–116 | UTS      | Skate park (5), gym (4), rests                                    | 11    | 8                             |
| 117–137 | UTS      | Colosseum (17), temple ×3, Shub, NS                               | 21    | 13                            |

Totals: 137 turns vs 42–47 on every clean day since 08-16.

## Why the monkee phase took 70 turns

Per-phase audits (three read-only log comparisons, details in the session) converge on the
same ranking:

1. **Tier flip → no free-fight chains.** Mid-tier UTS does the Outpost lockkey hunt with 9 golem
   habitat copies + 7 backup-camera healer copies + BCZ Sweat Bullets (all free); Mom with
   _Recall Facts: Monster Habitats_ + 6 Cyberzone free fights; lasso training with 7 shadow-rift
   free fights; taming as one Peridot-forced free fight. Every one of those is `!highShiny()`-gated
   in the ash and `!high`-gated in `runplans.ts:57-69`. subaqua's high runplan (73 tasks) is a
   faithful port of the ash's high branch here — including `momQuest({ cyber: !high })`: the ash
   at high grinds the Abyss to 40 first (UTS:1583-1612) and its Cyberzone lane is only reachable
   below 24. (Checked and discarded: a claim that BCZ Sweat Bullets is cast at high in the ash —
   `freeKill()` returns `""` before the BCZ line at high, Globals:462-466.)
2. **Lockkey RNG**: 19 Mer-kin healer kills before the lockkey vs 5–6 on 08-23/08-26; stashbox in
   the 3rd hut (search order is the ash's). ~10 turns of pure luck.
3. **Lasso training never happened** (bug, below): with training riding on the ~50 paid fights
   subaqua does anyway, the shadow-rift drop costs 0 turns; without the throw firing it cost the
   whole taming lane (UTS: 9 turns).
4. **Abyss**: 7 of 19 turns on _school of many_ with no Monodent / no banish / no free kill;
   VHS spent at progress 0.
5. **Grandpa**: 3 combats in 6 turns at equal `-combat, item` weight (ash: `item drop, -100 combat`).

## Defects and fixes (ranked by turns, with the ash reference)

| #   | Defect                                                                                                                                                                                                                                                                                                                                                                                     | Where                                                                      | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Turns                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| 1   | No pristine-scale exchange rung; abort after 3 hermit clovers (ash has the same abort, UTS:2572)                                                                                                                                                                                                                                                                                           | `tasks/sorceress/mine.ts` Crappy Mask / Crappy Tailpiece                   | New task **Scale Exchange**: when `rough fish scale ≥ 10` and pristine short, adventure at Madness Reef (`-combat`, an NC force if one is cheap) until _Heavily Invested in Pun Futures_; choice 311→1, then 310/2 per 10 rough (310/1 for 10 dull → 1 rough first if it closes the gap). Run the four Lucky! trips first (Aug 2nd + 3 hermit) so 20 rough are banked, then exchange. Keep the clover-pull / pocket-wish rungs as user-decided extras. | abort → run continues; 1–2 turns |
| 2   | Round-1 lasso throw never fires: `Macro.ifNot("pastround 1", tryItem(sea lasso))` — KoL's `pastround 1` is true on the first player action (log:90101 fight: 2 lassos in inventory, macro ran, first action Micrometeorite; `!pastround 2` blocks did fire). `lassoTrainingCount` 0 all run → Tame Seahorse never ready; 2 paid seahorse runaways; `lassosDone` counted stock as training. | `engine/engine.ts:260`; `combat.ts:297-302` documents the wrong assumption | Guard on `!pastround 2` (verify with one fight: expect "uses the sea lasso" at Round 1 and `lassoTrainingCount` +1..3). Then `lassosDone` can go back to the ash's ≤5–6 lasso target (UTS:1680).                                                                                                                                                                                                                                                       | ~9 (UTS 71–79)                   |
| 3   | Abyss: no _school of many_ handling — outfit excludes the Monodent, combat is plain `.kill()`                                                                                                                                                                                                                                                                                              | `tasks/monkees/mom.ts:212-230`                                             | Port the ash: Monodent equipped while school of many is unbanished (UTS:381/724/1601) and CCS `Sea *dent: Throw a Lightning Bolt` + Garbage Nova on it (CCS:938-941); at high tier also the sea cowboy hat for lasso training in the Abyss (UTS:1600-1603). Move `vhsMacro()` to the ash's window (22 < progress < 33, eye/slithering first; UTS:378).                                                                                                 | ~7                               |
| 4   | Mine Teflon: two digs cost 754/739 HP, HP hit 0, next ~530 digs refused; today's bounded loop will now _abort_ with the diagnostic instead of recovering                                                                                                                                                                                                                                   | `tasks/sorceress/mine.ts` dig loop                                         | After each dig, if `myHp() === 0` or Beaten Up: Cannelloni Cocoon, Tongue of the Walrus (only allowed healers), then continue (ash: `restore HP` at 0 HP after every dig, UTS:636-637).                                                                                                                                                                                                                                                                | 2 reruns, 0 turns                |
| 5   | Grandpa outfit `-combat, item` at equal weight                                                                                                                                                                                                                                                                                                                                             | `tasks/monkees/grandpa.ts:28`                                              | `item, -100 combat` like UTS:1262 (sneakmask/latte mug/ski were left off today).                                                                                                                                                                                                                                                                                                                                                                       | ~3                               |
| 6   | Dolphin whistle fires for lasso/leather/cowbell regardless of stock (9 lassos → paid thief fight)                                                                                                                                                                                                                                                                                          | `engine/engine.ts:902` `alwaysWhistle`                                     | Whistle only when the stolen item's count is 0 (ash `monkeypaw()`, UTS:840-846).                                                                                                                                                                                                                                                                                                                                                                       | 1                                |
| 7   | Locket spent on the cowboy at turn 1, so Diver Summon had no summon; no mimic egg laid                                                                                                                                                                                                                                                                                                     | `tasks/init.ts:343`, `Openers/Sword Imprint`, `helmet.ts`                  | At high the ash imprints the cowboy too (`SWordLasso`, `highShiny() \|\| !payphone`), but its `rivetHunt()` still lays a mimic egg (`%fn, lay an egg`) and copies the diver. Port the egg lane; at mid, reserve the locket for the diver.                                                                                                                                                                                                              | ~2                               |
| 8   | Fixed live today, unverified on a fresh run: peridot 1557 loop (17d3d61 — gate on `appearanceRates(loc, true)`, choice.ts fallback, hard stop), helmet gating (40ac1ab, c08dc0e), lodestone before giving up (dba0206), bounded mining (84a3fda), empty-macro/boots free run (17665e7, ee5d2d8, 62cedbd, 5b6c92f)                                                                          | —                                                                          | Re-verify on the next run.                                                                                                                                                                                                                                                                                                                                                                                                                             | —                                |

## Tier decision (user's call — this changes the run more than every bug above combined)

- `garbo_valueOfFreeFight=12000` is now persisted in prefs; every future UTS **and** subaqua run
  will be high tier until it is unset or `valueOfAdventure` is raised above it. Neither script has
  a measured high-tier baseline on this account.
- On the user's own numbers, conserving a free fight for garbo (12,000) beats spending it in-run
  (≤ 1 turn ≈ 6,000) — that is the ash's rationale. But today's cost was ~90 extra turns
  (137 vs ~45), i.e. ~540k meat of `valueOfAdventure`, against at most ~90 free fights × 6,000
  net = 540k. The break-even is thin and assumes garbo actually consumes every conserved fight.
- Options: (a) `set garbo_valueOfFreeFight = 0` (or run `subaqua tier=mid`) and get back to the
  mid-tier runs the 12-day baseline was built on; (b) keep high and accept a longer run, in which
  case the fix list above is what makes the high runplan competitive with the ash's own high branch.

## UTS-side notes for the Phase 4 endgame port

- Aborts today: Asdon fuel (`post_adv`:301), `acquire fishy failed` ×3 (`post_adv`:330 — the
  fishy ladder ran dry; user fixes were Lucky! → _The Haggling_ (Brinier Deepers, Fishy 20) via
  `wish lucky` and a pulled 11-leaf clover, plus a pocket-wish Fishy; note mafia printed "Fishy is
  wishable, but KoLmafia thought it was not"), CCS abort vs Mer-kin rustler with a sea-cow crystal
  ball prediction (UTS:2523), scales abort (UTS:2572), lost bladeswitcher fight in the colosseum
  (`post_adv`:252). The subaqua fishy ladder (`resources/fishy.ts`) should be checked for the
  Haggling rung (Lucky! sources are also the scale sources — they compete).
- Endgame turn counts today (high tier, post-interventions): Elementary 19, Library 6,
  dreadscroll 1, Skate Park 5 (+1 rest), Gym 4, Colosseum 17, Temple 3, Shub 1, NS 1. Mid-tier
  08-26: Yog prep 4, library 2, High Priest 6, gym 3, colosseum 12, Shub 1, NS 1.
- UTS spent a turn cooking 42 soda bread for Asdon fuel (turn 72) and drank 4 astral pilsners.

## Status 2026-08-28

Applied on `worktree-phase4-sorceress` (38445cf..621b84a) and deployed with `yarn mafia`:
#1 Scale Exchange (`scaleTrip()`), #2 `!pastround N+1` guards, #3 Abyss school of many +
Peridot eye, #4 `healForDig()`, #5 Grandpa `item, -100 combat`, #6 whistle at count 0.
#7 dropped: the ash skips the diver-summon lane at high tier too (`count_summons() >= 1 &&
!highShiny()`, UTS:1378). Tier pref: user to run `set garbo_valueOfFreeFight =` in the gCLI
(mafia was running; the prefs file is not safely editable from outside). None of the six is
live-verified yet — first checkpoints on the next run: a "uses the sea lasso" line at Round 1 of
the first corral fight and `lassoTrainingCount` moving; Mine Teflon completing in one call.

## Day 2 — 2026-08-28 run (mid tier): 136 turns, finished

Six live stops, none turn-costing, all fixed in place: Cyber Rock `repeat` (bccb7d6), sushi `make`
(90236e9), Asdon bumper fuel gate (194eb64), Economist-of-Scales handler loop (4c51dc6), peridot
"offered" check vs the crystal ball + choice-1557 hardening (5c0b67c), familiar breathing for the
fielded familiar (eceb111), Picking Sides 403 (85bdb73), soda-bread Waterproofly refuel (e82f55e).

Turn accounting vs the 08-26 UTS baseline (42–47): Monkees 42 vs 14 (lasso training on paid corral
fights, Abyss grind to 40, lockkey/stashbox RNG, boots never castable, Banish Constructs re-run);
School 41 vs 5 (seed scan gated on ≥2 clues → `isKnucklebonesAndSushiEnough()` false by
construction → 90-mastery grind); Library 11 vs 2 (same root, no Force left for the researcher,
clue items stolen un-whistled); Gym 14 vs 3 (no free-run/banish step in gym fights); Skate 5,
Colosseum 10, Yog/Shub/NS 3 — parity.

Fixes committed (user directive "do all the fixes, we need parity with UTS"), 9f0bb38..edfb5ea:
seed scan on the seahorse name alone; library clue items whistled; Banish Constructs completion
gate + no crystal ball in the Abyss; sea lasso always pulled at Init; researcher Force reservation;
second golem habitat recall at the Outpost; gym free-run/banish ladder + gear; **backup camera
port** (resources/backup.ts, Task.backup, engine round-1 prepend; sites: school/library free
monsters, Outpost golem/healer cap 7, first corral turn Abyss copies; policy useBackupCamera,
high=false); Mom bar = ash initialMomProgress with a deferred "Mom Finish" quest before Shub.
Open: "Release the Boots" fielded but never castable in the Trench (2 turns, cause not pinned);
lasso count divergence at turns 33-36 (a throw consumes the lasso — likely not a bug); 4-nova
loop after a Lightning Bolt banish (0 turns). None of the day-2 fixes are live-verified yet.
