# 2026-08-31 run (84t) vs gold UTS 2026-08-21 (41t)

Sources: `docs/2026-08-31-run.txt` (13,684 lines, mixed build — see caveat), `docs/gold-star-run.txt` (9,964).

## Caveat: the log spans a redeploy

The Corral Opener at turn 22 emitted
`if monsterid 775;if !pastround 3;if hasskill 7447;skill 7447;endif;endif;endif`
— McTwist still scoped to the sea cow, i.e. the **pre-0614a36 build**. Later invocations
(Shadow Rift macros, line 8972) carry skill 7572, so the F4 fix landed mid-log. The corral
opener never re-ran, so its damage is old-build damage. Everything else below is live on HEAD.

## Turn ledger (from the run's own accounting tables)

| group            | done@ | gold@ | Δ   | Δ in group |
| ---------------- | ----- | ----- | --- | ---------- |
| Openers → Helmet | 16    | 16    | +0  | **parity** |
| Mom              | 21    | 16    | +5  | **+5**     |
| Corral           | 46    | 16    | +30 | **+25**    |
| School           | 54    | 20    | +34 | +4         |
| Library          | 56    | 21    | +35 | +1         |
| Yog-Urt          | 57    | 22    | +35 | +0         |
| Gladiator Gear   | 71    | 30    | +41 | **+6**     |
| Skate Park       | 72    | 30    | +42 | +1         |
| Colosseum        | 80    | 37    | +43 | +1         |
| Mom Finish       | 82    | 40    | +42 | −1         |
| Shub / Finale    | 84    | 42    | +42 | 0          |

Zone visits: Coral Corral **35 vs 6**; gym 10 vs 8; school 4 vs 16; colosseum 18 vs 17.
Combats 403 vs 305; free 102 vs 101.

## Root cause: one budgeting failure, four ladders

Gold and SubAqua spend the _same_ daily charges. Gold spends them where a charge buys a turn;
SubAqua spends them in the first 13 turns on zones that were already cheap, then meets the
expensive zones with an empty ladder.

### Free kills (11 BCZ Sweat Bullets + X-Ray + Punch + Authority + darts + parka)

|                                 | gold       | 08-31        |
| ------------------------------- | ---------- | ------------ |
| Sweat Bullets before the corral | 9 (2 held) | **11 (all)** |
| Chest X-Ray final               | 1          | 3            |
| Assert your Authority final     | 0          | 3            |

At turn 22 (corral opener) the 08-31 ladder was **completely dry**: X-Ray 3/3, Punch 3/3,
Authority 3/3, Gingerbread used, Sweat Bullets 11/11, Everything Looks Red _and_ Yellow up.
Gold reserved Sweat Bullets #10 for the corral opener and #11 for the school.

### Banishes

| spent at                  | gold  | 08-31 |
| ------------------------- | ----- | ----- |
| Octopus's Garden (turn 3) | 0     | 4     |
| Marinara Trench           | 0     | 2     |
| Outpost                   | 1     | 2     |
| **Gymnasium**             | **3** | **0** |

Gold spends 5 banishes all day, 3 of them at the gym where each one skips a paid guard fight.

### Bowl a Curveball

Gold curveballs the **sea cow** at the corral (banks free sea-cow wins) and a juicer at the gym.
08-31 curveballs the **Mer-kin rustler** three times — a monster it never wants to refight.

### Shadow bricks (11)

Gold: 8 at the **school** (turn 17). 08-31: all 11 at the Caliginous Abyss on turns 81–82 —
fights that were **already free**. Pure waste.

## The corral: what gold actually does (0 paid turns, 6 visits)

1. Pre-seed `lastCopyableMonster` with **eye in the darkness** (Caliginous Abyss).
2. Maximize item to **1252%** (Heartstone Best Pals, mini crystal ball, squint).
3. One corral encounter (sea cowboy): `Become a Bat → Back-Up to your Last Enemy →
BCZ: Refracted Gaze → Do an Epic McTwist! → BCZ: Sweat Bullets` (free kill).
   Result, one fight, **zero turns**: 2× sea cowbell, 2× sea leather, 2× sea lasso,
   2× deep six-shooter, plus the rustler's drops.
4. Smith chaps + hat immediately.
5. **`pull: 1 sea cowbell`** (item 4196 — the pull _succeeds_, see contradiction below).
6. **Lasso training in the Shadow Rift**: 7 free shadow guy/tree/slab fights, `use sea lasso`
   round 1, lassos come back. Zero paid turns.
7. Peridot-force a sea cow, **Bowl a Curveball** on it → free, banks more free sea-cow wins.

08-31 instead: backup fired on the sea cow and produced a **slithering thing** (stale
`lastCopyableMonster`, clobbered by the last Mom/Abyss fight at turn 21); no free kill left,
so the copy was killed with Micrometeorite → Curse → Saucegeyser → 7× attack. One paid turn,
zero corral drops. Then:

