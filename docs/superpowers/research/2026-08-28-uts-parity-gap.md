# UTS parity gap — step-by-step run plan diff (2026-08-28)

Baseline: **UnderTheSea 08-21** (the user's best run: 41 paid turns, zero interventions,
`chartreusenator_20260821.txt` lines 104897–114996). Comparison: **subaqua 08-28** (136 paid
turns, 6 restarts, mid tier, worktree HEAD edfb5ea as deployed at the time of the run;
`chartreusenator_20260828.txt` lines 80870–100182). Same account, same class (Pastamancer),
same IOTMs, both mid tier.

Appendices (in `2026-08-28-parity/`): **A** the ash's mid-tier run plan, 58 steps, from the
deployed `UnderTheSea*.ash`; **B** the UTS 08-21 turn-by-turn trace (174 rows); **C** subaqua's
mid-tier plan, 82 tasks, from the worktree source; **D** the subaqua 08-28 trace (231 rows).

## 1. Phase-by-phase paid turns

| Phase                         | UTS 08-21 | subaqua 08-28 |       Δ | Cause (details in §2)                                                                                        |
| ----------------------------- | --------: | ------------: | ------: | ------------------------------------------------------------------------------------------------------------ |
| Guild unlock                  |         5 |             2 |      −3 | NC luck                                                                                                      |
| Flytrap pellet                |         0 |             0 |       0 |                                                                                                              |
| Wreck rescue                  |         1 |             1 |       0 |                                                                                                              |
| Grandpa                       |         3 |             5 |      +2 | task free-runs never spend banishers (G7); curveball burned on a free hipster fight (G6)                     |
| Golem recall                  |         0 |             0 |       0 |                                                                                                              |
| Outpost (grandma → stashbox)  |         6 |            11 |      +5 | free-kill charges spent on free habitat golems (G6); boots stomp + paid healer kill in the −combat walk (G7) |
| Prayerbeads / helmet / corral |         0 |             0 |       0 |                                                                                                              |
| Mom (bakery + abyss)          |         0 |            11 |     +11 | Abyss ground to 40 (fixed F4); Bakery turn ×2 (G8); Peanut AYA miss (G10); a lost fight                      |
| Corral opener + leather       |         0 |             1 |      +1 | opener backup-camera copy (fixed F3)                                                                         |
| Lasso training                |         0 |            12 |     +12 | shadow-rift lane dropped (G2)                                                                                |
| Digpick                       |         0 |             1 |      +1 | task adventures after a successful pull (G9)                                                                 |
| Seahorse taming               |         0 |             2 |      +2 | no Waffle Day waffle throw (G4)                                                                              |
| Mining                        |         0 |             0 |       0 |                                                                                                              |
| Crappy disguise (scales)      |         0 |             6 |      +6 | ash gets pristine scales free via _Talk to Some Fish_ (G3)                                                   |
| Elementary School             |         4 |            41 |     +37 | seed never pinned: no bang potions (G1)                                                                      |
| Library                       |         1 |            11 |     +10 | same (G1); researcher Force (fixed F6)                                                                       |
| Dreadscroll / High Priest     |         1 |             1 |       0 |                                                                                                              |
| Skate park                    |         4 |             5 |      +1 | forcer count                                                                                                 |
| Yog-Urt                       |         1 |             1 |       0 |                                                                                                              |
| Gymnasium                     |         4 |            14 |     +10 | gym fights never ran/banished (fixed F2); NC lottery 5 vs 4                                                  |
| Colosseum                     |         7 |             9 |      +2 | bat-wings free fights burned at the corral (G5)                                                              |
| Mom finish                    |         3 |             0 |      −3 | already ground to 40                                                                                         |
| Shub                          |         1 |             1 |       0 |                                                                                                              |
| Seaceress                     |         0 |             1 |      +1 | bat wings exhausted (G5)                                                                                     |
| **Total**                     |    **41** |       **136** | **+95** |                                                                                                              |

Free-action budgets tell the same story: UTS had 90 free combats (52 of them on turn 16 alone —
rivets, cyberzone, corral, mining, lasso training, taming, dreadscroll clue, all in one turn);
subaqua had 62, with 0 backup-camera copies, 0 shadow bricks, 0 _Talk to Some Fish_.

## 2. Where the plans differ

### Fixed on the branch since the run, not yet live-verified (≈24 turns)

