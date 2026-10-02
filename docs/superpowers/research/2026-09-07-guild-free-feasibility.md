# Can a guild-free (no-brick) run work? Free-kill budget, gold vs 2026-09-07

Question (user, 2026-09-07): after today's bugs are fixed, would `guild=false` ever work,
mostly work, or always work?

Method: every free-kill and free-run cast in `docs/gold-star-run.txt` (36 turns, guild on,
0 bricks thrown) and `docs/2026-09-07-run.txt` (60 turns, guild off until the t38 restart),
tagged with the `[N] zone` marker and encounter it landed on; daily counters read from the
last `Preference ... changed` line of each log.

## What the guild lane buys

The Guild Finish visit starts the Ego quest, which opens the Misspelled Cemetary, the only
slab rift the path reaches. Its slabs drop 13 shadow bricks = 13 drop-safe free kills usable
anywhere but the Corral and Colosseum (`freekill.ts`). The rift is already run for Rufus and
lasso training, so the bricks cost 0 extra turns; the lane's price is the pantry NC (1 turn,
2 when the pantry rolls the wrong NC first, as in both logged runs). Magical mystery juice is
the other thing the guild sold; Rest upside down replaced it today (11 rests lasted to ~t38,
tonics bought at the Seaceress), so MP is not the constraint.

## Free-kill supply on this account, without bricks

| source                 | casts | where usable                      |
| ---------------------- | ----- | --------------------------------- |
| Darts: Bullseye        | 1     | anywhere (Red lasts 50 turns)     |
| Spit jurassic acid     | 1     | anywhere (the run's one YR)       |
| Chest X-Ray            | 3     | anywhere                          |
| Shattering Punch       | 3     | anywhere                          |
| Gingerbread Mob Hit    | 1     | anywhere                          |
| BCZ: Sweat Bullets     | 11–12 | anywhere (substat cost curve)     |
| **drop-safe subtotal** | 20–21 |                                   |
| Assert your Authority  | 3     | Garden, Gym, Abyss; not drop-safe |
| **total**              | 23–24 |                                   |
| Club 'Em Back in Time  | 5     | Colosseum only (separate pool)    |
| shadow brick (guild)   | +13   | not Corral / Colosseum            |

## Demand, gold vs today

| sink                       | gold | today | why today differed                                                                                              |
| -------------------------- | ---- | ----- | --------------------------------------------------------------------------------------------------------------- |
| Garden (flytrap)           | 2    | 2     |                                                                                                                 |
| Trench (helmet divers)     | 2    | 5     | 3 X-Rays on Mer-kin divers; gold got its divers through the saber Force at t14                                  |
| Outpost healers (lockkey)  | 9    | 14    | only 5 golem habitat fights landed in the Outpost vs 10; the second recall's golems wandered into Corral/School |
| Abyss opener (habitat eye) | 1    | 0     | never ran (see cyber gate below)                                                                                |
| Corral / School            | 2    | 1     |                                                                                                                 |
| Gym                        | 0    | 4     | free-run ladder dry after 13 gym fights; Authority ×3 + Mob Hit spent, then 5 paid kills at +combat             |
| **spent before the Abyss** | 16   | 26    | today's pool was empty at t23                                                                                   |
| Abyss finish               | 5    | 0     | gold: 5 free kills + Peanut + NC = 2 paid turns; today: 17 paid kills + NC = 18 paid turns                      |
| **total**                  | 21   | 26    | gold left Authority 3 + bricks 13 unspent                                                                       |

Gold used the whole drop-safe pool exactly and left 3 Authority casts: **slack without
bricks = 3 kills**, on the run where every lane landed.

## Why the Abyss needed 19 kills today instead of 7

1. **Cyber lane never ran** (bug, guild-independent). `Abyss Habitats` needs
   `_monsterHabitatsFightsLeft === 0`; the second golem recall (t9) still had 2 fights left at
   the Colosseum because the lockkey dropped at t9 and the leftover golems wandered elsewhere.
   `Abyss Mom`'s fallback gate (`cyberLaneStuck`) only opens when the habitat is undrawable or
   10 cyber fights are used, so neither Mom task was ever ready. Gold banked 18 progress free
   (1 Abyss eye + 5 Cyberzone eyes) at t14; today started the finish at 0.
2. **No comb jelly** (pull budget, guild-independent). Gold pulled it at t14 (Jelly Combed 20,
   +5 from PYEC) and its Abyss kills scored +3; today's 20 pulls went to the glitch, lodestone
   and null-day exploit instead, `combJellyPrep` found no budget, and every kill scored +2.
   Confirmed by the wiki (The Caliginous Abyss): each Abyss combat earns 1 progress, +1 each
   for the shark jumper, the comb jelly (Jelly Combed) and scale-mail underwear. Gold ran at +3
   (jumper + jelly), today at +2 (jumper only); neither run wore the underwear, which the Sea
   Gear Pulls task skips whenever a Kramco is owned, so the +4 rate (10 combats) was never used.
3. **Pool already empty** (variance + gym bug). Outpost +5, Trench +3, gym +4 over gold.

With bricks held, the engine's free-kill rung would have taken 13 of those 17 paid Abyss
kills, and `peanutRerollPays()` would have fired the Macrometeorite/waffle re-roll on Peanut.

## Verdict

- **Ever work?** Yes: the gold run is the proof. It threw no bricks and finished in 36 with
  the guild's 2 turns included, i.e. 34 without them. It needed the cyber lane, the comb jelly
  slot, 10 in-zone golems and a 5-adventure gym to do it, and still ended with 3 spare kills.
- **Always work?** No. The no-brick slack is 3 kills. Independent swings seen across the
  logged runs: Outpost golem placement 0–5, gym roll 0–4, Trench divers 0–3, Peanut re-roll
  1. Their sum exceeds 3 on most days even with every bug fixed, and the shortfall lands in
     the Abyss, the last sink, at one paid turn per missing kill (1.5 without Jelly Combed).
- **Mostly work?** Only after three fixes that cut demand: (a) open the Abyss Mom gate when
  the leftover habitat is a golem with ≤2 fights, or drain it, so the 18 free progress is
  never skipped; (b) reserve a pull slot for the comb jelly (worth ~6 kills, more than any
  of the three pulls that displaced it); (c) flip the gym to -combat once the free-run ladder
  is dry. Even then, typical demand ≈ 21–24 against a supply of 23–24: a coin flip per run
  on paying 1–5 Abyss turns, with a tail of ~10.

Net-turn pricing: the guild costs 1–2 turns with certainty and removes a 0–13 turn tail that
fired at 16 today. Keep `guild=true` as the mid-tier default. Revisit `guild=false` only after
(a)–(c) land and a run shows the Abyss finishing on free kills with bricks still unthrown.
