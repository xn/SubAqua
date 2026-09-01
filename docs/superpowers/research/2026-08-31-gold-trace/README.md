# Gold-run trace — collated findings (2026-08-31)

Gold = UTS 2026-08-21, **41 turns**, 118 combats, **104 free / 14 paid**.
Yesterday = SubAqua 2026-08-30, **119 turns**, 165 combats, **80 free / 85 paid**.
Verbatim logs: `../runs/gold-uts-2026-08-21.log`, `../runs/subaqua-2026-08-30.log`.
Method and slices: `BRIEF.md`. Per-phase reports: `A-` … `F-` (each has a step-by-step
run-vs-run catalogue in §2 and a gold→code decision trace in §3; `F-` Appendix A is the
per-combat ledger of both runs).

73 of yesterday's 85 paid fights happened in zones where gold paid **nothing**
(School 30, Gym 15, Corral 7, Abyss +7, Library 5, Outpost 4, Bakery 2, Mine 2, whistle 1).

## Phase deltas (by `[N]` markers)

| Phase                                           | Gold | Yesterday |                        Δ | Report |
| ----------------------------------------------- | ---: | --------: | -----------------------: | ------ |
| A. Openers → Outpost                            |   15 |        15 | 0 (−4 guild, +4 outpost) | A      |
| B. Helmet / Mom / corral / rift / mine / taming |    0 |        15 |                      +15 | B      |
| C. School + Library + High Priest               |    6 |        43 |                      +37 | C      |
| D. Yog + Gym + Skate                            |   10 |        26 |           +17 (gym 4→20) | D      |
| E. Colosseum + Mom finish + Shub + NS           |   11 |        19 |            +8 (Abyss +7) | E      |

## Root causes, ranked by turns (deduplicated across reports)

Letters: (a) code defect · (b) feature missing vs the ash · (c) RNG · (d) state carried in.

