# Run analysis: 2026-09-03 (43 turns) vs gold UTS 2026-08-21 (41)

Log: `docs/2026-09-03-run.txt` (11,153 lines). Parsed with
`docs/superpowers/research/2026-09-02-turn-ledger/ledger.py`: 190 `[N]` blocks, 42 paid markers
plus the Seaceress at `[43]` = 43. Gold: 173 blocks / 41 paid. Line numbers `:NNNN` are into
today's log; `gold:NNNN` into `docs/superpowers/research/runs/gold-uts-2026-08-21.log`.

Run shape: paused at turncount 11 (`:3795` Run End, no abort; `:3843` restart) while the lockkey
gate fix was deployed, resumed 1 behind. Shub killed the character at `[41]` (`:10482`); the
hand refight at `[42]` (`:10877`) is the ledger's "+1 unattributed" turn. King freed at 43.

## 1. Per phase, paid turns

| phase                 | gold | today | Δ      | cause                                                                               |
| --------------------- | ---- | ----- | ------ | ----------------------------------------------------------------------------------- |
| Haunted Pantry        | 5    | 3     | −2     | sandwich after 2 fights (gold 4); but both paid fights were avoidable (§2.3)        |
| Wreck                 | 1    | 1     | 0      |                                                                                     |
| Marinara Trench       | 3    | 3     | 0      |                                                                                     |
| Outpost               | 6    | 6     | 0      | cot→stashbox + wish saved gold's 2nd tent, then a paid healer after the wish (§2.2) |
| Coral Corral          | 0    | 4     | **+4** | seahorse lottery played with paid draws (§2.1)                                      |
| School                | 4    | 3     | −1     | no Scaly Bully NC needed this run                                                   |
| Library + dreadscroll | 2    | 2     | 0      | seed pinned first try (1 candidate, `:6935`)                                        |
| Skate Park            | 4    | 5     | +1     | one-time `Picking Sides` NC drawn under a forced NC (§3)                            |
| Gymnasium             | 4    | 3     | −1     | headguard came 3rd of 5 NC items                                                    |
| Yog-Urt               | 1    | 0     | −1     | bat wings proc `:7936`                                                              |
| Colosseum             | 7    | 8     | +1     | wings: gold 3 procs in the block, ours 2                                            |
| Abyss finish          | 3    | 2     | −1     | school of many banished with Curveball `:10149` (fix 7dc808a working)               |
| Shub-Jigguwatt        | 1    | 2     | +1     | retaliation loss, refought by hand (fixed 3d3efa5/dc2eb22)                          |
| Seaceress             | 0    | 1     | +1     | gold's 4th wings proc landed there (`gold:9880`)                                    |
| **total**             | 41   | 43    | +2     |                                                                                     |

Deterministic sinks ours to fix: corral (up to 4), pantry (2), prayerbeads (1), Shub (1, done).
Floor with today's luck: **~36**.

## 2. Sinks with mechanism

### 2.1 Corral: 4 turns (`[14]`–`[17]`)

Opener delivered the full bundle at `:5128-5133` (2 cowbells, 2 leather, 2 lassos, back-up →
eye → Refracted Gaze → McTwist → Punch), +1 cowbell pulled `:5156`. Chaps and hat crafted
`:5184/:5204`. Supplies complete before the first taming fight.

Tame Seahorse draws:

| block | monster       | action              | cost  | note                                                       |
| ----- | ------------- | ------------------- | ----- | ---------------------------------------------------------- |
| [14]  | sea cowboy    | Bowl a Curveball    | free  | `:6454`                                                    |
| [14]  | rustler       | Feel Hatred         | free  | `:6484`                                                    |
| [14]  | sea cow       | ink bladder         | **1** | `:6508`; the 20% "swim away" roll that costs the adventure |
| [15]  | sea cow       | Shattering Punch #3 | free  | `:6551`                                                    |
| [15]  | sea cow       | Gingerbread Mob Hit | free  | `:6592`                                                    |
| [15]  | sea cow       | darts + Saucegeyser | **1** | `:6602`                                                    |
| [16]  | sea cow       | kill                | **1** | `:6764`                                                    |
| [17]  | sea cow       | kill                | **1** | `:6842`; dolphin stole the cowbell                         |
| [18]  | wild seahorse | cowbell ×3 + lasso  | free  | `:6928`, named Pluotjack                                   |

Wiki (The Coral Corral): the wild seahorse has an **80% rejection rate per adventure,
independent of queue and banishes**. So after two banishes every draw is a ~20% lottery and
each losing draw must be made turn-free. Wiki (ink bladder): free escape 80% of the time,
costs the adventure 20%; today's was the 20%.

Gold played the same lottery at zero turns (`gold:5407` cow Curveball, `gold:5578` rustler
Hatred, then `gold:5751` rustler → **waffle** → cowboy → bladder free, `gold:5900` cowboy →
waffle → bladder free, `gold:6044` cowboy → waffle → **seahorse** → tamed, all at `[16]`).