- no lassos → the **16 free Shadow Rift fights at turn 32–33 trained ZERO**;
- all 13 lasso throws happened on **paid corral turns** (24, 29, 35, 37, 38, 39, 41, 43, 44,
  46, 47, 48) — 12 paid turns gold spent for free;
- `Do an Epic McTwist!` was **never cast in the entire run**;
- `BCZ: Refracted Gaze` cast **once** (gold: 12).

## The gym: gold banishes, we kill

Gold's 8 gym visits cost 3 turns because 5 combats were banished/run
(Curveball, Throw Latte, Feel Hatred, Snokebomb) and only the "Ators Gonna Ate" NCs paid.
08-31 fought all 7 guards to the death — the ladder was dry (Snokebomb 3/3, Feel Hatred 3/3,
Latte used) before the gym was reached. `gym.ts:209` already documents that every gym combat
_should_ be a free run.

## The early Abyss: 5 turns gold doesn't spend

08-31 runs Mom/Abyss Habitats at turns 17–21 (8 fights, ~4 paid).
Gold visits the abyss **twice** before turn 24 and reaches `momSeaMonkeeProgress` 40 off
ordinary sea combats, finishing the rescue at turn 40. Both runs end at progress 40.

## Contradiction with memory

`cowbells-not-pullable` says sea cowbell is an illegal in-path pull. The gold log pulls one
(`pull: 1 sea cowbell`, `_roninStoragePulls` gains 4196, gold-star-run.txt:5381) and it works.
Worth re-checking before `pulls.ts` keeps refusing it.

## Ranked fixes

1. **Reserve one free kill for the Corral Opener** (and one for the school). Nothing else can
   make the opener free. ~ the whole +25.
2. **Do not arm the corral backup unless a free kill is in hand** and `lastCopyableMonster`
   is an Abyss monster — otherwise take the ordinary corral fight.
3. **Seed `lastCopyableMonster`** deliberately before the corral (one free Abyss fight), rather
   than inheriting whatever the previous phase left.
4. **Order the Shadow Rift lasso training after the corral opener** so there is a lasso to throw
   — and never let the corral pay for training turns.
5. **Reserve 3 banishes for the Mer-kin Gymnasium**; stop banishing in the Octopus's Garden.
6. **Curveball the sea cow, never the rustler.**
7. **Spend shadow bricks at the school**, never on already-free Abyss fights.
8. **Defer Mom/Abyss Habitats** until the rescue actually needs it (gold: turn 40).

---

# Run-order diff (added 2026-09-01)

Gold's phase order (`> UTS: phase:` markers) vs ours (`> Executing <Group>/`):

| gold                                 | turn      | 08-31                       | turn   |
| ------------------------------------ | --------- | --------------------------- | ------ |
| Mer-kin Outpost                      | 10–15     | Outpost                     | 9–16   |
| **Calling Rufus / rift prep**        | **15–16** | Helmet/Mom                  | 17–21  |
| Mom rescue (habitats/cyberzone)      | 16        | Corral grind                | 22–32  |
| corral (leather/cowbell)             | 16        | **Shadow Rift**             | **33** |
| teflon ore (mine)                    | 16        | Corral grind                | 33–45  |
| lasso training (**in the rift**)     | 16        | Teflon                      | 45     |
| seahorse taming                      | 16        | School                      | 46–54  |
| school (under "Yog-Urt preparation") | 16–17     | Library                     | 54–56  |
| library / High Priest                | 19–20     | Yog-Urt                     | 56–57  |
| skate park (block)                   | 22–26     | **gym ↔ park ping-pong ×8** | 57–72  |
| gymnasium (block)                    | 27–30     | Colosseum                   | 72–80  |
| colosseum                            | 30–37     | Mom Finish                  | 81–82  |

## The one real ordering bug: the rift was chained to the corral

`shadow.ts`'s `Rufus Quest.ready` required `trainingGearReady()` — sea cowboy hat AND sea chaps.
Both come out of the corral. So the phone call could not happen until the corral had produced
leather, which (with the opener broken) took until turn 32. Gold calls Rufus at **turn 15**,
before it owns any corral gear at all; its chaps are smithed at turn 16.

Consequence chain, all measured: rift opens at 33 → the 16 free rift fights arrive before any
lasso exists and **train zero** → all 13 lasso throws land on paid corral turns
(24, 29, 35, 37, 38, 39, 41, 43, 44, 46, 47, 48) → the mine (which follows the corral in the
plan) slips from turn 16 to turn 45.

The hat/chaps are the _lasso throw's_ requirement, not the phone call's. `Rift Fights` keeps
the gate; `Rufus Quest` no longer has it.

## Gym ↔ skate park ping-pong

Gold runs the park as one block (22–26, 6 visits, 4 turns) and the gym as one block
(27–30, 8 visits, 4 turns, 5 of them banished free). We alternated eight times over 15 turns.
The alternation itself is the ash's design (`runplans.ts` gearQuest-before-skateParkQuest: the
gym banks the NC forcer, the park spends it) and is _free_ when the gym fights are free — which
is the banish reservation's job, not an ordering change.

