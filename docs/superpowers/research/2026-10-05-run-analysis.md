# Run analysis: 2026-10-05 (45 turns) vs gold SubAqua 2026-09-06 (36)

Log: `docs/superpowers/research/runs/subaqua-2026-10-05.log` (10,365 lines). Line numbers `:NNNN`
are into that file; `gold:` refers to `docs/gold-star-run.txt`. No abort; the run finished on
its own. Ledger (end of log): +9 at Finale, −2 through Teflon.

## 1. Per phase, paid turns

| phase                 | gold | today | Δ      | cause                                                                                   |
| --------------------- | ---- | ----- | ------ | --------------------------------------------------------------------------------------- |
| Pantry … Teflon       | 13   | 11    | −2     | Outpost closed at t11 (5 Kramco goblins advanced the lockkey counter)                   |
| School                | 3    | 4     | +1     | two dud NCs (Bored of Education `:6815`, No Rest for the Room `:6830`); dice            |
| Library + dreadscroll | 2    | 2     | 0      | same turn count, but 5 shadow bricks spent where gold spent 5 Back-Ups; §2.2            |
| Yog-Urt               | 0    | 1     | +1     | gold's Yog turn was a bat wings refund (`gold` "This combat did not cost a turn"); dice |
| Gymnasium + Skate     | 7    | 12    | **+5** | 4 locker NCs vs 2 (dice, +2), 3 paid mer-kin kills vs 0 (free-run supply, +3); §2.1     |
| Colosseum             | 7    | 7     | 0      |                                                                                         |
| Mom Finish            | 2    | 5     | **+3** | 4 paid Abyss kills vs 1; every free kill was gone; §2.3                                 |
| Shub, Finale          | 2    | 2     | 0      |                                                                                         |
| **total**             | 36   | 45    | +9     |                                                                                         |

Dice: +4 (locker item rolls +2, Yog bat wings +1, school NCs +1). Structural: +7 (gym free-run
supply +3, Abyss free-kill supply +4, the latter fed by the gym and the library). Head start −2.

## 2. Sinks with mechanism

### 2.1 Gymnasium: 21 fights, 9 free runs, 9 free kills, 3 paid kills (`[20]`–`[31]`)

The locker NC (`Ators Gonna Ate`, choice 701) hands out one of dodgeball / dragnet / headguard /
switchblade / thighguard / fastjuice at random, never repeating a held piece
(wiki.kingdomofloathing.com/Ators_Gonna_Ate). We need headguard + thighguard. Gold drew them on
NCs 1 and 2 (`gold:[19]`, `gold:[25]`); today they came on NCs 1 and 4 (`:8062` headguard,
`:8223` switchblade, `:8390` dragnet, `:8704` thighguard). Expected max-position of two specific
items in a 5-permutation is 4, so today was average and gold was lucky. **+2 is dice.**

The NC responds to +combat (wiki: "despite being a non combat, you want to increase combat%"),
so the +combat moods are right and the 09-07 idea of flipping to −combat is withdrawn. The
Gymnasium is a 100%-combat zone with three monsters, so a banish there changes which monster
appears, never how many fights happen; banishes are only free runs. (Banishing all three nulls
every banish in the zone until one expires — wiki Banish › Notes — which is what the third
banish at `:7874` Snokebomb did, harmlessly here.)

Fight resolution today, in order: Feel Hatred ×2, Bowl a Curveball ×2, Snokebomb ×1, boots
runaway ×1, stinkbomb, ink bladder ×2 (free runs, 9); Assert Your Authority, shadow brick ×8
(free kills, 9: `:8026`–`:8417`); Saucegeyser ×3 paid (`:8453` `:8563` `:8638`).

Free runs that sat unused:

- **Snokebomb ×2.** `_snokebombUsed` ended at 1. `selectFreeRun` (freerun.ts:238) refuses
  Snokebomb while the monster it holds is in the current zone, so after the juicer took the
  bomb at `:7874` the other two charges were locked out of the gym. That guard protects a
  banish that has no value in a 100%-combat zone; the free run was worth a brick each.