Why we never waffled: 3 waffles were in inventory all day (`:1020`, never thrown). The
compiled macro carried the waffle rung at `:6436` and `:6467` and lost it from `:6495` on.
`src/tasks/monkees/corral.ts` `waffleMacro()` returns empty when fewer than 2 draws are
unbanished, which is exactly the state after the two banishes, i.e. the only state in which
the waffle matters. The reference ash throws a waffle whenever one is held and not yet thrown
this fight (`UnderTheSeaCCS.ash:633-636`), with no banish-count guard. The "never banish the
last draw standing" rule itself matches the ash (`UnderTheSeaCCS.ash:571-576`) and stays.

Value: a waffle is an extra 20% roll inside a fight that is already free. Three waffles on
the bladder/Punch/Mob-Hit fights = 49% chance the paid draws never happen; expected saving
~2 turns, 4 on a hit.

### 2.2 Prayerbeads: 1 turn (`[13]`, `:4014`)

Beads before the task: 2 (`:2277`, `:2622`, from thingpouches). `prepare()` wished the 3rd
(`:4006`, paw wish 1/5) which satisfies `completed()`, then `do: outpost` ran anyway and the
healer was killed with Saucegeyser (no free-kill rung in `.forceItems().freeRun()`).
Grimoire checks `completed` before `prepare` and never between `prepare` and `do`
(`node_modules/grimoire-kolmafia/dist/engine.js:79,108-109`). Fix: wish/pull in a preceding
free-action task, or make `do` return when beads ≥ 3.

### 2.3 Pantry: 2 turns (`[1]` `:1123`, `[2]` `:1182`)

Both fights were the bang-potion identification fights (engine `startingMacro(bangPotionMacro)`,
`src/engine/engine.ts:224`; potions at `:1130-1131` and `:1195-1201`). The familiar was the
Stomping Boots for the free run, and the boots' stomp (17 and 10 damage) killed the macaroni
in round 2 and the tomatoes in round 5 before `.freeRun()` could fire. Fights 3–5 with the same
setup ran free (Spring Away `:1244`, bander `:1277`, `:1303`). Gold paid 3 here for the same
reason (`gold:1303-1432`).

Fix shape: keep bang-potion throws off pantry fights when the familiar deals damage (add the
pantry monsters to `bangPotionNever` while the boots are fielded) and throw them in a free fight
that lasts rounds anyway (golem back-ups at `[8]`–`[11]` last 5 rounds; the seed scan needs the
IDs only by `[18]`). Needs two more free-run rungs somewhere, which §2.4 provides.

### 2.4 Parka spikes still never fire (0 turns today, but it is the ladder depth)

At the gym the task sets `parka spikolodon` (`src/tasks/sorceress/gym.ts:46`) and then
maximizes with `+equip Jurassic Parka`; the maximizer re-picks the kachungasaur tab
(`:8321-8330`, four times `:8371-8453`), so `Launch spikolodon spikes` is never castable.
Today's gym ran free on Snokebomb ×3, Hatred ×2, latte and bander ×3 instead; those are the
charges the pantry (§2.3) would need. Set the mode after `maximize`, or through the outfit's
`modes` so libram applies it last.

## 3. Variance, not fixable

- **Ink bladder** 20% roll (§2.1).
- **Seahorse** 20% per draw; today 7 draws, gold 3.
- **Picking Sides** (`[25]` `:8199`): a one-time war NC with only "take the blade" / "take the
  key" (wiki), no free exit; drawn under an Avalanche-forced NC with the blade already pulled
  and equipped (`:8110`, `:8113`). It is in the pool regardless of blade ownership (09-02 hit
  it bladeless, today with the blade). Gold's four forced NCs never drew it
  (`gold:7666, 7677, 7825, 7969`). Nothing to change; the blade pull can be dropped only if
  the NC is guaranteed first, and it is not.
- **Bat wings**: today [23] Yog, [32], [37]; gold [32] ×2, [36], [42] Seaceress. Net +2 for gold.

## 4. Lockkey gate check

Rescue at Outpost adventure 10. Healer #11 at adventure 26: killed, no key (26% expected).
Healers #12–16 at adventures 31–35 were back-upped to golems by the pre-fix code before the
pause. Healer #17 at adventure 36, first kill after the restart: key (`:3889`). Consistent with
the gate; 5 back-up charges and Sweat Bullets went into post-gate healers before the fix.

## 5. Charges at run end (today / gold)

Snokebomb 3/1 used, Hatred 3/3, X-Ray 3/1, Punch 3/3, Mob Hit 1/1, bander 5/–, Force 2/3,
latte 1/1, back-ups 10/7, paw wishes 1/3, bowling 7/6, avalanche 3/–, cinch 25/85 (one Fiesta
Exit unspent today), bricks 8/11, spikes 0/–, waffles 0/3 thrown, wings free fights 3/4.

## 6. Ranked

1. Corral waffle guard (`corral.ts` `waffleMacro`): ~2 expected, 4 max. Evidence gold:5751-6044.
2. Pantry potion-ID off the boots' fights: 2, conditional on 3.
3. Spike mode after maximize (`gym.ts:46`): funds 2 and any other free-run-short zone.
4. Prayerbeads post-wish adventure: 1.
5. Shub: done (3d3efa5, dc2eb22), live-verify next run.
