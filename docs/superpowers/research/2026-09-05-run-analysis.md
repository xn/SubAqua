# Run analysis: 2026-09-05 (48 turns) vs gold UTS 2026-08-21 (41)

Log: `docs/2026-09-05-run.txt` (10,959 lines). 187 `[N]` blocks; cost per block read off the
`[N]` counter (47 attributed + the hand-killed sea cow at `[19]` = 48). Line numbers `:NNNN` are
into today's log; `gold:NNNN` into `docs/superpowers/research/runs/gold-uts-2026-08-21.log`.

Run shape: two aborts, both fixed and deployed mid-run (uncommitted on `run-0904-fixes`).

1. `[19]` `:6293` Tame Seahorse: the waffle inside the KoL macro was refused on a sea cow
   ("You don't want to waste a waffle right now"), KoL printed "(Macro aborted.)", mafia aborted
   the script. The cow was killed by hand (the "+1 unattributed" turn). Fix: the throw is now a
   plain useitem before the macro (`corral.ts` `tameSeahorseAdventure`); the four later throws
   (`:6497` `:6529` `:6561` `:6625`) were refused harmlessly.
2. `[36]` `:9066`-`:9282` Colosseum round 4: the bladeswitcher busted its move, the filter
   stalled 16 rounds through every unguent and sea gel, then attacked into the live reflect three
   times (~500 HP each) and lost. Fix: reflect state read off `monsterHp()` movement, wind-up
   round nukes, Weaksauce before the attack floor (`fights.ts` `gladiatorFilter`). Rounds 7, 10
   and 13 were then one-shot (`:9643` `:9803` `:10037`).

## 1. Per phase, paid turns

| phase                   | gold | today | Δ      | cause                                                                                         |
| ----------------------- | ---- | ----- | ------ | --------------------------------------------------------------------------------------------- |
| Haunted Pantry          | 5    | 3     | −2     | sandwich after 2 paid NCs (`[1]` `[2]`), fights all free                                      |
| Wreck                   | 1    | 1     | 0      |                                                                                               |
| Marinara Trench         | 3    | 3     | 0      |                                                                                               |
| Outpost                 | 6    | 9     | **+3** | three paid healers (`:3334` `:3383` `:3441`) hunting the tent NC with the ladder spent (§2.3) |
| Bakery + Abyss habitats | 0    | 2     | **+2** | screech on a paid baguette lady (`:3945`); paid habitat eye (`:4021`) (§2.4)                  |
| Coral Corral            | 0    | 3     | **+3** | hand kill after the abort (`:6293`), then two paid cows (`:6543` `:6611`) (§2.1)              |
| School                  | 4    | 5     | +1     | five NCs (`:7018` Graffiti, Halls, Bully, `:7167` Bored, `:7440` Raising Cane) vs gold's four |
| Library + dreadscroll   | 2    | 2     | 0      |                                                                                               |
| Skate Park              | 4    | 5     | +1     | Sickpipe `:8122` + four NCs; the forced NC landed on one-time `Picking Sides` `:8132` again   |
| Gymnasium               | 4    | 2     | −2     | headguard early; two `Ators Gonna Ate` (`[34]` `[35]`)                                        |
| Yog-Urt                 | 1    | 1     | 0      | dreadscroll `[28]`                                                                            |
| Colosseum               | 7    | 9     | **+2** | lost round 4 (`:9282`): the turn plus the Club 'Em charge it burned (§2.2)                    |
| Abyss finish + Mom      | 3    | 2     | −1     | school of many curveballed (`[46]`); Peanut `:10330` and Mom paid                             |
| Shub-Jigguwatt          | 1    | 1     | 0      | Peace Turkey, no retaliation                                                                  |
| Temple right door       | 1    | 0     | −1     | bat wings proc on `They've Got Fun and Games` (`:7882`)                                       |
| Temple left door        | 1    | 1     | 0      |                                                                                               |
| Seaceress               | 0    | 1     | +1     | gold's 4th wings proc landed there (`gold:9891`); ours paid (`:10854`)                        |
| **total**               | 41   | 48    | +7     |                                                                                               |