|   # | Root cause                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |                              Turns | Where                                                                                                                                                                                                                                                                                                                          | Fix                                                                                                                                                                                                | Reports                    |
| --: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
|   1 | **Hallpass supply for cowl + rope.** Gold banked 10 hallpasses in 11 _free_ school-unlock fights (Refracted Gaze / Talk to Some Fish → ~5 Mer-kin items per fight) and took cowl + rope from two "Halls Passing in the Night" superlikelies in 2 turns. Yesterday entered the hunt with 0 passes; the only two kept passes were dolphin-stolen with a whistle in hand; no pull was attempted.                                                                                                                                                                                                                                                                    |                                ~30 | (a)+(b) `engine.ts:1021` whistle list omits hallpass; `school.ts:236-242` pull gated by budget; Gaze/Some Fish not implemented                                                                                                                                                                                                 | whistle stolen passes; self-reserved hallpass pull once the lounge is open; port Gaze + Some Fish at the school; pure −combat objective (`school.ts:243` `"-combat, item"` vs ash `"-combat,sea"`) | C F1, F4, F5               |
|   2 | **Gym banish budget.** Gold arrived with latte / Feel Hatred / snokebomb banked and made all 4 gym fights free. Yesterday: latte spent at t4 in the Trench, Feel Hatred ×3 at the Outpost, then 16 bare Spring Kicks (kick never ends a fight) shadowing 2 unused snokebombs + 2 Reflex Hammers.                                                                                                                                                                                                                                                                                                                                                                 |                      15 (+3–5 avg) | (a) `banish.ts:59-63` bare kick (freerun.ts fixed in tree, **unverified live**); `grandpa.ts:32-35` lacks the ash bowling-ball gate before latte; `outpost.ts:166` stashbox banishes the healer instead of free-killing it; gym doesn't dress free-kill gear (ash G:659 Sheriff set; `fights.ts:143-148` refuses unworn kills) | verify kick→Spring Away holds 3 concurrent banishes; gate latte; free-kill bead-short healers; dress free-kill gear at the gym                                                                     | D F1, F4; A F3; F #2       |
|   3 | **Shadow-brick supply (gold 12 → yesterday 0).** Gold yoinked bricks off shadow slabs (Swoop like a Bat / Mild Evil / Douse Foe / Septapus) and spent 10 as free kills (School ×8, Abyss ×2). Yesterday's 3 leftover bricks went on corral tumbleweeds. Bat wings, Mild Evil and 7 embers were on hand.                                                                                                                                                                                                                                                                                                                                                          | ~10 direct, 13–17 incl. starvation | (b) `shadow.ts:34-38` declines the port                                                                                                                                                                                                                                                                                        | port the slab yoink lane; reserve bricks for School/Abyss                                                                                                                                          | F #1; C F2; E F3; B F1     |
|   4 | **Backup-camera policy.** (i) Outpost copies healers _out of_ free golem/burglar fights — each copy costs a free-kill charge (`backup.ts:9-12` "refunds its adventure" is false, Y:4763). (ii) Corral opener's backup converts the fight so McTwist (monster-scoped to the sea cow) never fires → paid opener, no free 2 cowbell / 2 leather / 2 lasso bundle → 2 extra Forces + 2 paw wishes → researcher Force never granted → paid library researcher. (iii) VHS tape unredeemed turns 17→108 (`vhsMacro` only on `abyssCombat`) → Mom bar 23 vs 30. (iv) 3 backup charges unused all day; Kramco is not a resource so `backup:{targets:"free"}` never seeds. |                    4 + 1 + 2–5 + 3 | (a) `outpost.ts:82-90`; `corral.ts:250-268`; `mom.ts:229-258, 239, 348`; `saber.ts:93-100`                                                                                                                                                                                                                                     | back up only _into_ free targets (ash CCS:684-707); McTwist on the copied fight; VHS macro on Habitats/Cyber Mom + shark jumper in those outfits                                                   | A F1; B F4; E F2; F #3, #7 |
|   5 | **Second habitat recall never fires (off-by-one).** `_monsterHabitatsFightsLeft` is decremented at encounter, so the 5th golem is met at build-time value 1. Gold: 10+ free golems, 15 crayon shavings, free screech at t14. Yesterday: 5 golems, 4 shavings, screech deferred to a paid Bakery trip; the shavings shortfall later blocked the skate-blade pull and the digpick pull via reservations.                                                                                                                                                                                                                                                           |                     ~4 + 2 + 1 + 1 | (a) `outpost.ts:70` `=== 0` → `<= 1` (screechTurn already uses `=== 1`)                                                                                                                                                                                                                                                        | one-line fix                                                                                                                                                                                       | A F2; F #4; D F2; B F3, F6 |
|   6 | **Seahorse taming.** One banish source armed per compile so waffled cows/rustler fell to the kill ladder; no ink-bladder free-run rung (ash CCS:97; one was owned); banishing all three draws produced tumbleweeds killed at a turn each. Gold: Peridot cow→Curveball, rustler→Feel Hatred, waffle→ink bladder ×2, waffle→seahorse, all free.                                                                                                                                                                                                                                                                                                                    |                                  6 | (a)+(b) `corral.ts:400`; `freerun.ts` lacks ink bladder                                                                                                                                                                                                                                                                        | arm the full banish set per compile; add ink bladder; don't banish the last draw                                                                                                                   | B F1                       |
|   7 | **Crappy disguise scales.** Gold: a pristine scale from 16/16 rift fights (PYEC → Shadow Affinity 16 _before_ the rift, item familiar + gear). Yesterday: 2/11 — ran the whole slice on the Patriotic Eagle (`chooseFamiliar()` never called), rift outfit lacks FLUDA/Kramco/wings, PYEC after the rift.                                                                                                                                                                                                                                                                                                                                                        |                                  4 | (a)+(b) `outfit.ts:153`; `runplans.ts:76`                                                                                                                                                                                                                                                                                      | PYEC before the rift; item familiar + gear in the rift                                                                                                                                             | B F2                       |
|   8 | **Mom finish.** Jelly lapsed so Abyss kills gave +2 not +3 (scale-mail not owned; jelly can't be re-pulled, `pulls.ts:33`); Banish Constructs re-fired for a paid Bakery fight (`completed` keyed on `_cyberFreeFights >= 10`, `mom.ts:186-190`); Abyss Habitats has no `peridot:` so a Peanut cost a turn (`mom.ts:251-277`).                                                                                                                                                                                                                                                                                                                                   |                          3 + 1 + 1 | (d)+(a)                                                                                                                                                                                                                                                                                                                        | scale-mail pull when jelly is down (legality unverified); gate on `momSeaMonkeeProgress`; peridot on Habitats                                                                                      | E F1, F4; B F5             |
|   9 | **Pull-budget reservation math.** Reservations for pinkslip / prayerbeads / parasol were never spent; init's sea-lasso + SCUBA pulls (`init.ts:339-345`, stale rationale) ate the slack; digpick farmed (2), skate blade not pulled (1 + a forcer), hallpass not pulled (#1). Gold used 10 pulls to yesterday's 12 and still pulled digpick + blade.                                                                                                                                                                                                                                                                                                             |                                 3+ | (a) `pulls.ts` reservations                                                                                                                                                                                                                                                                                                    | spend-or-release reservations; blade outranks parasol/pinkslip while the war is open                                                                                                               | B F3; D F2; A notes        |
|  10 | Minor / unverified: X-Ray ×3 + bullseye spent at t0–t1 (2–3); parka YR on the flytrap at t1 (gold never cast it); Macrometeorite re-rolls ×10 not wired (5–8, share unverified); Kramco never equipped (2–3); colosseum bat-wing proc −1 (c).                                                                                                                                                                                                                                                                                                                                                                                                                    |                                  — | —                                                                                                                                                                                                                                                                                                                              | —                                                                                                                                                                                                  | A F4-5; F #5-7; E F5       |

Decision-for-decision **SAME** (no action): guild test route, Shub prep + fight, Seaceress,
colosseum rounds, seed pin / DDV / 703 solver, library lane rules and clue tasks, scholar
trade, bosses' combat. Corral-opener/Trench/rift/cyber/pantry combats are at parity in `F-` §10.

## What each phase report could not verify (needs a live check or a wiki/mafia read)

- A: in-game lockkey drop rule (turns-spent gate?), pantry choice defaults, how the crystal ball reached the turkey.
- B: exact Refracted Gaze / Talk to Some Fish mechanics; yesterday's rift item%; seahorse spawn vs banish state.
- C: yesterday's −combat% in [51]–[65]; `reservedPulls()` at [55]; ownership of X-Ray / Shattering Punch / Sheriff kit.
- D: "Ators Gonna Ate" trigger (combat rate 100 in combats.txt, so ±combat may be irrelevant); `reservedPulls()` at [76].
- E: scale-mail underwear pull legality in-path; bat-wings proc rate; whether `recover()` knows the free bat-wings rest.
- F: Macrometeorite castability today; why no free kill fired on the corral-opener copy; per-source Mom-progress values.

## Working with the gold guard

`src/lib/gold.ts` aborts on the first _paid_ turn a quest group spends past the gold
checkpoint + `goldSlack` (default 3). Replayed against the last three logs it stops at turn
19–20 (Outpost Stashbox / Corral Leather / Tame Seahorse). So the fix order that actually
moves the guard forward is **enablers first**, in route order:

1. #5 habitat recall off-by-one, #4(i) backup only into free targets, #4(ii) corral opener McTwist — gets the Outpost/corral to gold's 15/16.
2. #6 seahorse banishes + ink bladder, #7 PYEC order + rift item familiar, #9 reservations — clears phase B at 0.
3. #1 hallpass whistle/pull + Gaze, #3 shadow bricks — School to ~4.
4. #2 gym banish budget (verify the kick fix live), #4(iii) VHS on Habitats, #8 Mom finish.

Each abort: read the printed accounting table, then diff that phase in the gold log
(`BRIEF.md` line index) before touching code.

## Changes landed 2026-08-31 (uncommitted on `phase4_fixes`, deployed)

- `src/lib/gold.ts` + `engine.ts` + `args.ts` — gold guard and per-group accounting (see above).
- `src/resources/banish.ts` — dropped the path-only System Sweep / Banishing Shout; Spring Kick now
  kick → Spring Away (`macro` override); paid kill-banishes (`paid: true`) moved to a documented tail:
  Sea \*dent, **Heartstone: GONE** (new; 5/day, castable underwater per user), Monkey Slap, Batter Up;
  `banishChainMacro()` chains every castable source (root cause of B F1's single-source compile).
- `src/engine/engine.ts` — the `banish` action now emits the whole chain (paid tail included) instead of
  one pick, for every task.
- `src/resources/freerun.ts` — `freeRunChainMacro()` (every castable run rung, ladder order).
- `src/tasks/monkees/corral.ts` — Tame Seahorse is the ash taming regime (CCS:792-859): Tear Away on
  plants → banish only while another draw is still unbanished (`drawBanishable`) → waffle (tamer inline)
  → banish block again for the re-roll → plain free runs → kill. No `.banish` action; outfit asks for
  the top source's gear itself; `assertBanishHeld` judges only the draws the previous compile armed.
- Wiki Banishing-table reconciliation (user-confirmed facts): Pantsgiving and stinky cheese not owned;
  Baseball Diamond owned but not scriptable/feasible in-run; familiar scrapbook owned but uncharged.

Not yet touched from the ranked list: #1 hallpass supply, #3 shadow bricks, #4 backup-camera policy,
#5 habitat recall off-by-one, #7 rift scales/PYEC order, #8 Mom finish, #9 pull reservations.

## Changes landed 2026-08-31 (second batch, commits bd30072..HEAD on `gold-guard`)

After the 08-31 live run aborted on GOLD DEVIATION at turncount 27 (Corral Leather; the F4
opener defect replayed verbatim), the remaining ranked fixes landed:

- **#5** `outpost.ts` — recall test `<= 1` (mafia decrements at encounter); backup suppressed on
  the recall fight.
- **#4(i)** `backup.ts` — `backupTarget()` refuses non-free copies unless the task passes
  `allowPaid`; healer dropped from `farmBackup`; the false "refunds its adventure" doc fixed.
- **#4(ii)/F4** `corral.ts` — opener starting macro runs `BCZ: Refracted Gaze` (affordability-
  gated) + `Do an epic McTwist!` on whatever the Back-Up produced; BCZ gem in the opener outfit;
  `saber.ts seaCowNeeded()` releases on `seahorseName`.
- **A F3 / #2** `outpost.ts` — Stashbox `.kill(healer)` (engine upgrades to a free kill) +
  crystal ball avoided; `grandpa.ts` — Trench `freeRunBanishes` gated on the bowling ball being
  in hand (engine/task.ts now undelay the flag); `gym.ts` — Sheriff set worn while Assert
  charges remain (D F4).
- **#7** `runplans.ts` — dailies ahead of the rift; `daily.ts` PYEC gated on Shadow Affinity
  being up (missed-window fallback keeps it from stalling); `engine.ts`+`outfit.ts` — default
  item familiar (`chooseItemFamiliar()`, Jill first) on +item tasks that leave the slot open.
- **#3** `shadow.ts` — slab yoink macro (Septapus charm / Swoop / Mild Evil / Douse Foe ×
  remaining) with FLUDA/cloake/bat wings in the rift outfit + `batWings: true`; `init.ts` censer
  task buys up to 3 Septapus charms; `freekill.ts` shadow bricks refuse the Coral Corral
  (`avoidAt`).