| #   | Commit           | What                                                                     | Turns it should recover                   |
| --- | ---------------- | ------------------------------------------------------------------------ | ----------------------------------------- |
| F1  | 9f0bb38          | seed scan triggers on the seahorse name alone                            | necessary for G1, not sufficient (see G1) |
| F2  | 32e1541          | gym fights run/banish before any damage                                  | ~9 (gym 14 → ~5)                          |
| F3  | e8b68f2          | backup camera port (outpost golem/healer, corral opener, school/library) | ~3                                        |
| F4  | edfb5ea          | Mom bar = ash `initialMomProgress`, remainder deferred to Mom Finish     | ~5 (8 paid Abyss → 3)                     |
| F5  | c30fd3b          | second habitat recall on an outpost golem                                | ~1–2                                      |
| F6  | b6ab933          | researcher Force reservation                                             | ~2–3 (library)                            |
| F7  | 64b88ac          | Banish Constructs stops re-arming                                        | 1 (the turn-120 Bakery)                   |
| F8  | 25f07ed, 31ad187 | sea lasso always pulled; library clue items whistled                     | 0–1                                       |

### New gaps (not addressed by any commit) — ranked by turns

**G1. The dreadscroll seed is never pinned because subaqua never identifies bang potions. (≈45 turns)**
Both runs tamed a seahorse named _Shimmerswim_. UTS printed `2 possible seeds right now` the
moment it was tamed (B:110900), Deep Dark Visions' clue 3 then pinned the seed, and all eight
`dreadScroll` prefs were written before the school was entered (B:111388-111394). The school
became the ash's S45 alt branch (−combat until the teacher's lounge + facecowl/waistrope: 4
turns) and the library took 1 turn. subaqua's scan found **23 candidates** for the same name
(D:96277) and only after 41 school turns, because its criteria were name + 3 clues and nothing
else.

The missing constraint is the **nine bang potions**: the ash pulls a ten-leaf clover and a large
box (A S4, UTS:592-619; B:105843-105881), crafts a blessed large box, uses it (9 bang potions),
and its CCS preamble throws every unidentified potion during the first ordinary fight
("murky potion identification, rounds<5, not cowboy", CCS:432-499; B:106073 shows all 9
`lastBangPotion819..827` set on turn 2). The seedfinder's `SeedCriteria` reads those prefs
(`SeedCriteria.ash:80-143`) and a full 9-potion string is worth far more than the seahorse name.
Our `playerCriteria()` (`lib/dreadscroll.ts:207-225`) already reads `lastBangPotion819..827` —
they are simply never populated. F1 (scan on name alone) therefore still yields ~23 candidates.

Port: (a) Init pull of ten-leaf clover + large box (2 pulls, ~2.4k meat; 15/20 pulls were used
on 08-28), craft + use the blessed large box; (b) a once-per-run combat opener that throws each
unidentified bang potion in a non-target, non-boss fight (Guild Test is where UTS did it);
(c) then `dreadSeedCheck()` on taming should pin to 1–2 candidates and `isKnucklebonesAndSushiEnough()`
routes the school to the short lane. Expected: school 41 → 4–5, library 11 → 1–2.

**G2. Shadow Rift lane dropped — lasso training costs 12 paid turns and we forgo 11 shadow bricks. (≈12 turns + 11 free kills)**
The ash trains the lasso on free Shadow Affinity fights (A S33: 7 throws → 20, B:109690-110093,
0 turns) and drains the affinity on more free fights that yield 11 shadow bricks (11 free kills —
8 of them carried the Elementary School), a map to a candy-rich block, Fishy(1) per fight, and
the Rufus rewards. subaqua trains on paid corral fights (D turns 31–42: 12 turns for 7 throws,
plus 2 taming turns) and had zero shadow bricks all run. The Phase 4 plan dropped the rift
"with pricing"; on this evidence the pricing was wrong by an order of magnitude. Port A S29/S33/S38
(`shadowRift()` UTS:847-898, choice 1500, CCS:532-554 lasso-after-wave + slab handling).

**G3. _Talk to Some Fish_ (Sea \*dent) — pristine scales are free in the ash. (6 turns)**
UTS never spent a turn on scales: it converts non-target monsters into _some fish_ (guild ×3,
outpost healers, school monitors ×11 …) and had 6 pristine scales banked by the time it crafted
the crappy mask and tailpiece on turn 16 (B:111236-111250). subaqua spent 4 Lucky! trips
(Aug 2nd + 3 hermit clovers) and 3 Madness Reef turns (D turns 46–52). Drops of the original
monster still land (B:111402: monitor → fish → cheatsheet, hallpasses). Port the CCS sites
(A §1 free-kill notes; CCS:505-521, 660-729, 948-1006) and drop Crappy Mask/Tailpiece to a
fallback.