Mechanism sinks: corral 3, outpost 3, Mom 2, Colosseum 2 = 10. Variance netted −3 in our favour
(pantry, gym, temple, abyss vs school, skate park, Seaceress). Floor with today's luck: **~38**.

## 2. Sinks with mechanism

### 2.1 Corral: 3 turns (`[19]`–`[21]`)

Sequence: cowboy → Curveball (`:6228`), eye (habitat copy) → waffle → rustler → Feel Hatred
(`:6260`), then five sea cow draws: hand kill `:6293`, bladder `:6499`, bladder `:6531`, paid
`:6543`, paid `:6611`, seahorse `:6684` tamed `:6697`. Every waffle on a cow was refused.

Gold's corral was free: cow Curveball, rustler Hatred, then cowboys: waffle → cowboy → bladder,
refused → bladder, waffle → **seahorse** (`gold:5751`-`6044`).

The draw that is left standing decides the waffle's value. Across every logged throw
(08-03 → 09-05): from a **sea cowboy** 6 seahorses in 20 throws; from a **sea cow** 0 in 13
(today's five included). At a 30% hit rate, 0/13 has a 1% chance, so treat it as the rule: the
waffle does not roll a cow into the seahorse. The taming regime armed the cowboy first because
`drawBanishable()` only refuses to banish the _last_ draw; it should also refuse to banish the
cowboy while the cow is unbanished, so the cowboy is the draw that stands.

Two more turns were on the table: `:9946` shows a stuffed yam stinkbomb and Stomping Boots
runaways still unspent at run end (the boots need the familiar breathing gear the corral outfit
never put on), and the third ink bladder was pulled at `:8679`, after the corral.

### 2.2 Colosseum: 2 turns (`[36]`)

The lost bladeswitcher (`:9066`-`:9282`) cost its turn and Club 'Em Back in Time charge #4
(`_clubEmTimeUsed` 3→4 at `:9080`), which would have made round 7 free: 16 combats, 7 free
(5 Club 'Em, 3 wings in the block, one charge wasted) against gold's 15 combats, 8 free. Fixed
in `gladiatorFilter` (see run shape); the 08-16 and 08-27 losses had the same shape.

### 2.3 Outpost: 3 turns (`[12]`–`[14]`)

Two different stretches share the zone. Inside the lockkey gate (26 outpost adventures, free
fights count) every combat has to be ended for free or paid; after the gate the stashbox task
adventures until the tent NC (`Into the Outpost` → `Mysterious Intent`) appears, and every
combat before it likewise. Today all 11 Sweat Bullets and Shattering Punch #2/#3 (`:3285`
`:3323`) went inside the gate, so the three post-gate healers were paid (`:3334` `:3383`
`:3441`) before the tent came at `[15]` (cot → prayerbeads `:3499`, then altar → stashbox
`:3670` on the `[16]` visit).

Gold spent nothing on any outpost combat (`gold:2169`-`3287`): it filled the gate with habitat
golems, three backup-camera copies (`gold:2919` `2964` `3001`) and two screech golems, spent
only 6 Sweat Bullets there, and still had 4 of them for the healers right before the tent.
Ours used 5 of 11 backups all run (`_backUpUses`), none in the outpost: `farmBackup` only copies
a golem, and only after both recalls, and the Lockkey task drops it once the gate opens.

Post-gate, backups do not help (a copy replaces the encounter, so it cannot be the tent NC);
free kills or free runs do. Snokebomb ×3 was unspent at that point and went to the gym at
`[34]`, where the Stomping Boots runaways, still unspent at run end (`:9946`), could have run
instead. So the 3 turns are a ladder-ordering problem across zones, not a shortage: gate
fillers (golems, backups) inside the gate, Sweat Bullets held for the pre-tent healers,
snokebombs in the outpost and boots in the gym.

### 2.4 Mom: 2 turns (`[17]` `[18]`)

**Screech (1).** The port of G8 (screech the last habitat golem in the outpost, `outpost.ts`
`screechTurn`) fired correctly today: the eagle was out and skill 7451 was in the macro for
the last habitat golem at `:3258`. But the compiled CCS put the free-kill block first:
`if monsterid 773 || 1188; skill Shattering Punch` precedes `if monsterid 1188; if !pastround 3;
skill 7451`, so Punch #2 ended the golem before the opener ran (`:3285`). The Club 'Em golem
at `:3580` was then skipped by design (`wandererScreech` defers to live habitat golems),
Banish Constructs found the locket golem already spent (`:2084`), and the only screech of the
run went on the bakery's baguette lady at `:3952`, a paid fight. That also mis-timed the
11-combat construct window: it opened at `[17]` and ran out midway through the cyber lane
(hackers from `:4173` on). Gold cast both on free outpost golems (`gold:2824` `2870`). Fix:
emit the screech opener ahead of the free-kill block in the golem macro.

**Habitat eye (1).** `:4021` paid an eye for Recall Facts #3 + the Spooky VHS Tape. Gold did
the same on Shattering Punch #2 (`gold:3675`). Ours had spent Punch #2/#3 on the outpost golem
and a healer at `:3285` `:3323`; the free-kill reservation should hold one Punch for this eye
(the 09-02 finding again).

## 3. Variance, not fixable

Pantry −2 (sandwich after two NCs), gym −2 (headguard early), temple right door −1 and Yog-Urt
0 (wings), abyss −1 (school of many curveballed); school +1 and skate park +1 (NC roulette,
though `Picking Sides` under a forced NC is now twice in a row and worth a look), Seaceress +1
(wings rolled 4 procs, one of gold's four was the Seaceress).

## 4. Charges at run end (today / gold)

| resource                        | today                                    | gold                           |
| ------------------------------- | ---------------------------------------- | ------------------------------ |
| BCZ Sweat Bullets               | 11 (outpost 8)                           | 11 (outpost 6)                 |
| Shattering Punch                | 3 (outpost)                              | 3 (flytrap, goblin, abyss eye) |
| Chest X-Ray                     | 3 (trench)                               | 3                              |
| Gingerbread Mob Hit             | 1 (corral opener)                        | 1                              |
| shadow bricks                   | 10                                       | 11                             |
| Club 'Em Back in Time           | 5 (one on the lost round)                | 5                              |
| bat wings free fights           | 4 (3 Colosseum, 1 temple)                | 4 (3 Colosseum, 1 Seaceress)   |
| Patriotic Screech               | 1 (paid baguette lady)                   | 2 (free golems)                |
| Bowl a Curveball                | 7                                        | 6                              |
| Feel Hatred / Snokebomb / latte | 3 / 3 (gym) / 1 (gym)                    | 3 / 1 / 1                      |
| Avalanche / spikes              | 3 / 1 (gym → skate park)                 | 0 / – (tuba + cincho there)    |
| stuffed yam stinkbomb           | **0, still held** (`:9946`)              | –                              |
| pulls                           | 20 (bladder #3 at `:8679`, post-corral)  | 20                             |
| waffles                         | 6 thrown, 1 hit (all 5 refusals on cows) | 3 thrown, 2 hits (cowboys)     |

## 5. Ranked

1. Golem macro order (`outpost.ts` `farmCombat` / Stashbox combat): screech opener before the
   free-kill block. 1 turn (the bakery lady) plus the cyber window landing where the ash puts it.
2. Corral banish order (`corral.ts` `drawBanishable`): never banish the cowboy while the cow
   stands. ~2 expected, 3 max. Evidence: 6/20 vs 0/13 above, gold `:5751`-`6044`.
3. Outpost ladder order: golems and backups fill the gate, Sweat Bullets held for the pre-tent
   healers, snokebombs there and boots runaways in the gym. 3 max, ~2 expected.
4. Punch reservation for the habitat eye. 1.
5. Corral free runs: pull the ink bladder before the corral, not at `:8679`; boots breathing gear
   in the Tame Seahorse outfit. 1–2, overlaps with 2.
6. Waffle-in-macro abort and bladeswitcher reflect: done, live-verify next run.