- **#1** `engine.ts` whistle list includes the hallpass while a cowl/rope slot is open (scholar
  pieces count); `pulls.ts` hallpass self-reservation; `school.ts` unconditional prepare pull,
  pure `-combat` Cowl and Rope with `backup:{targets:"free"}`, `schoolLootMacro()` (Some Fish →
  Refracted Gaze, fish-table yield still UNVERIFIED) with Monodent+BCZ pinned on all three
  school outfits.
- **#4(iv)/F#7** `outfit.ts kramcoIfDue()` — Kramco off-hand on the library/school/rift +item
  farms when the goblin is guaranteed.
- **#8** `mom.ts` — Abyss Habitats gets `peridot: abyssPeridot`, the VHS window and the shark
  jumper; Cyber Mom gets the VHS window. (Banish Constructs was already gated; scale-mail pull
  SKIPPED — legality unverified.)
- **#9** `init.ts` — sea-lasso pull dropped (stale rationale), FLUDA added to the discretionary
  gear pulls; `pulls.ts` — digpick reservation (mirrors mine.ts `oreSecured()`).

Still open, deliberately: Macrometeorite school re-rolls (#10, unverified share), X-Ray ladder
reorder (#10), SCUBA pull review (B F3).

## Changes landed 2026-09-01 (pull legality)

The user supplied `docs/unpullable-items.txt` — the in-path Hagnk's blacklist (24 items: both fish
scales, both diving helmets, teflon ore/fins, sea leather/cowboy hat/chaps, every Mer-kin mask,
tailpiece, headguard, waistrope, facecowl, thighguard, dodgeball, dragnet, switchblade, the bunwig
and the unblemished pearl). Consequences:

- **#8 scale-mail underwear is legal** (absent from the list) — E F1's parked proposal landed:
  `mom.ts scaleMailPrep()` pulls it in the Abyss Finish prepare when Jelly Combed is down and none
  is owned, restoring +3/kill (6 fights instead of 9). It is a breather itself, so `abyssOutfit`'s
  pants slot loses nothing; init.ts still skips it at setup because the Kramco opts this account
  into the trunks.
- **`pulls.ts` now gates on the list** (`pullable()`, enforced in both `pullSequence()` and
  `pullBudgetAllows()`): an illegal pull used to mall-BUY the item into storage and then fail
  `takeStorage`.
- **The sea cowbell reservation is gone** (kept on the blacklist per the user's 2026-08-29 live
  finding, which the wiki table omits): its `needed()` could never be satisfied by a pull, so it
  held a pull slot for most of the run — a direct contributor to #9's "5 reservations idle, 16
  pulls used". The two dead `pullSequence(cowbell)` calls in `corral.ts` (Corral Leather, Tame
  Seahorse prepare) are deleted; cows and paw wishes remain the only cowbell sources.
- Every other pull site was audited against the list and is legal (rusty rivet, damp old wallet,
  11-leaf clover, GAP, hidepaint, prayerbeads, pinkslip, ink bladder, comb jelly, sea lasso,
  digpick, hallpass, skate blade, knucklebone, worktea, cheatsheet, antidote, healscroll,
  lodestone, sneakmask, shark jumper, SCUBA tank, FLUDA, the fishy ladder, Shub's three).

Tier question closed: the account has been running **mid** tier; the 08-27 `garbo_valueOfFreeFight`
flip is not in force.