**G4. Waffle Day (Aug 24th) — the waffle throw summons the seahorse. (2 turns)**
UTS casts _Aug. 24th: Waffle Day!_ at init (A S2) and throws waffles at corral non-targets
(B:110576-110869: rustler → waffle → cowboy, cowboy → waffle → wild seahorse, tamed on the same
free visit). subaqua has no waffle source (`waffle` appears only in `sim.ts`) and waited for a
natural spawn (D turns 44–46, 2 paid turns, a plain paid runaway at turn 35). The plan dropped
Waffle Day as a "daily"; it is the seahorse summon.

**G5. Bat wings worn outside their sites — free fights burned on tumbleweeds. (3 turns)**
Tame Seahorse's `initiative` maximize picked bat wings, and 4 of the 5 free fights went to
tumbleweeds and a cowboy (D:87666-88034). The ash pins bat wings only in the rift, Yog-Urt,
colosseum and the Seaceress (A S33/S50/S54/S57) — UTS took 3 free colosseum rounds and a free
Seaceress. Fix: `-equip bat wings` everywhere except `yogurt.ts`, `colosseum.ts`, `finale.ts`.

**G6. Free-kill and banish charges spent on fights that are already free. (≈3 turns + starved school)**
Chest X-Ray #3 and Sweat Bullets ×4 went to habitat-copy golems (D:82737-83154) and the cosmic
bowling ball to a hipster _Black Crayon Slime_ at the Garden (D:82169). The ash kills habitat
golems with darts/Saucegeyser and never `free_kill`s them (CCS:660-729). Result: all 11 Sweat
Bullets + 3 Punches + Mob Hit were gone by turn 13, two healers were paid kills (D:83465,
83611), and the school had no free kills left. Rule to add to `freeKillTargetDropsMatter` /
the banish pick: skip when the fight is free (habitat monster with fights left, Back-Up copy,
hipster/Kramco wanderer, Cyberzone).

**G7. Task free-runs never use banishing rungs. (≈3 turns)**
`engine.ts:344-456` always calls `selectFreeRun({banish:false})`, so Spring Kick, curveball,
latte, Feel Hatred, Snokebomb are skipped in Grandpa / Stashbox / Wreck / Prayerbeads walks
(C §1.3). The ash's handlers there call `free_run(banish=true)` (A S12/S14/S17, CCS:74-107):
UTS curveballed the diving belle and Feel-Hatred'd a burglar; subaqua paid for the belle, a
diver (D turns 4–5) and a stashbox healer (turn 18) while Feel Hatred #3 and Snokebomb went
unused all run. Pass `banish:true` in those tasks (gym already does).

**G8. Constructs are banished on a free golem, not at the Bakery. (1–2 turns)**
UTS screeched on a habitat golem at the Outpost (B:107639, 0 turns). subaqua paid a Madness
Bakery turn (D:84347) and a second at turn 120 (F7 should stop the re-arm). Port the CCS golem
handler's screech (CCS:669-675) and make the Bakery the fallback.

**G9. Teflon/Digpick adventures after its pull succeeds. (1 turn)** D:87539 pull, D:87544
paid Anemone Mine fight that dropped a second digpick. Re-check `have(digpick)` after the
prepare pull.

**G10. Assert Your Authority on Peanut did not end the fight. (1 turn)** D:84421 — cast
succeeded, 10 rounds, turn paid. Investigate before relying on AYA in the Abyss; the ash's
Abyss handler waffles Peanut and otherwise `cleanUp`s (A S52).

### Reliability (0 turns, but UTS had zero interventions vs our 6 restarts)

Peridot choice 1557 submitted 4,167 times with a stale target (D anomaly 1; 5c0b67c is the
candidate fix), Cyberzone macro abort (bccb7d6), Economist-of-Scales and Picking-Sides exits
mid-choice (4c51dc6, 85bdb73), two **unexplained silent exits** (D:87512 Digpick after buying
rice; D:87820 Tame Seahorse after "Maximize: initiative"), a Farm School prelude stall with
stack traces (D:94049-94157), the colosseum round that dumped all 16 heal consumables on one
lost-initiative fight (D:99102-99224), and 25 dolphin thefts with no whistle.

## 3. What to do

1. **G1 first** — it is half the gap and a small port (2 pulls + one potion-ID opener).
   Verify with: `2 possible seeds`-equivalent print on taming, `dreadScroll1..8` written before
   the school, School Unlocks taking the short lane.
2. **G2 shadow rift** — needs the user to reverse the Phase 4 DROP; it is the second-largest
   item and also the source of the school's free kills.
3. G3–G5 (scales, waffle, bat wings) are small ports worth 11 turns together.
4. G6–G10 are engine rules worth ~9 turns.
5. Live-verify F1–F8 on the next run before pricing anything else.

With F1–F8 verified and G1–G10 ported, every phase in §1 lands on the UTS number or within RNG
of it; the plan diff shows no remaining structural difference at mid tier.