---

# What landed 2026-09-01 (branch `gold-guard`)

1. **`src/resources/reservation.ts`** (new) — `ChargeReservation` + `reservedElsewhere()`, the
   shared shape for holding daily charges for the site that needs them. Modelled on
   `pulls.ts`'s `PullReservation`; `needed()` is live, so an idle reservation holds nothing.
2. **Free-kill budget** (`freekill.ts`) — reservations for the **Corral Opener** (1) and the
   **school hallpass chain** (1, and only once the corral opener has had its charge, so the
   later site can never starve the earlier one). `selectFreeKill()` refuses a spend that would
   eat a held charge. The zone/mode filters are factored into `usableFreeKill()` so the budget
   counts the pool the _holder_ could actually spend, not every charge on the ladder.
3. **Banish budget** (`banish.ts`) — 3 charges reserved for the **Mer-kin Gymnasium** while
   either gladiator piece is missing. `BanishSource` gained `remaining()`; `pickBanishSource`,
   `banishChainMacro` and `selectFreeRun`'s banishing rungs all answer to it (they draw on the
   same daily charges). `assertBanishHeld` stands down when the budget withheld the banish —
   a deliberate skip is not a misfire.
4. **Rufus ungated** (`shadow.ts`) — `Rufus Quest` no longer waits on corral gear.
5. **Sea cowbell pull** — removed from `unpullableInPath`, given a pull reservation, and a
   `Pull Cowbell` freeaction task ahead of `Tame Seahorse` (gold: `pull: 1 sea cowbell`,
   G:5381).
6. **Stomping Boots: the skill is a NO-PORT, the `runaway` is restored** (`freerun.ts`,
   `engine.ts`, `fights.ts`, `gym.ts`). `Release the Boots` is a turn-taking instakill (user
   correction). The ash casts it (`UnderTheSeaCCS.ash:82`) and that is the ash's bug: libram's
   own free-run ladder (`actions/FreeRun.ts`, behind `tryFindFreeRun`/`ensureFreeRun`) gives
   the boots as `Macro.step("runaway")` gated on `StompingBoots.getRemainingRunaways()`, and
   never lists the skill. Live 08-31 the gym released the boots twice ([58] poseur, [67]
   juicer): both stomped "into paste", both advanced the turncount (58→59, 67→68), and
   `_banderRunaways` stayed 0. **Neither run has ever spent a boots runaway** — gold fielded
   30 lb boots at its gymnasium (6 charges) and never went restless, so the ash's skill never
   fired. Restored as "Stomping Boots runaway", `new Macro().runaway()` per loopstar
   (`resources/runaway.ts:139`), counting delegated to libram's `StompingBoots`, placed AFTER
   the geared banish rungs so the gymnasium reservation still gets spent there.
7. **The 2026-08-27 free-run familiar rule is retired** (`engine.ts`). It evicted
   `sneakFamiliar()` for the boots on a "~24 runaways" premise; the real number at this route's
   weights is 5-6. One unrestricted walk now; the boots take the familiar slot only where it is
   already free (grimoire's `equipFamiliar` refuses to overwrite a set familiar).

`yarn lint` and `yarn build` clean.

# Still open

- **`lastCopyableMonster` is not seeded before the corral.** Gold arranges an Abyss monster
  (eye in the darkness) as the last copyable so the opener's back-up lands on a monster it
  wants; ours inherited whatever the previous phase left (a slithering thing, by luck also on
  the target list). Worth making deliberate.
- **The Abyss peridot never fired early.** `Mom/Abyss Habitats` ran turns 18–21 (8 fights,
  ~4 paid) with `Maximizer: … -"equip Peridot of Peril"` every time — the else-branch of
  `engine.ts`'s peridot block, i.e. `peridotTargetOffered(abyss, eye in the darkness)` read
  false. It read true at turn 81 (`_perilLocations` gains 337). Gold forced its eye on its
  second Abyss adventure (G:3676). ~+4 turns.
- **Shadow bricks.** All 11 went to Caliginous Abyss fights on turns 81–82 that were already
  free. Gold threw 8 at the school on turn 17.
- **Curveball target.** Gold curveballs the **sea cow** at the corral (banking free sea-cow
  wins); we curveballed the **Mer-kin rustler** three times.
- **Familiar-weight planning for the boots.** loopstar's `planRunawayFamiliar()` sets
  `goalWeight = 5 * (1 + _banderRunaways)` and gears the familiar up to the next 5 lb
  threshold, so a runaway is available whenever the GEAR can reach one. Our
  `bootsRunawaysLeft()` only reads the weight currently worn.
- **`Do an Epic McTwist!` was never cast in the whole 08-31 run**, and `BCZ: Refracted Gaze`
  once (gold: 12). Both should follow from the fixed opener, but neither is verified live.
