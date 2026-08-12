# SubAqua design — TypeScript re-implementation of UnderTheSea

**Date:** 2026-08-11
**Status:** approved pending user review
**Reference material:** `../UnderTheSea` (ash source of truth), `../pearlo` (domain docs:
`CLAUDE.md`, `docs/sea-reference.md`, `docs/consumption-reference.md`,
`docs/maximizer-reference.md`), `../kolmafia` (mafia source ground truth — see §8), the
wiki page `11,037_Leagues_Under_the_Sea/Strategy` (see §9; fetch via MediaWiki API with a
browser user agent), `../loop` (the user's aftercore loop wrapping this content —
battle-tested idioms, notably codpiece socketing in `src/tasks/thesea.ts` and pearl helpers in
`src/tasks/pearl.ts`), and **libram itself** (`node_modules/libram/dist/**` — read the source,
not just the typings: the per-IOTM resource modules are battle-tested implementations of the
mechanics our `resources/` layer builds on, the typed-preference unions are the authority on
pref names, and before hand-writing any game interaction, check whether libram already ships it)

## What SubAqua is

A **one-shot speedrun script for the 11,037 Leagues Under the Sea challenge path** (path id 55),
written in TypeScript on grimoire-kolmafia/libram, for **public release**. It runs the path from
initialization through the Nautical Sorceress with minimal resource waste. It is _not_ a loop
manager: no aftercore mode, no postloop pearl farming, no eagle-screech cleanup, no codpiece prep.

### Scope decisions (user, 2026-08-11)

