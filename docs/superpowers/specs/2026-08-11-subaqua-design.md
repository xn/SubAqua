# SubAqua design — TypeScript re-implementation of UnderTheSea

**Date:** 2026-08-11
**Status:** approved pending user review
**Reference material:** `../UnderTheSea` (ash source of truth), `../pearlo` (domain docs:
`CLAUDE.md`, `docs/sea-reference.md`, `docs/consumption-reference.md`, `docs/maximizer-reference.md`)

## What SubAqua is

A **one-shot speedrun script for the 11,037 Leagues Under the Sea challenge path** (path id 55),
written in TypeScript on grimoire-kolmafia/libram, for **public release**. It runs the path from
initialization through the Nautical Sorceress with minimal resource waste. It is *not* a loop
manager: no aftercore mode, no postloop pearl farming, no eagle-screech cleanup, no codpiece prep.

### Scope decisions (user, 2026-08-11)

- **Full parity** with UnderTheSea.ash's in-path route, **except**:
  - `sim` stays a bare checklist (owned IOTMs/skills/familiars + Hagnk's pulls, tier verdict).
  - Postloop reduces to a single optional `postloopCommand=` arg (`cliExecute` after the finale).
    The postloop *mode* and its features (eagle screech run-out, pearl farming, codpiece prep) are dropped.
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
These modules encode *this route's* priorities; libram owns the mechanics.

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
  gating (preserving the intentional `>=` at the skate-park site).

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

- **Bladeswitcher/Ringogeorge reflect** (library, gymnasium, colosseum): port
  `reflectImminent()` — re-fetch `fight.php`, match "twirling his blade" / "an especially dope
  move", stall regime (sea gel when HP < 50% / pungent unguent / attack; every stall branch must
  advance the round; free delevelers banned in stalls; re-arm cap preserved). The secondary
  \>400-damage-spike signature carries over.
- **Colosseum**: gladiators instakill-immune — all instakills skipped except Club 'Em Back in
  Time; saber never equipped there.
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

**`lib/dreadscroll.ts`** owns the spading pipeline:

- Native reimplementation of seedfinder's seed-space algorithm (source to be read exactly during
  implementation planning): `candidateSeeds()` filtered against all known clues.
- Engine `post()` narrowing hook: exactly one candidate remaining → write all eight
  `dreadScroll<n>` prefs (ash `dreadSeedCheck()`).
- `isKnucklebonesAndSushiEnough()` gates the long cheatsheet/vocabulary route vs the short branch.
- Choice 703 uses the salvaged expected-wrong-positions constraint solver (strictly better than
  the ash's first-unguessed-candidate).
- Card-catalog 704 spading and combat scroll-hint verification (clues 2/5) write into the same
  clue store (namespaced prefs replacing `cardChoice1..10` / `DS1/6/8`).
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
verdict. No purchases, turns, or server writes.

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

## Flagged items

1. **README/code discrepancy in the ash**: README says high shiny requires an Asdon workshed;
   `highShiny()` (UnderTheSea.ash:171-176) only checks `garbo_valueOfFreeFight >
   valueOfAdventure`. We ship the code's rule and document it.
2. **Mid-round `visitUrl("fight.php")` refetch** (reflect detection) is expected to behave
   identically from a JS filter callback but must be verified on the first live colosseum run.
3. **seedfinder algorithm** must be ported from source (VeeArrKoL/seedfinder), not from memory —
   an implementation-planning task.
4. Game facts throughout implementation follow pearlo's CLAUDE.md rule: verify against
   `kolmafia`/`libram` typings and the wiki API; never guess names or mechanics.

## Testing / validation

- No unit-testable mafia runtime; correctness comes from: `yarn check` (tsc), `yarn lint`
  (eslint-plugin-libram validates all `$item`/`$effect`/… names), and **incremental live runs**
  on the user's account as phases land, using `actions=N`, `list`, and re-entrancy.
- Pure logic that *can* be tested without mafia (dreadscroll seed math, Shub delevel factors,
  pull bookkeeping) should be written mafia-free so it can get real unit tests later if wanted.