- **Reflex Hammer ×3.** `_reflexHammerUsed` never changed. It is in `banishSources`
  (banish.ts:67) but not in `freeRunSources`, so no task that free-runs can pick it; the bag
  (`Lil' Doctor™ bag`) is owned (Chest X-Ray fired 3×).

Five more runs would have covered the 3 paid kills and left 2 bricks for the Abyss.

### 2.2 Library: 5 shadow bricks instead of 5 free Back-Up copies (`:6952`–`:7153`)

Every earlier run backed the library's natural draws up into Black Crayon Golem copies (09-07:
5, 09-19: 4, 09-28: 5). Today `_backUpUses` stayed at 1. `backupTarget` (backup.ts:21) only
fires when `lastCopyableMonster` is in `freeMonsters`. The trail:

- `[14]` `:6701` Club 'Em redeem golem at the Trench → lastCopyableMonster = Black Crayon Golem.
- `[14]` `:6768` school punisher: `hallpassLootWanted()` was true (the pulled hallpass went to the
  first Halls Passing at `[13]`), so the fight was looted instead of backed up. The loot macro
  opens with Sea \*dent: Talk to Some Fish → "your opponent becomes some fish" → mafia sets
  **lastCopyableMonster = some fish**, which is not a free monster.
- `[15]` `:6830` No Rest for the Room → teacher, same macro, same result.
- `[16]` library: no seed → bricks ×5 (`:6952` `:6995` `:7080` `:7115` `:7153`).

09-28 survived the same fish-talk at the school only because its Club 'Em golem landed at
`[15]`, after the school's last fight; the redemption task fires on `totalTurnsPlayed >= turn+8`
and the school draws its fights at −combat, so the order is a coin flip, not a plan.

### 2.3 Mom Finish: 4 paid kills (`:9743`–`:9985`)

Peanut (paid, as in gold) plus eye, slithering thing, eye at full price; school of many was
curveballed. Gold had Sweat Bullets ×3, Shattering Punch ×2 and Gingerbread Mob Hit for the
same stretch. Today's free kills had been spent: bricks 8 in the gym + 5 in the library,
Punch at the school/corral/garden, Mob Hit on the school teacher, Sweat Bullets 8 at the
Outpost. The Abyss is the only late zone that needs _kills_ (the Colosseum is immune), so every
brick saved upstream is a turn here. With §2.1 and §2.2 fixed the Abyss would have held
2 + 5 = 7 free kills for 4 fights.

## 3. Things checked and cleared

- Skate Park 5 turns both runs; Colosseum 7 both; Shub/Finale same.
- Late Pulls: only one slot was left at t31 and it bought an ink bladder that was never used
  (gold's ink bladder + pinkslip at t25 were also unused). The pending partial tombstone change
  on `uncommitted-catchup` puts a free kill in that slot, which is the right call for the Abyss.
- Yog-Urt: identical fight; gold's was refunded by bat wings.
- Pull budget 20/20: today's extras vs gold were scale-mail underwear (Mom speedup) and the
  lodestone (teflon mine); gold had the SCUBA tank and a pinkslip.

## 4. Fixes (BUILT 2026-10-06, branch run-1005-fixes, deployed via `yarn mafia`, not live-verified)

1. `resources/freerun.ts`: Reflex Hammer is a free-run source (bag equip, 3/day). The
   held-monster guard that only Snokebomb had now covers every banishing source except the
   curveball (mafia leaves its stale entry until the next throw); `lib/freerun-pick.ts` holds
   the pure parts, `test/freerun-pick.test.ts` the cases.
2. `selectFreeRun` takes `banishValue`; `fights.ts` gymFreeRun/gymFreeRunGear pass false, so a
   banishing source holding a gym mer-kin is still spent as a run there.
3. `library.ts` "Library Seed": when lastCopyableMonster is not a free monster and ≥3 Back-Ups
   remain (`lib/backup-seed.ts`), fight a free monster first via `summonFree` (locket reminisce
   of any free monster, a held mimic egg, or a DNA-bank egg with 100 mimic xp); declines
   quietly when none is on hand.