- **Full parity** with UnderTheSea.ash's in-path route, **except**:
  - `sim` stays a bare checklist (owned IOTMs/skills/familiars + Hagnk's pulls, tier verdict).
  - Postloop reduces to a single optional `postloopCommand=` arg (`cliExecute` after the finale).
    The postloop _mode_ and its features (eagle screech run-out, pearl farming, codpiece prep) are dropped.
- **Path only** — every `my_path().id == 0` (aftercore) branch is cut, including the boss prompt
  and the aftercore organ guards.
- **Public release**, with **per-tier runplans**: each shiny tier gets its own composed task list
  rather than inline conditionals.
- **Validation is incremental live runs** on a real account — re-entrancy and partial-run
  ergonomics are first-class requirements.
- Nothing in the existing repo is sacred; salvage on merit only.

## Predecessor assessment (summary)

- **UnderTheSea.ash** (~6,800 lines across 4 files): three-phase driver
  (`initialization()` → `seaMonkees()` → `sorceress()`), consult CCS with ~20 zone regimes,
  choice handler for ~40 choices, per-turn `post_adv()` hook, dreadscroll seed spading via the
  external `seedfinder` ash import, mimic-egg summons via `c2t_megg` CLI. State is entirely
  re-derived from mafia each pass — there is no progress ledger. Tier logic (`lowShiny()` /
  `highShiny()`) touches ~55 call sites.
- **Existing SubAqua src** (one "wip" commit, ~40% of the monkee spine): salvageable —
  dreadscroll constraint solver, Möbius/dart-perk choice tables, water-breathing fallback ladder,
  underwater familiar/outfit scoring, relay UI, quest-step knowledge in `little`/`grandpa`/
  `currents`, `forcenc.ts` sources. Defective — a `getNextTask` override that silently ignores
  all `after` dependencies, no combat-resource allocation (every `banish` degrades to kill),
  ~190 lines of foreign loopstar instrumentation, `_loopstar_` vs `_subaqua_` pref mismatch,
  empty `mom/dad/hatred/violence` task files.

## 1. Repository layout

Everything in `src/` is replaced by:

```
src/
  main.ts              entry: Args.fill → guards → runplan selection → engine.run() w/ destruct()
  args.ts              rebuilt; subaqua_* prefs; only args that are actually consumed
  sim.ts               `sim` checklist (port of iotmChecklist + pullChecklist)
  lib/
    index.ts           small shared helpers only
    dreadscroll.ts     seedfinder port + clue store + 703 solver support
  engine/
    engine.ts          SubAquaEngine extends grimoire Engine — stock scheduling kept
    task.ts            Task extension: required limit, peridot, underwater, freeaction
    outfit.ts          breathing enforcement, underwater familiar scoring, equip helpers
    combat.ts          action taxonomy + macro builders shared by tasks
    post.ts            per-turn duties, called from engine post()
  resources/           the iotm.ash port, one module per concern, on top of libram
    saber.ts           Force budget (diver ×2 → healer → sea cow → researcher tiers)
    summon.ts          summon ladder: locket → fax → ChestMimic → pocket wish
    ncforce.ts         NC-force estimate + spend ladder (tuba/cincho/pillkeeper/pulls)
    banish.ts          banish framework (spring shoes/monodent/heartstone/snokebomb)
    freekill.ts        free-kill ladder, tier-aware
    freerun.ts         free-run ladder
    pulls.ts           reserved-pull economics (_roninStoragePulls bookkeeping)
  tasks/
    runplans.ts        per-tier task-list composition (low/mid/high)
    init.ts            initialization dailies (photobooth, workshed, mayam, leprecondo, …)
    monkees/           guild, pellet, bigbrother, grandpa, outpost, currents,
                       helmet, mom, corral   (the seaMonkees() spine)
    sorceress/         rift, teflon, lasso, seahorse, dreadscroll, yogurt,
                       colosseum, shub, finale
  standalone/
    choice.ts          choiceAdventureScript bundle
  relay.ts             kept as-is
```

There is **no consult-script bundle** — see §5; dynamic combat runs in-process.

### Structural principles

1. **Tier logic lives in two places only**: `runplans.ts` (route membership/order) and the
   `ResourcePolicy` consumed by `resources/` modules and `init.ts`. No tier conditionals in task
   bodies — a task that branches per tier is split into two factories and the runplan chooses.
2. **State stays in mafia**: every `completed()` re-derives from quest props / trackers / item
   counts, exactly like the ash. This is what makes abort-anywhere/resume-anywhere work.
   Script-owned prefs use `subaqua_` (persistent) / `_subaqua_` (daily) namespaces, replacing the
   ash's ad-hoc `stashboxChecked`/`NCtoC`/`cardChoice*` etc.
3. **Cross-bundle state is prefs-only**: the choice script is a separate interpreter; logic is
   shared at build time (same source imported by both bundles), runtime state crosses via
   `_subaqua_*` prefs.

## 2. Engine, scheduling, and the per-turn hook

- **Stock grimoire scheduling.** `SubAquaEngine` keeps `getNextTask()`/`available()` — list
  order is priority, `after` blocks, `limit` guards. The runplan hands the engine a flat,
  already-composed task list; the engine knows nothing about tiers.
- **`customize(task, outfit, combat, resources)`** is the resource-allocation pass: abstract
  combat actions (`banish`, `killFree`, `freeRun`, `yellowRay`, …) declared by tasks resolve
  against the `resources/` ladders, tier-aware via the policy object. Unavailable sources fall
  back per the action's declared fallback, explicitly — never silently.
- **Outfits** are grimoire `OutfitSpec`s + maximizer (per pearlo's maximizer-reference idioms),
  with salvaged breathing enforcement (SCUBA preference while lasso-training; das boot /
  bathysphere for non-underwater familiars) and defensive stripping of un-owned items. The ash's
  implicit `modes` string channel becomes the explicit `OutfitSpec.modes` field.
- **`do` wrapper** sets Peridot choice 1557 targeting from `task.peridot`.
- **`post_adv()` splits three ways:**
  1. Reactive cleanup (poison cure, dolphin whistle, junk autosell, lost-combat abort,
     dreadscroll seed check) → engine `post()`.
  2. Diet/Fishy management → explicit gating: underwater tasks declare needs; `maintainFishy()`
     in `prepare` tops up via the ladder (fishy pipe / sushi / fish sauce / astral pilsner tier
     rules) and aborts with instructions when exhausted. Asdon `Driving Waterproofly` handled here.
  3. Wanderer follow-ups (VHS tape, Club 'Em Next Week) → high-priority tasks whose `ready()`
     fires on the counter/effect. No adventuring from inside hooks.
- **Recovery**: pearlo's model — auto-recovery triggers effectively off; explicit
  `restoreHp`/`restoreMp` with absolute floors in task `prepare` (570 HP baseline, 800 gymnasium,
  full colosseum, 250 MP). Shub turns MP recovery off and dumps MP; Yog-Urt keeps the
  max-HP ≤ 311 guard.
- **Zone gating**: `ready()` conditions lean on mafia's own availability logic —
  `canAdventure()` already implements all sea-floor and deepcity gating
  (`KoLAdventure.seaFloorZoneAvailable`/`deepCityZoneAvailable`: class maps, `corralUnlocked`,
  black glass for the Abyss, `seahorseName` for deepcity, the temple-door state machine) and
  auto-equips required Mer-kin outfits for temple zones. Mafia _refuses_ underwater adventures
  without breathing gear rather than fixing them, which is exactly why our outfit layer
  enforces breathing first.
- **Bounded loops**: every adventuring task has a `limit` (type-enforced). Intentional ash
  counters carry over (`diverTries < 4` → `tries: 4`, golem ≤ 6, gummiheart stall ≤ 8, cleanUp
  round-stall abort). The ash's unbounded loops (stashbox, rivet grind, High Priest wait) get
  generous `soft` limits with descriptive `message`s.

## 3. Tiering and runplans

**Detection** (ports the code's behavior, not the README's — see Flagged items):

- `low`: owns none of 2002 Mr. Store Catalog / cursed monkey's paw / august scepter.
- `high`: `garbo_valueOfFreeFight > valueOfAdventure`.
- `mid`: neither.

Detected once at startup; `tier=low|mid|high` arg overrides. Written to `_subaqua_tier` at init
for the choice bundle.

**Runplans** — one composition per tier from a shared factory catalog, differing in:

1. **Route membership** — high: Sword-of-S-Words corral+abyss Mom lane, skips one-turn corral
   opener and golem recall, conserves maps/copies; low: skips pull-dependent shortcuts, adds
   farm-instead-of-pull tasks (rivet grind, scroll farming), leans on CMoI; mid: the
   spend-everything-on-speed superset.
2. **`ResourcePolicy`** — consumed by resource ladders (high: darts-only free kills, no map
   usage, saves parka YRs; etc.). Replaces ~40 of the ash's ~55 tier call sites.
3. **Init parameters** — Leprecondo layout, Apriling instruments, 2002-credit spending,
   workshed choice as policy fields consumed by `init.ts`.

The three plans share ~80% of tasks. Each runplan file lists its tasks in order, so two tiers'
routes diff as two arrays; a future plan (e.g. aftercore) is a new composition, not new branching.

## 4. Resources layer (iotm.ash port)

All consulted through `customize()` or task `prepare`, never free-lanced from task bodies.
These modules encode _this route's_ priorities; libram owns the mechanics.

- **`saber.ts`** — explicit Force budget object: tasks request a purpose; module grants/refuses
  based on remaining charges and outstanding higher-priority purposes
  (diver ×2 → outpost healer → sea cow → researcher/free-run). Zone gating included
  (no early Forces in The Mer-Kin Outpost).
- **`summon.ts`** — `summon(monster)`: combat lover's locket (≤3) → fax (3 retries) →
  `ChestMimic.receive()`+`differentiate()` (replaces c2t_megg; keeps the defensive choice-1387
  handling) → pocket wish / genie (with the accordion-thief Overgrown Lot wish farm) → abort.
  Charge estimation informs the early sea-cowboy opener decision.
- **`ncforce.ts`** — `estimate()` (tuba, McHugeLarge ski, rest-aware Cincho, parka spikes,
  base 2; deliberately excludes Pill Keeper) and `force()` cheapest-first: tuba → cincho (free
  rests restore cinch) → Sneakisol → pull-backed (Allied radio / Clara's bell / stench jelly).
  Folds in old `forcenc.ts` sources; fixes the inverted Clara's-bell `remaining()`.
- **`banish.ts`** — ash `banMap` framework over libram's `getBanishedMonsters`; per-target source
  choice. `banishGear()`'s hidden `<slot>Override` pref side-effect is replaced by returning
  equip requirements merged into the task outfit.
- **`freekill.ts` / `freerun.ts`** — the CCS ladders as data: ordered sources with
  `available()`/`use()`, filtered by `ResourcePolicy`; one-free-source-per-fight guard preserved.
- **`pulls.ts`** — one reserved slot per unique item; exact-id matching against
  `_roninStoragePulls` (keeping the `",3604,"` delimiter trick); `pullsRemaining() > reserved()`
  gating (preserving the intentional `>=` at the skate-park site). Mafia enforces a 24-item
  in-path pull blocklist (`InventoryManager.pullableInSeaPath`: fish scales, diving helmets,
  sea leather, Mer-kin gear, colosseum weapons, unblemished pearl, …) — the module mirrors it
  so route planning never counts on an impossible pull.

**No `user_confirm` anywhere** (public automation must not block on dialogs): the
`autoBuyPriceLimit` prompt becomes a `buyLimit=` arg (default: the user's `autoBuyPriceLimit`
mafia preference) plus abort-with-instructions on overrun; the chosen-familiar sanity prompt becomes a printed warning +
abort overridable by arg.

## 5. Combat

JS `adv1(loc, -1, filter)` accepts an in-process callback `(round, monster, pageText) → command`,
which replaces the ash's separate consult interpreter entirely. Two layers, both in the main
bundle:

**Layer 1 — static fights: `CombatStrategy` + `StrictMacro`.** Opener chain in the ash's fixed
priority order (Source Terminal duplicate → saber Forces → bat form → otoscope → jelly
extraction → lecture), each gated through resource budgets at macro-build time; per-monster
handling; then the shared finisher porting `cleanUp()`: Lunging Thrust-Smack (muscle class,
not colosseum, physical resistance < 50) → Saucegeyser → Stuffed Mortar Shell + Saucestorm →
attack. Finisher invariants: **never return an open fight**; abort on round-stall. The CCS's
stray-semicolon bug (unconditional Use the Force at Fitzsimmons, CCS:596-597) is not ported.

**Layer 2 — dynamic regimes: filter callbacks** for fights needing live page text or mid-fight
state:

- **Colosseum gladiators** (also bladeswitchers in library/gymnasium): mafia's source
  (`FightDecorator.java`, `RelayRequest.java:1144`, `QuestManager.java:2358`) documents the full
  mechanic. Opponent schedule is deterministic — `lastColosseumRoundWon % 3` → 0: balldodger
  (counter-weapon: dragnet), 1: netdragger (switchblade), 2: bladeswitcher (dodgeball); named
  bosses at rounds 13/14/15 — so the task outfit equips the correct counter-weapon per round.
  Each gladiator telegraphs its big move one round ahead via a bolded keyword in the fight text;
  the filter callback matches it and casts the counter skill granted by the equipped weapon
  (bladeswitcher: bust/sweat/sack → Ball Bust/Sweat/Sack; balldodger: gain/loss/neutrality →
  Net Gain/Loss/Neutrality; netdragger: sling/rolls/runner → Blade Sling/Roller/Runner).
  **Caveat (wiki strategy)**: the nine counter skills must first be _learned_ by landing enough
  critical hits with each weapon — so the primary kill plan stays the ash's spell route
  (Saucegeyser with the lantern spell-damage coefficient maximize), with telegraph counters
  used opportunistically when known, and the ash's sea-gel/unguent stall regime as the response
  to a telegraphed big move we can't counter — parsing the round text the callback already
  receives, no mid-round refetch. Stall invariants preserved: every stall branch advances the
  round; free delevelers banned in stalls.
  `lastColosseumRoundWon` / `isMerkinGladiatorChampion` are mafia-maintained (wanderers
  excluded) and serve as `ready()`/`completed()`.
- **Colosseum rules**: gladiators instakill-immune — all instakills skipped except Club 'Em Back
  in Time; saber never equipped there (weapon slot holds the counter-weapon).
- **Coral Corral** three-regime dispatch: seahorse taming throws (`cowbell,cowbell` then
  `cowbell,lasso`, abort if untamed), one-turn opener paths, steady-state banish/re-roll.
  Monster re-rolls need no dispatch loop — the callback is simply called again.
- **Yog-Urt** (max-HP ≤ 311 abort guard, funkslinged deleveler+heal pairs), **Shub** (shared
  multiplicative delevel-factor module used by both prep math and in-fight casting — kept
  multiplicative on purpose; `shubPrepShort(2)` coupling to Yog-Urt shaving consumption
  preserved), **Center Door** (Raise Backup Dancer ×2 + finisher).

**Dropped**: autoattack, the `write_ccs("temp")`/restore dance, the `_utsPearlFarm` pref channel.
`engine/combat.ts` keeps the old repo's action-taxonomy vocabulary as the task-facing interface;
`customize()` resolves actions to macro steps or callbacks via the ladders.

## 6. Choices, dreadscroll spading, seedfinder port

**Division of labor:**

- Known-ahead, per-task → grimoire `choices` field (the ash's constant-answer table:
  299→1, 1469→2, 1483→1-then-3, …).
- Dynamic or can-fire-anywhere → `standalone/choice.ts` as `choiceAdventureScript`: salvaged
  dreadscroll 703 solver, Möbius 1562 priority table, dart-perk 1525 picker; ported stashbox
  search order per lockkey monster (313/314/315), elementary-school queue (396–401), card
  catalog 704, Peridot 1557 / Map the Monsters 1435 targeting via the shared `zoneTarget` table.
- Invariant: **every handler branch answers something.**
- The elementary queue is maintained in exactly one place (choice script), fixing the ash's
  two-site duplication.

**`lib/dreadscroll.ts`** owns _decisions only_ — mafia already owns the clue data
(source-verified, `DreadScrollManager.java`): all eight clues are parsed automatically into
`dreadScroll1..8` (choice 704 → 1/6/8; fights → 2/5; Deep Dark Visions → 3; knucklebone → 4;
worktea sushi → 7), failed guesses land in `dreadScrollGuesses` as `<8-digit-guess>:<n-correct>`
entries, and `merkinCatalogChoices` tracks catalog cards by identifier with stats/clue outcomes —
handling the vocabulary-dependent option reordering. No custom clue store; the ash's
`cardChoice1..10` / `DS1/6/8` bookkeeping has no TS equivalent. What remains ours:

- Native reimplementation of seedfinder's seed-space algorithm (source to be read exactly during
  implementation planning): `candidateSeeds()` filtered against mafia's clue prefs.
- Engine `post()` narrowing hook: exactly one candidate remaining → write the remaining
  `dreadScroll<n>` prefs (ash `dreadSeedCheck()`).
- `isKnucklebonesAndSushiEnough()` gates the long cheatsheet/vocabulary route vs the short branch.
- Choice 703 answer _selection and submission_ (mafia records but never solves): the salvaged
  expected-wrong-positions constraint solver over candidates + `dreadScrollGuesses`.
- Route decisions from clue coverage (which spading tasks are still needed).
- `godRunGuard` (arg-gated as in ash): at ≤ 17 turns played with clue 7 unknown, eat worktea
  sushi or abort.

## 7. Args, sim, relay, errors, tooling

**Modes**: bare `subaqua` (run) and `subaqua sim` (checklist). **Args** (all consumed, nothing
aspirational): `sim`, `tier=`, `buyLimit=`, `postloopCommand=`, `godRunGuard`, `list` (print the
selected runplan with per-task completed status — doubles as a mid-run progress view),
`actions=N` (run N tasks then stop; grimoire-native; the incremental-testing workhorse), plus
`help`/`version`. No `quest=` selector — `completed()` re-derivation fast-forwards re-runs
naturally.

**Sim**: owned/missing supported IOTMs, skills, familiars; Hagnk's stock for route pulls; tier
verdict; plus the pre-ascension checklist from the wiki strategy guide — permanent sea zone
unlocks (Dive Bar, Marinara Trench, Anemone Mine, Skate Park, Madness Reef), sushi-rolling mat
installed, five unblemished pearls loaded in the codpiece, Deep Dark Visions permed (the
dreadScroll3 source — effectively unobtainable in-run), underwater maps done. No purchases,
turns, or server writes.

**Relay**: `relay_subaqua.js` kept as-is; reflects `args.ts` automatically.

**Errors**:

- `engine.run()` always in `try/finally { destruct() }` — properties, CCS, choice-script
  registration restored on any exit.
- Instructive aborts: the ash's good essays carry over (photobooth clan, gummiheart wait);
  limits get `message` fields.
- Lost combat / beaten up → abort, checked in engine `post()`.

**Tooling**: keep rollup three-bundle build (main, choice, relay), yarn 4, eslint-plugin-libram,
`yarn mafia`. Delete `dependencies.txt` (no external script deps), `webpack.config.js`, and the
starter-kit README; write a public README (requirements, options, tier explanation — UnderTheSea's
README as skeleton). `prefs.txt` (old seafloor pref notes) is deleted.

## 8. Mafia-source integration (verified against the ../kolmafia checkout, 2026-08-11)

A source sweep of KoLmafia established what the script reads versus what it must own. This
section is the authority when it conflicts with ash-derived assumptions elsewhere.

### Read, never reimplement

- **Quest spine**: the whole `questS02Monkees` step ladder, `corralUnlocked`, `seahorseName`,
  `bigBrotherRescued`, map-purchase prefs — all parsed from page text by `QuestManager`.
  A single `visitUrl("seafloor.php")` re-syncs the map/zone prefs cheaply.
- **Lasso training**: `lassoTrainingCount` (0–20) is fully mafia-maintained, including the
  +1 sea cowboy hat and +1 sea chaps bonuses. `lassoTraining` holds the quality tier.
- **Lockkey → stashbox**: `merkinLockkeyMonster` is set on the lockkey drop and mafia
  auto-writes `choiceAdventure312` to match. Choices 313–315 have _no_ mafia tracking — the
  stashbox search rotation stays ours (choice script).
- **Colosseum**: `lastColosseumRoundWon` (self-correcting — re-derived from the round header on
  entry), `isMerkinGladiatorChampion`, the `% 3` weapon rotation (§5). Gladiator monster stats
  scale off the pref and proxy-record stats are recalculated at fight start — read
  `monster_attack()`/`monster_defense()`, never recompute. Same for Shadow Rift scaling
  (`_shadowRiftCombats`). ⚠ Mafia bug: `gladiatorBladeMovesKnown` is never written
  (`FightRequest.java:4926` writes the Ball pref instead) — don't read the `*MovesKnown` prefs.
- **Dreadscroll clues** (§6): `dreadScroll1..8`, `dreadScrollGuesses`, `merkinCatalogChoices`.
- **Copy/wanderer chains**: `_monsterHabitatsMonster`/`_monsterHabitatsFightsLeft` (reliable),
  `_saberForceMonster(Count)`, `rwbMonsterCount`. Macrometeorite / Powerful Glove re-rolls are
  _not_ tracked — re-read `last_monster()` after a re-roll.
- **Dolphin steals**: `dolphinItem` holds what was stolen; durable dolphin whistle uses/day
  equals `seaPoints`.
- **Boss facts** (monsters.txt): Yog-Urt is **Phys: 100** (spells only), Shub-Jigguwatt
  **Elem: 95** (physical only), wild seahorse Phys+Elem 100 with 1M HP (lasso is the only win),
  temple bosses all `Init: 10000`. No sea monster is NOBANISH. Colosseum/temple rows carry the
  `overdrunk` flag (fightable while falling-down drunk); all other sea zones are
  snarfblat-based and wineglass-compatible.
- **Underwater cost**: mafia's `getAdventuresUsed()` knows underwater = 2 turns without Fishy.

### Supported APIs replacing ash page-scrapes

- **Grandma's shop is a coinmaster** (barter tree including gladiator/scholar masks+tailpieces
  and their reverse conversions) and **Big Brother's store** likewise (sand dollars, maps,
  damp old boot, black glass) — plain `buy()`/`retrieveItem()` replaces the ash's
  `shop.php?whichrow=…`/`monkeycastle.php` URL work. Sand-penny shop is path-gated and known.
- **Skate park**: `cliExecute("skate lutz")` etc.; `skateParkStatus` + `_skateBuff1..5` tracked.
- **Mom buffs**: `mom` CLI / `MomRequest`; `_momFoodReceived`.
- **Codpiece**: modeled as slots `codpiece1..5`, and libram ships an `EternityCodpiece` module
  (`currentGems()`, `equippable()`, per-gem `modifiers()`) — use it for _reading_ state.
  **But mounting via `equip()` is unreliable**: mafia's codpiece slot state goes stale and
  `equip()` no-ops on slots it wrongly believes are filled (user-verified in practice). The
  proven pattern (see `/Users/xn/sites/KOL/loop/src/tasks/thesea.ts` "Socket Pearls") drives
  the codpiece page directly — `visitUrl("inventory.php?action=docodpiece")`, trust only the
  page's `mounted in slot #N` text, pop blockers with `choice.php?whichchoice=1588&option=2&
which=N`, mount with `option=1&which=N&iid=`, then `cliExecute("refresh inv")` and re-verify
  from a fresh page fetch. Removal via `unequip(slot)` works (the loop repo's `pryPearls()`).
  The maximizer does _not_ fill these slots; gem selection is ours (`init.ts`/outfit layer).
- **Autumn-aton**: `cliExecute("autumnaton send <zone>")` — the option-list hand-parse is dead.
- **2002 Mr. Store Catalog is a coinmaster** (`availableMrStore2002Credits`); mimic-egg DNA lab
  counters (`mimicEggMonsters`, `_mimicEggsObtained/Donated`) are mafia-maintained (libram
  `ChestMimic` drives it).
- **Saber daily upgrade**: `cliExecute("saber familiar")` (choice 1386) — no raw may4 URL.
- **Baseball diamond**: entry still `visitUrl("inventory.php?action=pball")`, but choice 1598
  has dynamic spoilers (read `availableChoiceOptions(true)` — pitch options are randomized per
  inning, map by text not position) and full pref tracking (`_baseballInnings`,
  `_curveballMonster`/`FightsLeft`, `_beanballMonster`, `_screwballMonster`, `_skullballMonster`);
  ice ball registers in mafia's BanishManager. Replaces `pitchNum1..9`. Must exit via option 6
  (not walk-away-able).
- **Choice auto-guards**: mafia rewrites choices 298/304/305/309 (seed packet / Vent Horizon MP
  / pressureglobe / Barback) to "skip" when unaffordable — tasks need no own affordability
  checks there.
- **Mining (teflon ore)**: automation is explicitly refused by mafia, but every fetched
  `mining.php` response is parsed into `mineState3` — a 36-char row-major 6×6 grid
  (`*` = promising chunk). The task picks a square from the pref and hits
  `mining.php?mine=3&which=<row*8+col>` (1-based row/col); no grid parsing.
- **Train set**: no CLI; `runChoice(1, "slot[]=…")` (the `choice` CLI's field validation rejects
  the form), then verify via `trainsetConfiguration`/`trainsetPosition`.
- **Trick-or-treat**: `_trickOrTreatBlock` is auto-scanned (uppercase = fresh house); only the
  `whichhouse=` submission is ours.

### Still ours (confirmed gaps)

Outpost stashbox rotation (313–315), dreadscroll answer _solving_ (703), seedfinder seed math,
mining square choice, trainset/tot/baseball submissions listed above, codpiece gem choice, and
all route/tier policy. `merkinQuestPath` is deliberately unmaintained in-path — gate on
`isMerkinGladiatorChampion`/`isMerkinHighPriest`/`shubJigguwattDefeated`/`yogUrtDefeated`.

## 9. Route constraints from the wiki strategy guide

Source: [11,037 Leagues Under the Sea/Strategy] (fetched 2026-08-11 via the MediaWiki API with a
browser UA — CloudFront blocks non-browser agents).

**Evaluation principle**: the script's objective is minimum total turns for the run. A wiki tip
is a mechanic _fact_; it becomes a route _decision_ only when it's net-turn-positive here, and
many are conditional on tier policy (pull budgets, wish budgets, owned IOTMs) rather than
unconditional. Bullets below record both the fact and the condition under which the route
acts on it:

- **Pearls are codpiece-smuggled, full stop.** The path requires five unblemished pearls; the
  September 1st nerfs made most quest items unpullable, and the ash's route assumes the pearls
  arrive pre-loaded (`UnderTheSea.ash:1024` — in-run resistance "only matters for farming
  unblemished pearls and those are smuggled in via the codpiece"). SubAqua adds an explicit
  **init guard**: count pearls across codpiece slots (libram `EternityCodpiece.currentGems()`)
  - inventory, abort at turn 0 with instructions if short (better than the ash's silent wall at
    the center door). In-run pearl farming is a possible future runplan, not current scope.
    In-run, pearls are popped out of the codpiece via `unequip(slot)` to free slots for gems
    (BCZ, peridot, heartstone); re-mounting anything follows the §8 socketing pattern.
- **Fishy economics are net-turn, not turns-of-Fishy**: `maintainFishy()` ranks sources by
  _marginal turns spent_, since the whole point of Fishy is halving underwater turn cost.
  Fishy pipe costs 0 turns; the Brinier Deepers Lucky! costs 1 turn + a Lucky! source; the
  Skate Park war resolution (choice 403, **skate blade equipped**) grants 30 turns but its
  war turns are only free because the route resolves the skate park anyway — so the ladder
  takes it opportunistically when the war completes (choosing blade over key, ideally during
  forced waits like Deep-Tainted Mind), and never schedules war turns _to get_ Fishy. The
  Monodent's Summon a Wave (~10 turns of Fishy off free fights in CyberRealm/a Shadow Rift)
  is similarly only counted at its marginal cost.
- **Old SCUBA tank decision point (not an unconditional buy)**: the tank vanishes from Big
  Brother's store once the damp old boot is turned in, so the _decision_ must precede the
  turn-in. Whether to buy is tier/plan policy: it costs sand dollars and carries a −item
  penalty, and it only earns its keep if the lasso-training outfit actually needs back-slot
  breathing to free hat+pants (sea cowboy hat + sea chaps are +2 lasso progress/toss) _and_
  no cheaper breather covers it — Asdon Driving Waterproofly (high shiny), a pulled Elf Guard
  SCUBA tank (softcore, penalty-free), or Mer-kin mask outfits. The Old Guy task evaluates
  the policy, then turns in the boot.
- **Mining**: spend no real turns if avoidable — the five daily Unaccompanied Miner picks are
  free, the lodestone pull replaces ~5 of them, minin' dynamite saves one more; whether the
  pull beats the free picks is tier pull-budget policy. Square selection from `mineState3`
  prefers rows 4–6 (teflon ore never drops in rows 1–2, rarely 3). Never `grandpa mine` — the
  marine aquamarine sparkle square dilutes teflon odds permanently.
- **Ators Gonna Ate** (gymnasium NC): a mechanics anomaly to respect _if_ the runplan hunts it —
  it appears to respond to combat-rate _increasers_, and a pending NC forcer is believed to
  suppress it (a known 176-wasted-turn trap). Encoded as task invariants (assert no NC force
  pending; don't run −combat for it), while whether the NC is worth hunting at all is a
  routing question settled in planning against its actual payout.
- **Yog-Urt prep**: with three prayerbeads equipped, surviving ~2 rounds clears More Like a
  Suckrament — sea gel + healscroll + waterlogged scroll suffice. For the max-HP ≤311 guard,
  a deliberate Deep Dark Visions beat-down is _available_ — near-free only when DDV is being
  cast anyway (it's the dreadScroll3 source) and the Beaten Up debuff won't taint upcoming
  fights; otherwise the ash's burn-turns-elsewhere wait (which spends the turns on real route
  work) remains the default. Choose per net cost at planning time.
- **Shub-Jigguwatt weakens with each loss** — so a lost fight is a recovery path, not an abort.
  The plan still optimizes to win on the first attempt (each loss costs a turn plus re-prep);
  the retry ladder replaces the ash's abort-with-essay as the failure mode, it does not
  replace prep. Delevel stock in-run: crayon shavings (4+ suffices), table tennis ball
  (Leprecondo), Mer-kin mouthsoap, spare lasso/cowbell; a Comic Violence wish removes miss
  chance at a wish's opportunity cost (tier policy).
- **Sneakmask/hidepaint are exempt from the −combat cap** — mechanic fact making them
  unusually strong for outpost/grandpa NC hunting. Acquiring them (pull, wish, or farm) is
  priced per tier policy like any other resource, not assumed.
- **Nautical Seaceress is a plain high-stats fight** (no gimmicks); Wet Crap For Sale stat
  buffs are the in-path lever.
- **Softcore pull exceptions** (still pullable post-nerf, complements mafia's blocklist):
  shark jumper, scale-mail underwear, sea lasso, sea cowbell, Mer-kin knucklebone / wordquiz /
  cheatsheet / prayerbeads.
- **Monodent synergies** worth encoding: Talk to Some Fish halves lasso training (throw the
  lasso both before _and_ after casting); BCZ Refracted Gaze pairs with Talk to Some Fish so
  the current monster's drops aren't lost.

## Flagged items

1. **README/code discrepancy in the ash**: README says high shiny requires an Asdon workshed;
   `highShiny()` (UnderTheSea.ash:171-176) only checks `garbo_valueOfFreeFight >
valueOfAdventure`. We ship the code's rule and document it.
2. **Colosseum telegraphs** (resolved 2026-08-11): mafia's `FightDecorator`/`RelayRequest`/
   `QuestManager` sources document the deterministic opponent schedule, telegraph keywords, and
   counter skills — the common path needs no mid-round refetch. Only the fallback stall regime
   (counter gear not in hand) retains ash-style behavior; verify it on a live run only if that
   fallback is ever exercised.
3. **seedfinder algorithm** must be ported from source (VeeArrKoL/seedfinder), not from memory —
   an implementation-planning task.
4. Game facts throughout implementation follow pearlo's CLAUDE.md rule: verify against
   `kolmafia`/`libram` typings and the wiki API; never guess names or mechanics.

## Testing / validation

- No unit-testable mafia runtime; correctness comes from: `yarn check` (tsc), `yarn lint`
  (eslint-plugin-libram validates all `$item`/`$effect`/… names), and **incremental live runs**
  on the user's account as phases land, using `actions=N`, `list`, and re-entrancy.
- Pure logic that _can_ be tested without mafia (dreadscroll seed math, Shub delevel factors,
  pull bookkeeping) should be written mafia-free so it can get real unit tests later if wanted.
