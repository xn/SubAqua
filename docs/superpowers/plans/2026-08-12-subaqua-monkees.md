# SubAqua Phase 3: Sea Monkee Quest Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the ash `seaMonkees()` spine into grimoire task files (`tasks/monkees/*`), plus the §2 infrastructure it needs to run: init dailies (`tasks/init.ts`), the Fishy/diet ladder, engine per-turn duties (poison cure, dolphin whistle, junk autosell, emergency pilsner), the outpost stashbox choice protocol, and per-tier `buildRunplan()` composition — so the phase ends runnable and incrementally testable with `subaqua list` / `actions=N`.

**Architecture:** Per `docs/superpowers/specs/2026-08-11-subaqua-design.md` §1–§3, §5–§6, §8–§9. Tasks re-derive all state from mafia (`questS02Monkees` ladder, `merkinLockkeyMonster`, `corralUnlocked`, `seahorseName`, `lassoTrainingCount`, `momSeaMonkeeProgress`); tier logic lives only in `runplans.ts` composition and `ResourcePolicy` fields; combat actions resolve through the Phase 2 `resources/` ladders via `customize()`. Ash facts were extracted from `../UnderTheSea/scripts/` (UnderTheSea.ash = UTS, iotm.ash = IOTM, UnderTheSeaCCS.ash = CCS, UnderTheSea_Choice.ash = CH) and cross-checked against the `../kolmafia` checkout (old layout: `src/net/sourceforge/kolmafia/...`) on 2026-08-12; line references are cited throughout so reviewers can spot-check.

**Tech Stack:** TypeScript on grimoire-kolmafia 0.3.33 / libram 0.11.23 / kolmafia typings, rollup (three CJS bundles), yarn 4.

## Global Constraints

- Runs inside KoLmafia's Rhino JS runtime — no Node APIs; `kolmafia` stays `external` in rollup.
- Script-owned prefs use `subaqua_` (persistent) / `_subaqua_` (daily) namespaces. New prefs this phase: `_subaqua_stashbox_checked` (choice bundle only), `_subaqua_pearls_checked`, `_subaqua_gear_pulled`. The Phase 1 pref `_subaqua_outpost_choices` is **retired** (Task 3/4).
- `$item`/`$effect`/`$skill`/`$location`/`$monster` template constants must be **module-level** (eslint-plugin-libram). Names below were pre-verified against `../kolmafia/src/data/*.txt` on 2026-08-12 (e.g. `really, really nice swimming trunks`, `rusty broken diving helmet`, `rusty porthole`, `toy Cupid bow`, `Black Crayon Golem`, `The Eternity Codpiece`). `yarn lint` is the authority; if it rejects a name, find the real one in the data files and report the correction — never guess.
- **No `user_confirm`/blocking dialogs**; aborts carry instructions.
- **No adventuring from engine hooks.** `post()` may drink/uneffect/autosell and may resolve a dolphin-whistle fight (spec §2 assigns the whistle to `post()`); all real adventuring happens in task `do`.
- Every adventuring task has a `limit` (type-enforced) and every degradation is explicit.
- Binding Phase 1-2 rulings honored here: choice-script-owned outpost state; equip-gated combat provides; `hasBreathingEffect()` effects-only; choice 1387 ownership resolved in Task 3; tier logic only in runplans + policy.
- Verification cycle: `yarn check && yarn lint` every task; `yarn build` additionally at Tasks 3, 4, 5, and 11. No test runner exists; nothing in the `kolmafia` package executes outside mafia.
- Commit after every task.

## File Structure (this phase)

```
src/
  lib/
    index.ts           MODIFY: + questStepOf/monkeesStep/recover/grandpaZone
    moods.ts           CREATE: sneakEffects/itemDropEffects/resEffects (+ sneakFamiliar in outfit.ts)
  resources/
    policy.ts          MODIFY: Phase 3 policy fields
    saber.ts           MODIFY: healer purpose exempt from the outpost saber ban
    fishy.ts           CREATE: maintainFishy/maintainWaterproofly/emergencyDiet
  engine/
    task.ts            MODIFY: + saberPurpose field
    outfit.ts          MODIFY: swimming trunks in breathing gear; sneakFamiliar()
    engine.ts          MODIFY: prepare() fishy hook; post() duties; forceItems purpose; 1387 ownership; drop 315
  standalone/
    choice.ts          MODIFY: stashbox protocol for 312/313/314/315
  tasks/
    init.ts            CREATE: initialization dailies
    runplans.ts        MODIFY: per-tier composition
    monkees/
      guild.ts         CREATE: sword imprint + guild unlock
      pellet.ts        CREATE: garden pellet + quest start
      bigbrother.ts    CREATE: wreck rescue + bubblin' stone
      grandpa.ts       CREATE: step4 hunt + grandpa story + golem recall
      outpost.ts       CREATE: outpost grind (grandma, lockkey, stashbox, prayerbeads)
      currents.ts      CREATE: stashbox/trailmap use + corral unlock
      helmet.ts        CREATE: Old Guy boot + diver hunt + helmet craft
      mom.ts           CREATE: mom rescue lanes + wanderer redemptions
      corral.ts        CREATE: corral farms + seahorse taming
```

**Cross-task naming contract** (spec Self-Review; later tasks must use these exact names): `questStepOf(pref): number`, `monkeesStep(): number`, `recover(hpFloor?, mpFloor?)`, `grandpaZone(): Location`, `sneakEffects(): Effect[]`, `itemDropEffects(): Effect[]`, `resEffects(): Effect[]`, `sneakFamiliar(): Familiar | undefined`, `maintainFishy()`, `maintainWaterproofly()`, `emergencyDiet()`, `Task.saberPurpose?: ForcePurpose`, and quest factories `guildTasks(opts)`, `pelletQuest()`, `bigBrotherQuest()`, `grandpaQuest(opts)`, `outpostQuest()`, `currentsQuest()`, `helmetQuest(opts)`, `momQuest(opts)`, `corralQuest(opts)`, `wandererTasks()`, `initQuest()`. Policy fields: `leprecondoLayout: number[]`, `aprilingSecond`, `catalogCredits`, `whistleOutpostDrops`, `fishyPullMeal`.

**Route facts locked by research** (differences from spec shorthand, all source-verified):

1. The **old SCUBA tank is not purchasable**: it has no row in Big Brother's store data (`coinmasters.txt:156-171`; `BigBrotherRequest.java` models 16 rows, no tank). The spec §9 "buy before boot turn-in" decision point is dead; the ash itself always takes reward 6313 (damp old wallet, UTS:1392-1401). Old Guy = wallet, full stop.
2. The path's default breathing gear is **`really, really nice swimming trunks`** (pants; ash `swimmingTrunks()` UTS:74-84) — absent from Phase 1's `waterBreathingEquipment`. Task 1 fixes this.
3. The ash has **no `maintainFishy()`**; Fishy is restored-at-zero in `post_adv` (UTS:811-843). Our port runs the ladder from `engine.prepare()` before each underwater adventuring task (never from `post()`).
4. Mafia's `questS02Monkees` triggers (QuestManager.java:1427-1545, ChoiceControl.java:5019-5042, ResultProcessor.java:1854-1877): step2 = choice 299 option 1; step3 = acquire bubblin' stone; step5 = class NC choices 302/303/306/307/308; step6 = `grandpa` story; step7/8 = Grandma's Note / Grandma's Map; step9 = outpost "Phew, that was a close one"; step12 = acquire black glass.
5. Choices 313/314/315 are untracked by mafia (ChoiceAdventures.java:2174-2177); search orders per lockkey monster are burglar 1→3→2, raider 1→2→3, healer 3→1→2 (CH:61-79), with a post-currents shopping branch on 315.

---

### Task 1: Groundwork — policy fields, lib helpers, moods, breathing/saber fixes

**Files:**

- Modify: `src/resources/policy.ts`, `src/resources/saber.ts`, `src/engine/task.ts`, `src/engine/outfit.ts`, `src/lib/index.ts`
- Create: `src/lib/moods.ts`

**Interfaces:**

- Consumes: `Tier` (lib/tier), existing `ResourcePolicy`, `ForcePurpose` (resources/saber).
- Produces: policy fields `leprecondoLayout`, `aprilingSecond`, `catalogCredits`, `whistleOutpostDrops`, `fishyPullMeal`; `questStepOf(pref)`, `monkeesStep()`, `recover(hpFloor?, mpFloor?)`, `grandpaZone()`; `sneakEffects()`, `itemDropEffects()`, `resEffects()`; `sneakFamiliar()`; `Task.saberPurpose`; healer-exempt `forceGranted`.

- [ ] **Step 1: Extend `src/resources/policy.ts`** — replace the `ResourcePolicy` type and the `policies` record with:

```ts
export type ResourcePolicy = {
  /** High shiny spends only darts plus the parka yellow-ray on free kills and
   * banks everything else for aftercore (ash CCS free_kill():7,
   * UnderTheSea.ash freeKill():240-244). */
  freeKillMode: "dartsOnly" | "full";
  /** Club 'Em Back in Time (Colosseum-only chip damage): disabled at low
   * shiny (CCS free_kill():37); high never reaches it via dartsOnly. */
  allowClubEmBackInTime: boolean;
  /** Discretionary (non-reserved) pulls: low shiny farms instead of pulling
   * (UnderTheSea.ash:1738/1746/2937). */
  allowDiscretionaryPulls: boolean;
  /** Leprecondo furniture priority by KoL furniture id (ash UTS:1062-1067);
   * the init task installs the first four discovered. */
  leprecondoLayout: number[];
  /** Second Apriling section after the always-joined tuba (UTS:1076-1084);
   * piccolo is only joined when the Chest Mimic is owned (checked in-task). */
  aprilingSecond: "quad tom" | "piccolo";
  /** 2002 Mr. Store credit spending (UTS:1093-1102): high banks free fights
   * as 3 VHS tapes; others trade one for the pro skateboard (corral McTwist). */
  catalogCredits: "vhs3" | "skateboard+vhs2";
  /** Immediately dolphin-whistle back stolen outpost drops (prayerbeads,
   * rusty rivet) — ash gates this on lowShiny (UTS:761-762); richer kits
   * re-farm faster than they whistle. Corral drops are always whistled. */
  whistleOutpostDrops: boolean;
  /** Fishy pull-meal (cheapest pasta + Aldebaran sardines, UTS:816-829):
   * ash gate is highShiny() || (lowShiny() && not pulled today) — mid falls
   * through to the fish-sauce chew. */
  fishyPullMeal: boolean;
};

/** Leprecondo priorities, ash UTS:1062-1067 (ids are KoL furniture ids;
 * libram FURNITURE_PIECES maps id -> name). */
const leprecondoHigh = [10, 11, 12, 24, 4, 5, 6];
const leprecondoStd = [22, 24, 12, 11, 10, 4, 5, 6];

const policies: Record<Tier, ResourcePolicy> = {
  low: {
    freeKillMode: "full",
    allowClubEmBackInTime: false,
    allowDiscretionaryPulls: false,
    leprecondoLayout: leprecondoStd,
    aprilingSecond: "piccolo",
    catalogCredits: "skateboard+vhs2",
    whistleOutpostDrops: true,
    fishyPullMeal: true,
  },
  mid: {
    freeKillMode: "full",
    allowClubEmBackInTime: true,
    allowDiscretionaryPulls: true,
    leprecondoLayout: leprecondoStd,
    aprilingSecond: "piccolo",
    catalogCredits: "skateboard+vhs2",
    whistleOutpostDrops: false,
    fishyPullMeal: false,
  },
  high: {
    freeKillMode: "dartsOnly",
    allowClubEmBackInTime: false,
    allowDiscretionaryPulls: true,
    leprecondoLayout: leprecondoHigh,
    aprilingSecond: "quad tom",
    catalogCredits: "vhs3",
    whistleOutpostDrops: false,
    fishyPullMeal: true,
  },
};
```

(Keep `policyForTier`/`currentPolicy` unchanged.)

- [ ] **Step 2: Append quest/recovery helpers to `src/lib/index.ts`**

Add `myMaxhp, myMaxmp, myHp, myMp, myPrimestat, restoreHp, restoreMp, Location, Stat` to the `kolmafia` import and `$location, $stat` to the `libram` import as needed, then append:

```ts
/** Quest pref -> comparable number: unstarted=-1, started=0, stepN=N, finished=999. */
export function questStepOf(pref: string): number {
  const value = get(pref, "unstarted");
  if (value === "unstarted") return -1;
  if (value === "started") return 0;
  if (value === "finished") return 999;
  if (value.startsWith("step")) return parseInt(value.slice(4));
  return -1;
}

export function monkeesStep(): number {
  return questStepOf("questS02Monkees");
}

/** Spec §2 recovery model: explicit absolute floors in task prepare
 * (570 HP / 250 MP baseline, ash setRecoveryTargets UTS:729-747). */
export function recover(hpFloor = 570, mpFloor = 250): void {
  if (myHp() < Math.min(hpFloor, myMaxhp())) restoreHp(Math.min(hpFloor, myMaxhp()));
  if (myMp() < Math.min(mpFloor, myMaxmp())) restoreMp(Math.min(mpFloor, myMaxmp()));
}

const grandpaZones: Map<Stat, Location> = new Map([
  [$stat`Muscle`, $location`Anemone Mine`],
  [$stat`Mysticality`, $location`The Marinara Trench`],
  [$stat`Moxie`, $location`The Dive Bar`],
]);

/** The whole per-class Grandpa/pearl zone decision (ash pearlLoc UTS:27-31).
 * Evaluated lazily — the old repo's module-level myPrimestat() was a defect. */
export function grandpaZone(): Location {
  return grandpaZones.get(myPrimestat()) ?? $location`Anemone Mine`;
}
```

- [ ] **Step 3: Write `src/lib/moods.ts`**

```ts
import { haveEquipped, myClass } from "kolmafia";
import { $class, $effect, $effects, $item, $skill, get, have } from "libram";

/**
 * Ports the ash mood() regimes (UTS:392-499) as castable-effect lists for
 * grimoire's task.effects (the engine acquireEffects each via ensureEffect).
 * Only effects whose source the account owns are returned — an effect we
 * cannot obtain would make ensureEffect abort.
 */

/** "-combat" mood (UTS:466-486 subset that is skill/equipment castable). */
export function sneakEffects(): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`The Sonata of Sneakiness`)) effects.push($effect`The Sonata of Sneakiness`);
  if (have($skill`Smooth Movement`)) effects.push($effect`Smooth Movements`);
  if (have($skill`Feel Lonely`) && get("_feelLonelyUsed") < 3)
    effects.push($effect`Feeling Lonely`);
  return effects;
}

/** "itdrop" mood subset (UTS:392-440): AT songs and self-buffs only. */
export function itemDropEffects(): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`Fat Leon's Phat Loot Lyric`)) effects.push($effect`Fat Leon's Phat Loot Lyric`);
  if (have($skill`Singer's Faithful Ocelot`)) effects.push($effect`Singer's Faithful Ocelot`);
  if (have($skill`The Polka of Plenty`)) effects.push($effect`The Polka of Plenty`);
  if (have($skill`Donho's Bubbly Ballad`)) effects.push($effect`Donho's Bubbly Ballad`);
  if (have($skill`Leash of Linguini`)) effects.push($effect`Leash of Linguini`);
  if (have($skill`Empathy of the Newt`)) effects.push($effect`Empathy`);
  return effects;
}

/** Elemental-resistance mood for the pearl zones (UTS:466-486): the generic
 * multi-element buffs; per-element gear comes from the task maximizer string. */
export function resEffects(): Effect[] {
  const effects: Effect[] = [];
  if (have($skill`Astral Shell`)) effects.push($effect`Astral Shell`);
  if (have($skill`Elemental Saucesphere`)) effects.push($effect`Elemental Saucesphere`);
  return effects;
}
```

Import `Effect` from `"kolmafia"`. If lint flags unused imports (`haveEquipped`, `myClass`, `$class`, `$effects`, `$item`), remove them — the list above is the source of truth. If lint rejects an effect/skill pairing (e.g. `Empathy` vs `Empathy of the Newt`), fix per `../kolmafia/src/data/statuseffects.txt` / `classskills.txt` and report.

- [ ] **Step 4: Fix breathing gear + add sneak familiar in `src/engine/outfit.ts`**

Replace the `waterBreathingEquipment` line with:

```ts
/** Path 55's default breather is the pants slot — really, really nice swimming
 * trunks (ash swimmingTrunks() UTS:74-84) — leaving hat/back free. Trunks lead
 * the list; the hat/back pieces matter while lasso-training pins the pants. */
export const waterBreathingEquipment = $items`really, really nice swimming trunks, The Crown of Ed the Undying, aerated diving helmet, crappy Mer-kin mask, Mer-kin gladiator mask, Mer-kin scholar mask, old SCUBA tank, Elf Guard SCUBA tank`;
```

`preferredBreathingGear()` already prepends the SCUBA tanks while lasso-training; with trunks now in the base list the training case resolves to tank-or-mask first and trunks last. Change the `scubaTanks` constant to also exclude trunks from the training list:

```ts
const scubaTanks = $items`old SCUBA tank, Elf Guard SCUBA tank`;
const trainingBlockedGear = $items`really, really nice swimming trunks`;

export function preferredBreathingGear(): Item[] {
  const gear = isTrainingLasso()
    ? [...scubaTanks, ...waterBreathingEquipment.filter((it) => !trainingBlockedGear.includes(it))]
    : [...waterBreathingEquipment];
  return gear.filter((item, idx, arr) => arr.indexOf(item) === idx);
}
```

Append to the same file:

```ts
/** Ash use_familiar("-combat") (UTS:349-355): Peace Turkey else Disgeist. */
export function sneakFamiliar(): Familiar | undefined {
  if (have($familiar`Peace Turkey`)) return $familiar`Peace Turkey`;
  if (have($familiar`Disgeist`)) return $familiar`Disgeist`;
  return undefined;
}
```

- [ ] **Step 5: Add `saberPurpose` to `src/engine/task.ts`**

```ts
import { Quest as BaseQuest, Task as BaseTask, Limit } from "grimoire-kolmafia";
import { CombatStrategy as BaseCombatStrategy } from "grimoire-kolmafia";
import { Monster } from "kolmafia";

import { ForcePurpose } from "../resources/saber";

import { CombatActions, CombatStrategy } from "./combat";

export type Quest = BaseQuest<Task>;

export type Task = {
  combat?: CombatStrategy | BaseCombatStrategy<CombatActions>;

  // Control safeguards
  limit: Limit;
  peridot?: Monster | (() => Monster | undefined); // Peridot of Peril target, if possible
  underwater?: boolean; // force breathing enforcement for function-`do` tasks
  freeaction?: boolean | (() => boolean);
  /** Which saber-Force reservation a forceItems action draws from (default
   * "free"). "diver"/"healer" also flip the resolution to saber-before-ray —
   * their Forces guarantee specific quest drops (iotm.ash:185-199, 247-261). */
  saberPurpose?: ForcePurpose;
} & BaseTask<CombatActions>;
```

- [ ] **Step 6: Healer exemption in `src/resources/saber.ts`** — replace the `forceGranted` location guard line:

```ts
export function forceGranted(purpose: ForcePurpose, location?: Location): boolean {
  // The outpost saber ban protects turns_spent-gated progress from zero-turn
  // Forces — but the healer Force is the ash's deliberate exception: its own
  // gate is beads-only (iotm.ash healerForce():247-261, no zone test) and
  // farmPrayerbeads pins the saber at the outpost (UTS:1684-1699).
  if (location && purpose !== "healer" && !saberAllowedAt(location)) return false;
  switch (purpose) {
```

(The rest of the switch is unchanged; delete the old `if (location && !saberAllowedAt(location)) return false;` line.)

- [ ] **Step 7: Verify** — Run: `yarn check && yarn lint` — Expected: pass. Watch for: `Feel Lonely` daily pref name (`_feelLonelyUsed` — if lint rejects, find the real pref in libram's propertyTypes and report), effect names in Step 3.

- [ ] **Step 8: Commit**

```bash
git add src/resources/policy.ts src/resources/saber.ts src/engine/task.ts src/engine/outfit.ts src/lib
git commit -m "feat: phase-3 groundwork — policy fields, quest helpers, moods, trunks breathing, healer saber exemption"
```

---

### Task 2: Fishy, Waterproofly, and emergency diet (`src/resources/fishy.ts`)

**Files:**

- Create: `src/resources/fishy.ts`

**Interfaces:**

- Consumes: `pullSequence`/`pulledToday` (resources/pulls), `currentPolicy` (resources/policy), `debug` (lib).
- Produces: `maintainFishy()`, `maintainWaterproofly()`, `emergencyDiet()`.

- [ ] **Step 1: Write `src/resources/fishy.ts`**

```ts
import {
  abort,
  availableAmount,
  chew,
  cliExecute,
  drink,
  fullnessLimit,
  getFuel,
  getWorkshed,
  Item,
  mallPrice,
  myAdventures,
  myFullness,
  myInebriety,
  mySpleenUse,
  spleenLimit,
  storageAmount,
  use,
  useSkill,
} from "kolmafia";
import { $effect, $item, $items, $skill, AsdonMartin, get, have } from "libram";

import { debug } from "../lib";

import { currentPolicy } from "./policy";
import { pullSequence } from "./pulls";

const fishy = $effect`Fishy`;

/** The nine mall pastas the ash price-scans for the Fishy meal (UTS:32-35,
 * 817-825). Pre-verified against items.txt; lint is the authority. */
const fishyPastas = $items`Frutti di Scatoletta, Pesto alla Marziano, Arrattabbattabiata, Orzo di Riso, Pasta Grimavera, Linguini Ubriacapa, Gnocci Domani, Formica e Pepe, Tubetto Gelatto`;

const nigiris: [Item, Item][] = [
  [$item`beefy nigiri`, $item`beefy fish meat`],
  [$item`glistening nigiri`, $item`glistening fish meat`],
  [$item`slick nigiri`, $item`slick fish meat`],
];

/** Ash eatSushi() (UTS:650-662): first nigiri whose fish meat is on hand.
 * Sushi is made-and-eaten in one step off the rolling mat; mafia's `eat`
 * command knows sushi names. Returns true if a sushi was eaten. */
function eatSushi(): boolean {
  if (!get("hasSushiMat")) return false;
  cliExecute("refresh inventory");
  for (const [sushi, meat] of nigiris) {
    if (availableAmount(meat) > 0 && availableAmount($item`white rice`) > 0) {
      cliExecute(`eat 1 ${sushi.name}`);
      if (have(fishy)) return true;
    }
  }
  return false;
}

/**
 * The in-run Fishy ladder (ash post_adv UTS:811-843), called from
 * engine.prepare() before every underwater adventuring task. Restore-at-zero,
 * like the ash: underwater turns cost 2 without Fishy
 * (AdventureRequest.getAdventuresUsed, AdventureRequest.java:1294-1295).
 *
 * Deviation from ash, documented: the fishy pipe rung drops the ash's
 * high-kit gate (payphone+Monodent+PYEC, UTS:812) — the pipe is a zero-turn
 * +10 Fishy daily with no competing in-run use, so the net-turn principle
 * (spec §9) says spend it first on every account that owns one.
 */
export function maintainFishy(): void {
  if (have(fishy)) return;

  // Rung 1: fishy pipe — zero turns, +10 Fishy, 1/day.
  if (!get("_fishyPipeUsed") && (have($item`fishy pipe`) || storageAmount($item`fishy pipe`) > 0)) {
    if (!have($item`fishy pipe`)) pullSequence($item`fishy pipe`);
    if (have($item`fishy pipe`)) use($item`fishy pipe`);
    if (have(fishy)) return;
  }

  // Rung 2: pull-meal — cheapest pasta + Aldebaran sardines (UTS:816-829).
  // Policy-gated (high/low yes, mid no); pullSequence's pulled-today
  // bookkeeping enforces once per day.
  if (currentPolicy().fishyPullMeal && fullnessLimit() - myFullness() >= 4) {
    const pasta = fishyPastas.reduce((a, b) => (mallPrice(a) <= mallPrice(b) ? a : b));
    if (availableAmount(pasta) > 0 || pullSequence(pasta)) cliExecute(`eat 1 ${pasta.name}`);
    if (availableAmount($item`Aldebaran sardines`) > 0 || pullSequence($item`Aldebaran sardines`)) {
      cliExecute(`eat 1 Aldebaran sardines`);
    }
    if (have(fishy)) return;
  }

  // Rung 3: fish sauce chew (spleen; UTS:830-832).
  if (mySpleenUse() < spleenLimit()) {
    if (availableAmount($item`fish sauce`) > 0 || pullSequence($item`fish sauce`)) {
      chew(1, $item`fish sauce`);
    }
    if (have(fishy)) return;
  }

  // Rung 4: sea sushi off the rolling mat (UTS:838-840). The ash's
  // worktea-sushi variant (dreadscroll clue 7, UTS:833-837) is Phase 4's
  // dreadscroll concern — see the deferrals list.
  cliExecute("acquire 1 white rice");
  if (eatSushi()) return;

  abort(
    "Could not acquire Fishy (pipe, pull-meal, fish sauce, and sushi all failed). " +
      "Get Fishy manually (fishy pipe / eat sea sushi / chew fish sauce), then rerun.",
  );
}

/**
 * Asdon Driving Waterproofly upkeep (ash post_adv UTS:799-809): effect-based
 * breathing that frees every gear slot. Only relevant when the Asdon is the
 * workshed. Fuel comes from the ash's dedicated pull ("pie man was not meant
 * to eat", one pull = ~100 fuel); we never mall-fuel in-run.
 */
export function maintainWaterproofly(): void {
  if (!AsdonMartin.installed()) return;
  if (have($effect`Driving Waterproofly`)) return;
  if (getFuel() < 37) {
    const pie = $item`pie man was not meant to eat`;
    if (availableAmount(pie) === 0) pullSequence(pie);
    if (availableAmount(pie) > 0) AsdonMartin.insertFuel(pie, 1);
  }
  if (getFuel() >= 37) cliExecute("asdonmartin drive Waterproofly");
}

/**
 * Ash's path-55 zero-adventure diet (post_adv UTS:781-796): crack the astral
 * six-pack, shrug Donho's for the Ode slot, Ode to Booze, drink a pilsner.
 * Called from engine post(); aborts with the ash's message when dry.
 */
export function emergencyDiet(): void {
  if (myAdventures() > 0) return;
  if (availableAmount($item`astral pilsner`) === 0 && availableAmount($item`astral six-pack`) > 0) {
    use($item`astral six-pack`);
  }
  if (availableAmount($item`astral pilsner`) === 0) {
    abort(
      "Out of adventures and no more easy diet (astral pilsners exhausted). Eat/drink manually, then rerun.",
    );
  }
  if (myInebriety() >= 14) {
    abort("Out of adventures and too drunk for another pilsner. Handle diet manually, then rerun.");
  }
  if (have($effect`Donho's Bubbly Ballad`)) cliExecute("shrug Donho's Bubbly Ballad");
  if (have($skill`The Ode to Booze`)) useSkill($skill`The Ode to Booze`);
  drink(1, $item`astral pilsner`);
}
```

Notes for the implementer: `getFuel()` is the kolmafia Asdon fuel read; if tsc rejects it, the real name is in `node_modules/kolmafia/index.d.ts` (search "fuel") — report what you find. `hasSushiMat` is a typed libram pref. Trim any import the final file does not use (`debug`, `getWorkshed`, `Item` if the nigiri tuple changes shape).

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass. If lint corrects pasta names, accept the game data and report each one.

- [ ] **Step 3: Commit**

```bash
git add src/resources/fishy.ts && git commit -m "feat: fishy ladder, waterproofly upkeep, emergency pilsner diet"
```

---

### Task 3: Engine per-turn duties and Force-purpose resolution

**Files:**

- Modify: `src/engine/engine.ts`

**Interfaces:**

- Consumes: `maintainFishy`/`maintainWaterproofly`/`emergencyDiet` (Task 2), `currentPolicy` (policy), `forceGranted` + `ForcePurpose` (saber, Task 1), `killMacro` (engine/combat), `Task.saberPurpose` (Task 1).
- Produces: `prepare()` fishy hook; `post()` duties (poison, whistle, junk, diet); global choice 1387 ownership; retired `_subaqua_outpost_choices`.

- [ ] **Step 1: `prepare()` override** — add to `SubAquaEngine` (after the `customize` method), and add `maintainFishy, maintainWaterproofly` to imports from `"../resources/fishy"`:

```ts
override prepare(task: Task): void {
  // Fishy/Waterproofly upkeep before every underwater adventuring turn
  // (spec §2; ash restores at zero in post_adv UTS:811-843). Never from
  // post() — the ladder may eat, chew, or pull.
  if (isUnderwaterTask(task) && !undelay(task.freeaction)) {
    maintainWaterproofly();
    maintainFishy();
  }
  super.prepare(task);
}
```

- [ ] **Step 2: `post()` duties** — replace the existing `post` method body with:

```ts
override post(task: Task): void {
  super.post(task);
  if (have($effect`Beaten Up`)) {
    // Shub's encounter name — losing to him is a sanctioned retry path (spec §9).
    const shubLoss = get("lastEncounter").includes(
      "Sssshhsssblllrrggghsssssggggrrgglsssshhssslblgl",
    );
    if (get("_lastCombatLost") && !shubLoss) throw `Lost a combat during ${task.name}; stopping.`;
    uneffect($effect`Beaten Up`);
  }

  // Poison cure — the ash handles exactly one tier (UTS:763-764).
  if (have($effect`Really Quite Poisoned`)) uneffect($effect`Really Quite Poisoned`);

  // Junk autosell: emergency meat only (UTS:773-777) — rough scales feed the
  // Madness Reef pristine conversion, so never sell above the meat floor.
  if (myMeat() < 300) {
    autosell(itemAmount($item`dull fish scale`), $item`dull fish scale`);
    autosell(itemAmount($item`rough fish scale`), $item`rough fish scale`);
  }

  // Dolphin whistle: reclaim stolen quest drops (UTS:761-762 + the targeted
  // sites UTS:2265/2282/2290/3010/3017, folded into one list). Corral drops
  // always; outpost drops per policy. Daily uses = seaPoints
  // (dailylimits.txt:361). Spec §2 assigns the whistle fight to post().
  const stolen = get("dolphinItem");
  const alwaysWhistle = $items`sea lasso, sea leather, sea cowbell`;
  const outpostWhistle = $items`Mer-kin prayerbeads, rusty rivet`;
  if (
    have($item`durable dolphin whistle`) &&
    get("_durableDolphinWhistleUsed", 0) < get("seaPoints", 0) &&
    (alwaysWhistle.includes(stolen) ||
      (currentPolicy().whistleOutpostDrops && outpostWhistle.includes(stolen)))
  ) {
    withMacro(killMacro(false), () => {
      use($item`durable dolphin whistle`);
      runCombat();
    });
  }

  // Zero-adventure pilsner diet (UTS:781-796); aborts with instructions when dry.
  emergencyDiet();
}
```

Add to imports: `autosell, itemAmount, myMeat, runCombat, use` from `"kolmafia"`; `withMacro` from `"libram"`; `killMacro` from `"./combat"`; `currentPolicy` from `"../resources/policy"`; `emergencyDiet` from `"../resources/fishy"` (merge with Step 1's import).

- [ ] **Step 3: Choice 1387 ownership + retire the 315 rotation** — in `setChoices`, delete these lines (and their comment block):

```ts
manager.setChoices({ 315: (get("_subaqua_outpost_choices", 0) % 3) + 1 });
```

In `initPropertiesManager`, after `super.initPropertiesManager(manager);`, add:

```ts
// Choice 1387 (Use the Force) is globally option 3 — "drop your things" —
// for the whole run, exactly like the ash (UTS:3695). This single value
// resolves the Phase-2 flagged collision: customize()'s forceItems branch
// and summon()'s stranded-choice handler re-assert the same value, so no
// site can fight another. Every saber Force in this route is a drop-force.
manager.setChoices({ 1387: 3 });
```

- [ ] **Step 4: Purpose-aware forceItems resolution** — replace the whole `if (combat.can("yellowRay") || combat.can("forceItems")) { ... }` block in `customize()` with:

```ts
if (combat.can("yellowRay") || combat.can("forceItems")) {
  const action = combat.can("yellowRay") ? "yellowRay" : "forceItems";
  const purpose = task.saberPurpose ?? "free";
  // Diver/healer Forces guarantee specific quest drops (4 rivets + porthole
  // + helmet, iotm:185-199; prayerbeads + thingpouch, iotm:247-261), so for
  // those purposes the saber outranks the parka ray; otherwise ray first.
  const saberFirst = purpose === "diver" || purpose === "healer";
  const provideSaber = (): boolean => {
    if (action !== "forceItems") return false;
    if (!forceGranted(purpose, location)) return false;
    // Only provide if the saber actually equipped (equip-gated provides).
    if (!outfit.equip($item`Fourth of May Cosplay Saber`)) return false;
    this.propertyManager.setChoice(1387, 3);
    resources.provide("forceItems", { do: Macro.trySkill($skill`Use the Force`) });
    return true;
  };
  const provideRay = (): boolean => {
    const ray = selectYellowRay();
    if (!ray) return false;
    if (ray.equip !== undefined && !equipResource(outfit, ray.equip)) return false;
    resources.provide(action, { do: ray.do });
    return true;
  };
  if (saberFirst) {
    if (!provideSaber()) provideRay();
  } else {
    if (!provideRay()) provideSaber();
  }
}
```

(`saberAllowedAt` moves inside `forceGranted` as of Task 1, so remove it from this file's imports if now unused.)

- [ ] **Step 5: Verify** — Run: `yarn check && yarn lint && yarn build` — Expected: pass; three bundles. If `Really Quite Poisoned` is rejected, the effect's exact casing is in `../kolmafia/src/data/statuseffects.txt` (grep "poisoned") — fix and report.

- [ ] **Step 6: Commit**

```bash
git add src/engine/engine.ts
git commit -m "feat: engine per-turn duties (poison/whistle/junk/diet), fishy prepare hook, purpose-aware forces"
```

---

### Task 4: Outpost stashbox protocol in the choice script

**Files:**

- Modify: `src/standalone/choice.ts`

**Interfaces:**

- Consumes: mafia prefs `choiceAdventure312`, `intenseCurrents`, `dreadScroll2`, `dreadScroll5`; script pref `_subaqua_stashbox_checked` (owned solely by this bundle, replacing `_subaqua_outpost_choices` per the Phase-1 ruling).
- Produces: handlers for 312/313/314/315 with the ash's per-lockkey-monster search orders.

- [ ] **Step 1: Replace the 312/315 handlers** — delete the current `choice === 312` and `choice === 315` blocks and insert (same position in the else-if chain):

```ts
else if (choice === 312) {
  // Post-currents the outpost hut becomes a shop; option 3 opens the healer
  // stock (ash CH:55-59). Otherwise mafia auto-writes choiceAdventure312
  // from the lockkey drop (ResultProcessor.java:2271-2283); 3 = healer default.
  if (get("intenseCurrents")) {
    runChoice(3);
  } else {
    const lockkeyChoice = parseInt(getProperty("choiceAdventure312") || "3");
    runChoice(lockkeyChoice >= 1 && lockkeyChoice <= 3 ? lockkeyChoice : 3);
  }
} else if (choice === 313) {
  stashboxCheck([1, 3, 2]); // burglar lockkey search order (ash CH:61)
} else if (choice === 314) {
  stashboxCheck([1, 2, 3]); // raider (CH:62)
} else if (choice === 315) {
  if (get("intenseCurrents")) {
    // Post-currents shopping (CH:63-75): beads, then dreadscroll spading
    // scrolls (mafia parses clues 2/5 from thrown heal/killscrolls), then
    // beads again — never leave the choice unanswered.
    if (availableAmount($item`Mer-kin prayerbeads`) < 3) runChoice(3);
    else if (availableAmount($item`Mer-kin killscroll`) === 0 && get("dreadScroll5", 0) === 0)
      runChoice(1);
    else if (availableAmount($item`Mer-kin healscroll`) === 0 && get("dreadScroll2", 0) === 0)
      runChoice(2);
    else runChoice(3);
  } else {
    stashboxCheck([3, 1, 2]); // healer (CH:63-79)
  }
}
```

Add above `main()`:

```ts
/**
 * Ash stashboxCheck (CH:9-20): walk the per-lockkey-monster search order,
 * answering the first hut location not yet checked today. Choices 313-315
 * have no mafia tracking (ChoiceAdventures.java:2174-2177) — the record is
 * ours alone, in _subaqua_stashbox_checked (comma-joined option list; the
 * comma-wrap test keeps exact matching). Solely owned by this bundle.
 */
function stashboxCheck(order: number[]): void {
  const checked = get("_subaqua_stashbox_checked", "");
  for (const option of order) {
    if (`,${checked},`.includes(`,${option},`)) continue;
    runChoice(option);
    set("_subaqua_stashbox_checked", checked === "" ? `${option}` : `${checked},${option}`);
    return;
  }
  // All three checked and the choice fired again: answer *something*
  // (invariant: every handler branch answers) — the outpost task aborts on
  // this state before spending another turn.
  runChoice(order[0]);
}
```

Add `availableAmount` to the `kolmafia` import and `$item` usage stays as-is (already imported).

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint && yarn build` — Expected: pass. Grep the repo for `_subaqua_outpost_choices` — the only hits must be documentation; if `src/` still references it, Task 3 missed a site (fix there, not here).

- [ ] **Step 3: Commit**

```bash
git add src/standalone/choice.ts
git commit -m "feat: outpost stashbox search protocol per lockkey monster (choices 312-315)"
```

---

### Task 5: Init dailies + runplan wiring

**Files:**

- Create: `src/tasks/init.ts`
- Modify: `src/tasks/runplans.ts`

**Interfaces:**

- Consumes: `currentPolicy` (policy), `haveAnywhere`/`debug` (lib), `pullSequence`/`discretionaryPull` (pulls), `summonsAvailable` (summon), libram `MayamCalendar`, `Leprecondo`, `AprilingBandHelmet`, `EternityCodpiece`.
- Produces: `initQuest(): Quest` — all-freeaction dailies; `buildRunplan` returns `[...getTasks([initQuest()])]` for every tier (monkee quests appended in Tasks 6-11).

- [ ] **Step 1: Write `src/tasks/init.ts`**

```ts
import {
  abort,
  availableAmount,
  buy,
  cliExecute,
  getWorkshed,
  retrieveItem,
  storageAmount,
  turnsPlayed,
  use,
  useFamiliar,
  visitUrl,
} from "kolmafia";
import {
  $coinmaster,
  $familiar,
  $item,
  $items,
  AprilingBandHelmet,
  EternityCodpiece,
  get,
  have,
  Leprecondo,
  MayamCalendar,
  set,
} from "libram";

import { Quest } from "../engine/task";
import { haveAnywhere } from "../lib";
import { currentPolicy } from "../resources/policy";
import { discretionaryPull, pullSequence } from "../resources/pulls";
import { summonsAvailable } from "../resources/summon";

const pearl = $item`unblemished pearl`;
const sheriffOutfit = $items`Sheriff moustache, Sheriff badge, Sheriff pistol`;
const catalog = $item`2002 Mr. Store Catalog`;
const vhs = $item`Spooky VHS Tape`;
const worksheds = $items`Asdon Martin keyfob (on ring), portable Mayo Clinic, model train set, TakerSpace letter of Marque`;

/** Sea-gear storage pulls (ash UTS:1122-1143), all policy-gated through
 * discretionaryPull (low shiny farms instead, spec §3/§4). The CMOI is
 * never bought — ash aborts "Get yer own CMOI" (UTS:1137-1138); we simply
 * skip it unless it is already in Hagnk's. */
const seaGearPulls = $items`Mer-kin sneakmask, sea lasso, shark jumper, scale-mail underwear, Flash Liquidizer Ultra Dousing Accessory`;

export function initQuest(): Quest {
  const policy = currentPolicy();
  return {
    name: "Init",
    tasks: [
      {
        name: "Pearl Guard",
        // Spec §9 init guard: five pearls must arrive codpiece-smuggled or
        // in inventory; abort at turn 0 beats the ash's silent wall at the
        // center door. Checked once per day (re-entrancy).
        completed: () => get("_subaqua_pearls_checked", false),
        do: (): void => {
          const mounted = EternityCodpiece.have()
            ? EternityCodpiece.currentGems().filter((gem) => gem === pearl).length
            : 0;
          const total = mounted + availableAmount(pearl);
          if (total < 5 && turnsPlayed() === 0) {
            abort(
              `Only ${total} unblemished pearls found (codpiece + inventory); the finale needs 5. ` +
                "Load pearls into the Eternity Codpiece before ascending, or continue at your own risk " +
                "by setting _subaqua_pearls_checked = true.",
            );
          }
          set("_subaqua_pearls_checked", true);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Old Guy Quest",
        completed: () => get("questS01OldGuy") !== "unstarted",
        do: () => void visitUrl("place.php?whichplace=sea_oldman&action=oldman_oldman"),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Toot",
        completed: () => get("questM05Toot") !== "started",
        do: (): void => {
          visitUrl("council.php");
          visitUrl("tutorial.php?action=toot");
          visitUrl("council.php");
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Daily Items",
        completed: () =>
          [$item`letter from King Ralph XI`, $item`pork elf goodies sack`].every(
            (it) => !have(it),
          ) &&
          (!have($item`sushi-rolling mat`) || get("hasSushiMat")) &&
          (!have(catalog) || get("_2002MrStoreCreditsCollected")),
        do: (): void => {
          // Ash UTS:995-1002.
          for (const it of [$item`letter from King Ralph XI`, $item`pork elf goodies sack`]) {
            if (have(it)) use(it);
          }
          if (have($item`sushi-rolling mat`) && !get("hasSushiMat")) use($item`sushi-rolling mat`);
          if (have(catalog) && !get("_2002MrStoreCreditsCollected")) use(catalog);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Photobooth",
        // Sheriff pieces fuel the Assert your Authority free kill
        // (UTS:967-974); the abort essay is the ash's, verbatim in spirit.
        completed: () =>
          get("_photoBoothEquipment", 0) >= 3 || sheriffOutfit.every((it) => have(it)),
        do: (): void => {
          for (const piece of sheriffOutfit) {
            if (!have(piece)) cliExecute(`photobooth item ${piece.name}`);
          }
          if (!sheriffOutfit.every((it) => have(it)) && get("_photoBoothEquipment", 0) >= 3) {
            abort(
              "Your clan's photobooth handed out something other than the Sheriff kit — " +
                "it may be incomplete. Join a clan with a full photobooth (e.g. BAFH) and rerun.",
            );
          }
        },
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        name: "Saber Upgrade",
        completed: () => !have($item`Fourth of May Cosplay Saber`) || get("_saberMod") !== 0,
        // +10 familiar weight (choice 1386 option 4, ash UTS:1026-1042: the
        // resistance chip only matters for pearl farming, and pearls are
        // codpiece-smuggled). Spec §8: mafia's saber CLI, no raw may4 URL.
        do: () => void cliExecute("saber familiar"),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Mayam",
        completed: () => !MayamCalendar.have() || get("_mayamSymbolsUsed") !== "",
        do: (): void => {
          // Ash ring picks (UTS:1051-1059); chest mimic soaks the yam4 xp.
          if (have($familiar`Chest Mimic`)) useFamiliar($familiar`Chest Mimic`);
          cliExecute("mayam rings vessel yam cheese explosion");
          cliExecute("mayam rings fur lightning eyepatch yam");
          cliExecute("mayam rings eye meat yam clock");
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Leprecondo",
        completed: () => !have($item`Leprecondo`) || get("leprecondoInstalled") !== "0,0,0,0",
        do: (): void => {
          const discovered = Leprecondo.discoveredFurniture();
          const picks = policy.leprecondoLayout
            .map((id) => Leprecondo.FURNITURE_PIECES[id])
            .filter((piece) => piece !== undefined && discovered.includes(piece))
            .slice(0, 4);
          if (picks.length === 4) {
            Leprecondo.setFurniture(picks[0], picks[1], picks[2], picks[3]);
          }
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Apriling",
        completed: () =>
          !AprilingBandHelmet.have() ||
          get("_aprilBandInstruments", 0) >= 2 ||
          (policy.aprilingSecond === "piccolo" &&
            !have($familiar`Chest Mimic`) &&
            have($item`Apriling band tuba`)),
        do: (): void => {
          // Tuba always (the NC forcer); second instrument per policy
          // (UTS:1076-1084). Piccolo plays feed the mimic 3x40 exp.
          AprilingBandHelmet.joinSection($item`Apriling band tuba`);
          if (policy.aprilingSecond === "quad tom") {
            AprilingBandHelmet.joinSection($item`Apriling band quad tom`);
          } else if (have($familiar`Chest Mimic`)) {
            AprilingBandHelmet.joinSection($item`Apriling band piccolo`);
            useFamiliar($familiar`Chest Mimic`);
            for (let i = 0; i < 3; i++) AprilingBandHelmet.play($item`Apriling band piccolo`);
          }
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Duffel and Shower",
        completed: () =>
          (!have($item`McHugeLarge duffel bag`) || have($item`McHugeLarge left ski`)) &&
          (!have($item`April Shower Thoughts shield`) || get("_aprilShowerGlobsCollected")),
        do: (): void => {
          if (have($item`McHugeLarge duffel bag`) && !have($item`McHugeLarge left ski`)) {
            visitUrl("inventory.php?action=skiduffel&pwd");
          }
          if (have($item`April Shower Thoughts shield`) && !get("_aprilShowerGlobsCollected")) {
            visitUrl("inventory.php?action=shower&pwd");
          }
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "2002 Credits",
        completed: () => !have(catalog) || get("availableMrStore2002Credits", 0) === 0,
        do: (): void => {
          // UTS:1093-1102; skateboard first for non-high (corral McTwist).
          const store = $coinmaster`Mr. Store 2002`;
          if (policy.catalogCredits === "skateboard+vhs2" && !have($item`pro skateboard`)) {
            buy(store, 1, $item`pro skateboard`);
          }
          while (get("availableMrStore2002Credits", 0) > 0) buy(store, 1, vhs);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Workshed",
        completed: () => get("_workshedItemUsed") || getWorkshed() !== $item.none,
        do: (): void => {
          // Priority ladder UTS:1104-1120.
          const shed = worksheds.find((it) => have(it));
          if (shed) use(shed);
          if (getWorkshed() === $item`TakerSpace letter of Marque` && !have($item`anchor bomb`)) {
            retrieveItem($item`anchor bomb`);
          }
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Sea Gear Pulls",
        // Once-per-day marker pref: completion cannot key off the pulls
        // themselves — discretionaryPull legitimately refuses at low shiny,
        // which would loop the task into its limit.
        completed: () => get("_subaqua_gear_pulled", false),
        do: (): void => {
          // UTS:1122-1143 with gates: scale-mail skipped under Kramco
          // (kramcoCoversScaleMail, IOTM:318-320); CMOI storage-only.
          for (const it of seaGearPulls) {
            if (have(it)) continue;
            if (it === $item`scale-mail underwear` && have($item`Kramco Sausage-o-Matic™`))
              continue;
            if (
              it === $item`sea lasso` &&
              summonsAvailable() >= 3 &&
              have($familiar`Sword of S Words`)
            )
              continue;
            discretionaryPull(it);
          }
          const cmoi = $item`Congressional Medal of Insanity`;
          if (!have(cmoi) && storageAmount(cmoi) > 0) discretionaryPull(cmoi);
          set("_subaqua_gear_pulled", true);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
    ],
  };
}
```

Notes: trim any import the final file does not use. `$coinmaster\`Mr. Store 2002\``— if lint rejects the constant, the master name is exactly`Mr. Store 2002`in`coinmasters.txt`; report any correction. `Leprecondo.FURNITURE_PIECES`is index-by-id (libram Leprecondo.js);`setFurniture`validates discovery itself but its rearrange guard is a no-op (libram bug) — first-install-only usage here never rearranges.`Apriling band quad tom`/`piccolo` item names: lint-verify.

- [ ] **Step 2: Wire the runplan** — replace `src/tasks/runplans.ts` with:

```ts
import { getTasks } from "grimoire-kolmafia";

import { Task } from "../engine/task";
import { Tier } from "../lib/tier";

import { initQuest } from "./init";

/**
 * One composition per tier (spec §3). Tasks 6-11 of the Phase 3 plan append
 * the monkee quests; the shared prefix is the init dailies. List order is
 * priority (stock grimoire scheduling).
 */
export function buildRunplan(tier: Tier): Task[] {
  switch (tier) {
    case "low":
    case "mid":
    case "high":
      return getTasks([initQuest()]);
  }
}
```

- [ ] **Step 3: Verify** — Run: `yarn check && yarn lint && yarn build` — Expected: pass. Then a **manual smoke note for the ledger** (no mafia here): `subaqua list` should now print ~13 Init tasks; the user validates live.

- [ ] **Step 4: Commit**

```bash
git add src/tasks/init.ts src/tasks/runplans.ts
git commit -m "feat: initialization dailies quest and runplan wiring"
```

---

### Task 6: Openers — sword imprint, guild unlock, garden pellet

**Files:**

- Create: `src/tasks/monkees/guild.ts`, `src/tasks/monkees/pellet.ts`

**Interfaces:**

- Consumes: `summon`/`summonsAvailable` (summon), `monkeesStep`/`recover`/`questStepOf` (lib), `itemDropEffects` (moods), `CombatStrategy` (engine/combat), `Quest`/`Task` (engine/task).
- Produces: `guildTasks(opts: { phonelessSwordOnly: boolean; unlockGuild: boolean }): Quest`, `pelletQuest(): Quest`.

- [ ] **Step 1: Write `src/tasks/monkees/guild.ts`**

```ts
import { equip, Location, myPrimestat, Stat, visitUrl } from "kolmafia";
import { $familiar, $item, $location, $monster, $skill, $stat, get, have, Macro } from "libram";

import { CombatStrategy } from "../../engine/combat";
import { Quest } from "../../engine/task";
import { questStepOf, recover } from "../../lib";
import { summon, summonsAvailable } from "../../resources/summon";

const sword = $familiar`Sword of S Words`;
const payphone = $item`closed-circuit pay phone`;

/** Guild-unlock quest pref and test zone per mainstat (ash unlockGuild()
 * UTS:1176-1220). */
const guildQuestProp: Map<Stat, string> = new Map([
  [$stat`Muscle`, "questG09Muscle"],
  [$stat`Mysticality`, "questG07Myst"],
  [$stat`Moxie`, "questG08Moxie"],
]);
const guildTestZone: Map<Stat, Location> = new Map([
  [$stat`Muscle`, $location`The Outskirts of Cobb's Knob`],
  [$stat`Mysticality`, $location`The Haunted Pantry`],
  [$stat`Moxie`, $location`The Sleazy Back Alley`],
]);

function prop(): string {
  return guildQuestProp.get(myPrimestat()) ?? "questG09Muscle";
}

export function guildTasks(opts: { phonelessSwordOnly: boolean; unlockGuild: boolean }): Quest {
  return {
    name: "Openers",
    tasks: [
      {
        // Imprint the Sword of S Words on the sea cowboy (id 776) so every
        // later cowboy kill duplicates sea-lasso drops (ash UTS:1760-1767;
        // doSWord() UTS:569-578). High shiny always; others only when the
        // pay phone is absent (the ash's exact gate).
        name: "Sword Imprint",
        ready: () =>
          have(sword) && summonsAvailable() >= 3 && (!opts.phonelessSwordOnly || !have(payphone)),
        completed: () => get("swordOfSWordsMonster") !== "",
        do: () => summon($monster`sea cowboy`),
        choices: { 1589: "1&victim=776" },
        combat: new CombatStrategy()
          .macro(Macro.trySkill($skill`%fn, kill a lot of these guys`), $monster`sea cowboy`)
          .kill(),
        outfit: { modifier: "item", familiar: sword },
        prepare: () => recover(),
        limit: { tries: 2 },
      },
      {
        name: "Guild Start",
        ready: () => opts.unlockGuild && have(payphone),
        completed: () => questStepOf(prop()) >= 0,
        do: (): void => {
          // Moxie shortcut: tearaway pants skip the test grind (UTS:1186-1190).
          if (myPrimestat() === $stat`Moxie` && have($item`tearaway pants`)) {
            equip($item`tearaway pants`);
          }
          visitUrl("guild.php?place=challenge");
        },
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Guild Test",
        ready: () => opts.unlockGuild && questStepOf(prop()) === 0,
        completed: () => questStepOf(prop()) !== 0,
        do: () => guildTestZone.get(myPrimestat()) ?? $location`The Outskirts of Cobb's Knob`,
        combat: new CombatStrategy().kill(),
        outfit: { modifier: "item" },
        prepare: () => recover(),
        limit: {
          soft: 12,
          message: "The guild test grind is unlucky; rerun or finish it manually.",
        },
      },
      {
        name: "Guild Finish",
        ready: () => opts.unlockGuild && questStepOf(prop()) > 0 && questStepOf(prop()) < 999,
        completed: () => questStepOf(prop()) === 999,
        do: (): void => {
          visitUrl("guild.php?place=challenge");
          // Open the guild proper (ash UTS:1774-1776).
          visitUrl("guild.php?place=ocg");
          visitUrl("guild.php?place=ocg");
        },
        freeaction: true,
        limit: { tries: 2 },
      },
    ],
  };
}
```

- [ ] **Step 2: Write `src/tasks/monkees/pellet.ts`**

```ts
import { use, visitUrl } from "kolmafia";
import { $item, $location, $monster, get, have } from "libram";

import { CombatStrategy } from "../../engine/combat";
import { Quest } from "../../engine/task";
import { monkeesStep, recover } from "../../lib";
import { itemDropEffects } from "../../lib/moods";

const pellet = $item`wriggling flytrap pellet`;
const flytrap = $monster`Neptune flytrap`;

export function pelletQuest(): Quest {
  return {
    name: "Pellet",
    tasks: [
      {
        // The pellet is a 50% drop from the Neptune flytrap (monsters.txt:470).
        // Peridot forces the flytrap (ash zoneTarget 740, IOTM:72) and
        // forceItems guarantees the drop (parka ray or saber drop-force) —
        // replacing the ash's three escalating loops (UTS:1783-1843) with
        // one guaranteed-drop fight per day-of-resource.
        name: "Garden Pellet",
        completed: () => monkeesStep() >= 0 || have(pellet),
        do: $location`An Octopus's Garden`,
        peridot: flytrap,
        combat: new CombatStrategy().forceItems(flytrap).banish(),
        outfit: { modifier: "item" },
        effects: itemDropEffects,
        choices: { 298: 2 },
        prepare: () => recover(),
        limit: {
          soft: 15,
          message: "The flytrap would not die with its pellet; check drops and rerun.",
        },
      },
      {
        name: "Use Pellet",
        ready: () => have(pellet),
        completed: () => monkeesStep() >= 0,
        do: () => void use(pellet),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Little Brother",
        completed: () => monkeesStep() >= 1,
        do: () => void visitUrl("monkeycastle.php?who=1"),
        underwater: true,
        freeaction: true,
        limit: { tries: 3 },
      },
    ],
  };
}
```

- [ ] **Step 3: Verify** — Run: `yarn check && yarn lint` — Expected: pass. `%fn, kill a lot of these guys` is the literal familiar-skill name the ash casts (`$skill[...]`, UTS/CCS:553-554, 746-750); if lint rejects it, grep `../kolmafia/src/data/classskills.txt` for "kill a lot" and report.

- [ ] **Step 4: Commit**

```bash
git add src/tasks/monkees/guild.ts src/tasks/monkees/pellet.ts
git commit -m "feat: opener tasks — sword imprint, guild unlock, garden pellet"
```

---

### Task 7: Big Brother and Grandpa

**Files:**

- Create: `src/tasks/monkees/bigbrother.ts`, `src/tasks/monkees/grandpa.ts`

**Interfaces:**

- Consumes: `ncForceEstimate`/`forceNextNoncombat` (ncforce), `monkeesStep`/`recover`/`grandpaZone` (lib), `sneakEffects`/`resEffects` (moods), `sneakFamiliar` (engine/outfit), `discretionaryPull` (pulls), `summon` (summon).
- Produces: `bigBrotherQuest(): Quest`, `grandpaQuest(opts: { golem: boolean }): Quest`.

- [ ] **Step 1: Write `src/tasks/monkees/bigbrother.ts`**

```ts
import { visitUrl } from "kolmafia";
import { $location, get } from "libram";

import { CombatStrategy } from "../../engine/combat";
import { sneakFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { monkeesStep, recover } from "../../lib";
import { sneakEffects } from "../../lib/moods";
import { forceNextNoncombat, ncForceEstimate } from "../../resources/ncforce";

const wreck = $location`The Wreck of the Edgar Fitzsimmons`;

export function bigBrotherQuest(): Quest {
  return {
    name: "Big Brother",
    tasks: [
      {
        // Forced-NC lane (ash UTS:1852-1858): the Wreck's only live NC at
        // step1 is Down at the Hatch (299 -> option 1 -> step2 +
        // bigBrotherRescued, ChoiceControl.java:5019-5032), so an NC forcer
        // lands the rescue in exactly one turn, wearing +item instead of
        // -combat. Estimate >= 4 is the ash's reserve threshold.
        name: "Wreck Rescue (forced)",
        ready: () =>
          monkeesStep() === 1 && (get("noncombatForcerActive") || ncForceEstimate() >= 4),
        completed: () => monkeesStep() >= 2,
        prepare: (): void => {
          recover();
          forceNextNoncombat();
        },
        do: wreck,
        combat: new CombatStrategy().kill(),
        outfit: { modifier: "item" },
        choices: { 299: 1 },
        limit: { soft: 10 },
      },
      {
        // Fallback -combat walk (ash UTS:1859-1862).
        name: "Wreck Rescue (sneak)",
        ready: () => monkeesStep() === 1,
        completed: () => monkeesStep() >= 2,
        do: wreck,
        combat: new CombatStrategy().freeRun(),
        outfit: () => ({ modifier: "-combat", familiar: sneakFamiliar() }),
        effects: sneakEffects,
        choices: { 299: 1 },
        prepare: () => recover(),
        limit: { soft: 12, message: "Down at the Hatch is hiding; check -combat sources." },
      },
      {
        // step2 -> who=2 (bubblin' stone -> step3, ResultProcessor.java:1854)
        // -> who=1 ("Wanna help me find Grandpa?" -> step4,
        // QuestManager.java:1441-1442). Ash UTS:1865-1868.
        name: "Bubblin' Stone",
        ready: () => monkeesStep() >= 2,
        completed: () => monkeesStep() >= 4,
        do: (): void => {
          visitUrl("monkeycastle.php?who=2");
          visitUrl("monkeycastle.php?who=1");
        },
        underwater: true,
        freeaction: true,
        limit: { tries: 3 },
      },
    ],
  };
}
```

- [ ] **Step 2: Write `src/tasks/monkees/grandpa.ts`**

```ts
import { availableAmount, cliExecute } from "kolmafia";
import { $effect, $item, $items, $monster, $skill, get, have, Macro } from "libram";

import { CombatStrategy } from "../../engine/combat";
import { sneakFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { grandpaZone, monkeesStep, recover } from "../../lib";
import { resEffects, sneakEffects } from "../../lib/moods";
import { discretionaryPull } from "../../resources/pulls";
import { summon } from "../../resources/summon";

const golem = $monster`Black Crayon Golem`;

export function grandpaQuest(opts: { golem: boolean }): Quest {
  return {
    name: "Grandpa",
    tasks: [
      {
        // step4: hunt the class-keyed rescue NC (302/303 Trench, 306 Mine,
        // 307/308 Dive Bar -> step5, ChoiceControl.java:5034-5042). The ash
        // walks -combat rather than forcing: these zones carry junk NCs
        // (Vent Horizon 304, Deep Sauce 305, Barback 309) that a forced NC
        // could land on, so forcers are wasted here (UTS:1872-1905).
        // Kill only the wanted droppers (comb jelly / digpick / tippler);
        // run from the rest (CCS:636-648).
        name: "Find Grandpa",
        ready: () => monkeesStep() === 4,
        completed: () => monkeesStep() >= 5,
        do: () => grandpaZone(),
        underwater: true,
        combat: new CombatStrategy()
          .kill($monster`giant squid`, $monster`Mer-kin miner`, $monster`Mer-kin tippler`)
          .freeRun(),
        outfit: () => ({
          modifier: "-combat, item",
          familiar: sneakFamiliar(),
          equip: $items`Mer-kin sneakmask`,
        }),
        effects: () => [...sneakEffects(), ...resEffects()],
        choices: { 302: 1, 303: 1, 304: 2, 305: 2, 306: 1, 307: 1, 308: 1, 309: 2 },
        prepare: (): void => {
          recover();
          // Hidepaint's Colorfully Concealed is -combat-cap-exempt (spec §9);
          // pull is discretionary — low shiny farms without it (UTS:1873-1876).
          if (!have($effect`Colorfully Concealed`) && !have($item`Mer-kin hidepaint`)) {
            discretionaryPull($item`Mer-kin hidepaint`);
          }
          if (!have($effect`Colorfully Concealed`) && have($item`Mer-kin hidepaint`)) {
            cliExecute("use 1 Mer-kin hidepaint");
          }
        },
        limit: { soft: 30, message: "Grandpa's rescue NC is hiding; check -combat sources." },
      },
      {
        // step5 -> step6: any grandpastory topic (GrandpaRequest.java:75-77).
        name: "Grandpa Story",
        ready: () => monkeesStep() === 5,
        completed: () => monkeesStep() >= 6,
        do: () => void cliExecute("grandpa grandma"),
        underwater: true,
        freeaction: true,
        limit: { tries: 2 },
      },
      ...(opts.golem
        ? [
            {
              // Habitat the Black Crayon Golem: its wanderer copies drop the
              // crayon shavings Shub prep needs (>= 9; pulls.ts reserves the
              // top-up pull). Ash UTS:1911-1921 + CCS:1123-1137. Club 'Em
              // Into Next Week banks one more copy (redeemed by the
              // wanderer task, Task 10).
              name: "Golem Recall",
              ready: () => have($skill`Just the Facts`) && get("_monsterHabitatsMonster") === null,
              completed: () =>
                get("_monsterHabitatsMonster") !== null ||
                availableAmount($item`crayon shavings`) >= 9,
              do: () => summon(golem),
              combat: new CombatStrategy()
                .macro(
                  Macro.trySkill($skill`Recall Facts: Monster Habitats`).trySkill(
                    $skill`Club 'Em Into Next Week`,
                  ),
                  golem,
                )
                .kill(),
              outfit: { modifier: "item", equip: $items`legendary seal-clubbing club` },
              prepare: () => recover(),
              limit: { tries: 2 },
            },
          ]
        : []),
    ],
  };
}
```

Note: `_monsterHabitatsMonster` is a **monster-typed** libram pref — `get` returns `Monster | null`, hence the `null` comparisons. If tsc disagrees (string-typed), compare against `""` instead and report.

- [ ] **Step 3: Verify** — Run: `yarn check && yarn lint` — Expected: pass. If tsc rejects the conditional `...(opts.golem ? [...] : [])` spread's inference, annotate the array literal `as Task[]` (the Task 10 cyber lane shows the pattern) and import `Task`.

- [ ] **Step 4: Commit**

```bash
git add src/tasks/monkees/bigbrother.ts src/tasks/monkees/grandpa.ts
git commit -m "feat: big brother rescue and grandpa quest tasks"
```

---

### Task 8: The Mer-Kin Outpost and the currents

**Files:**

- Create: `src/tasks/monkees/outpost.ts`, `src/tasks/monkees/currents.ts`

**Interfaces:**

- Consumes: `monkeesStep`/`recover`/`questStepOf` (lib), moods, `sneakFamiliar`, `pullBudgetAllows`/`pullSequence` (pulls), `Task.saberPurpose` (Task 1).
- Produces: `outpostQuest(): Quest`, `currentsQuest(): Quest`.

- [ ] **Step 1: Write `src/tasks/monkees/outpost.ts`**

```ts
import { availableAmount, cliExecute } from "kolmafia";
import { $item, $location, $monster, get, have } from "libram";

import { CombatStrategy } from "../../engine/combat";
import { sneakFamiliar } from "../../engine/outfit";
import { Quest } from "../../engine/task";
import { monkeesStep, recover } from "../../lib";
import { itemDropEffects, sneakEffects } from "../../lib/moods";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";

const outpost = $location`The Mer-Kin Outpost`;
const beads = $item`Mer-kin prayerbeads`;

function stashboxDone(): boolean {
  return have($item`Mer-kin stashbox`) || have($item`Mer-kin trailmap`) || get("corralUnlocked");
}

/** Shared +item farm shape for the pre-stashbox outpost regimes (ash
 * UTS:1924-2003: itdrop + freeKill while the lockkey is unknown; the CCS
 * banishes burglar/raider as non-droppers, CCS:702-707). */
const farmCombat = () =>
  new CombatStrategy().banish($monster`Mer-kin burglar`, $monster`Mer-kin raider`).kill();

export function outpostQuest(): Quest {
  return {
    name: "Outpost",
    tasks: [
      {
        // Grandma rescue rides the same turns: Note (step7) and yarns drop
        // in-zone, the map (step8) comes from `grandpa note`, and step9 is
        // the "Phew, that was a close one" adventure result
        // (QuestManager.java:1462-1466, ResultProcessor.java:1870-1876).
        name: "Outpost Grandma",
        ready: () => monkeesStep() >= 6,
        completed: () => monkeesStep() >= 9,
        do: outpost,
        combat: farmCombat(),
        outfit: { modifier: "item" },
        effects: itemDropEffects,
        prepare: () => recover(),
        limit: { soft: 30, message: "Grandma's rescue is stalling; check the outpost drops." },
      },
      {
        name: "Grandma Note",
        ready: () =>
          have($item`Grandma's Note`) &&
          have($item`Grandma's Fuchsia Yarn`) &&
          have($item`Grandma's Chartreuse Yarn`),
        completed: () => have($item`Grandma's Map`) || monkeesStep() >= 8,
        do: () => void cliExecute("grandpa note"),
        underwater: true,
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // Farm on until the lockkey drops (any of burglar/raider/healer can
        // drop it; mafia stamps merkinLockkeyMonster + choiceAdventure312,
        // ResultProcessor.java:2271-2283). The hut NC needs ~24 turns spent
        // in-zone before the stashbox chain opens (ash regime split at 24,
        // CCS:675/711) — these turns overlap the Grandma grind above.
        name: "Outpost Lockkey",
        ready: () => monkeesStep() >= 9,
        completed: () => get("merkinLockkeyMonster") !== null || stashboxDone(),
        do: outpost,
        combat: farmCombat(),
        outfit: { modifier: "item" },
        effects: itemDropEffects,
        prepare: () => recover(),
        limit: { soft: 25, message: "No lockkey after a long grind; verify drops and rerun." },
      },
      {
        // -combat hunt for the hut NC; the choice script walks the
        // per-monster search order (Task 4) and records visited locations in
        // _subaqua_stashbox_checked.
        name: "Outpost Stashbox",
        ready: () => get("merkinLockkeyMonster") !== null,
        completed: () => stashboxDone(),
        do: outpost,
        combat: new CombatStrategy().freeRun(),
        outfit: () => ({ modifier: "-combat", familiar: sneakFamiliar() }),
        effects: sneakEffects,
        prepare: (): void => {
          recover();
          const checked = get("_subaqua_stashbox_checked", "");
          if (
            ["1", "2", "3"].every((option) => `,${checked},`.includes(`,${option},`)) &&
            !stashboxDone()
          ) {
            throw (
              "All three stashbox locations were searched without finding the stashbox — " +
              "something is off. Check the Mer-kin Outpost huts manually, then rerun."
            );
          }
        },
        limit: { soft: 15, message: "The stashbox hut NC is hiding; check -combat sources." },
      },
      {
        // Prayerbead top-up: pull one (reserved slot in pulls.ts), then
        // saber-Force healers for guaranteed beads (iotm:247-261; the healer
        // purpose is exempt from the outpost saber ban, Task 1). Yog-Urt
        // prep wants 3 equipped beads (spec §9).
        name: "Prayerbeads",
        ready: () => monkeesStep() >= 9,
        completed: () => availableAmount(beads) >= 3,
        do: outpost,
        saberPurpose: "healer",
        combat: new CombatStrategy().forceItems($monster`Mer-kin healer`).freeRun(),
        outfit: () => ({ modifier: "-combat, item", familiar: sneakFamiliar() }),
        effects: sneakEffects,
        prepare: (): void => {
          recover();
          if (availableAmount(beads) < 3 && pullBudgetAllows(beads)) pullSequence(beads);
        },
        limit: { soft: 12, message: "Prayerbeads are not accumulating; check healer handling." },
      },
    ],
  };
}
```

- [ ] **Step 2: Write `src/tasks/monkees/currents.ts`**

```ts
import { cliExecute, use } from "kolmafia";
import { $item, get, have } from "libram";

import { Quest } from "../../engine/task";

export function currentsQuest(): Quest {
  return {
    name: "Currents",
    tasks: [
      {
        // Stashbox -> trailmap -> tell Grandpa about the currents. The
        // corral unlock comes from the grandpastory response ("Gonna need
        // one of them seahorses", QuestManager.java:1459-1461); seafloor
        // re-syncs corralUnlocked/intenseCurrents (QuestManager.java:1510-1516).
        // Ash UTS:2007-2012.
        name: "Open Corral",
        ready: () => have($item`Mer-kin stashbox`) || have($item`Mer-kin trailmap`),
        completed: () => get("corralUnlocked"),
        do: (): void => {
          if (have($item`Mer-kin stashbox`)) use($item`Mer-kin stashbox`);
          if (have($item`Mer-kin trailmap`)) use($item`Mer-kin trailmap`);
          cliExecute("grandpa currents");
        },
        underwater: true,
        freeaction: true,
        limit: { tries: 2 },
      },
    ],
  };
}
```

- [ ] **Step 3: Verify** — Run: `yarn check && yarn lint` — Expected: pass. (`merkinLockkeyMonster` is monster-typed in libram — `!== null`; if tsc says string, compare `""` and report.)

- [ ] **Step 4: Commit**

```bash
git add src/tasks/monkees/outpost.ts src/tasks/monkees/currents.ts
git commit -m "feat: outpost grind (grandma, lockkey, stashbox, prayerbeads) and corral unlock"
```

---

### Task 9: Old Guy and the diving helmet

**Files:**

- Create: `src/tasks/monkees/helmet.ts`

**Interfaces:**

- Consumes: `diverHuntActive` (saber), `summon`/`summonsAvailable` (summon), `pullSequence` (pulls), lib/moods helpers, `Task.saberPurpose`.
- Produces: `helmetQuest(opts: { summonLane: boolean }): Quest`.

- [ ] **Step 1: Write `src/tasks/monkees/helmet.ts`**

```ts
import {
  adv1,
  availableAmount,
  buy,
  cliExecute,
  itemAmount,
  retrieveItem,
  use,
  useSkill,
  visitUrl,
} from "kolmafia";
import {
  $coinmaster,
  $familiar,
  $item,
  $location,
  $monster,
  $skill,
  get,
  have,
  Macro,
} from "libram";

import { CombatStrategy } from "../../engine/combat";
import { Quest } from "../../engine/task";
import { monkeesStep, questStepOf, recover } from "../../lib";
import { itemDropEffects } from "../../lib/moods";
import { pullSequence } from "../../resources/pulls";
import { diverHuntActive } from "../../resources/saber";
import { summon, summonsAvailable } from "../../resources/summon";

const outpost = $location`The Mer-Kin Outpost`;
const wreck = $location`The Wreck of the Edgar Fitzsimmons`;
const diver = $monster`unholy diver`;
const mimic = $familiar`Chest Mimic`;

function rivetsDone(): boolean {
  return (
    itemAmount($item`rusty rivet`) >= 8 &&
    have($item`rusty porthole`) &&
    have($item`rusty broken diving helmet`)
  );
}

function helmetDone(): boolean {
  return !diverHuntActive() || rivetsDone();
}

/** Ash getSandDollar ladder (UTS:1379-1390): thingpouches -> the sand-penny
 * shop's 100-penny sand dollar row (coinmasters.txt:1743) -> the damp old
 * wallet pull -> a Lucky! outpost adventure (the Lucky NC pays sand dollars).
 * Bounded by the caller's limit. */
function gainSandDollars(): void {
  while (itemAmount($item`Mer-kin thingpouch`) > 0) use($item`Mer-kin thingpouch`);
  while (itemAmount($item`sand dollar`) < 63 && itemAmount($item`sand penny`) >= 100) {
    buy($coinmaster`Wet Crap For Sale`, 1, $item`sand dollar`);
  }
  if (itemAmount($item`sand dollar`) < 63 && pullSequence($item`damp old wallet`)) {
    use($item`damp old wallet`);
  }
  if (itemAmount($item`sand dollar`) < 63) {
    if (
      have($skill`Aug. 2nd: Find an Eleven-Leaf Clover Day`) &&
      !get("_aug2Cast", false) &&
      get("_augSkillsCast", 0) < 5
    ) {
      useSkill($skill`Aug. 2nd: Find an Eleven-Leaf Clover Day`);
    } else if (have($item`11-leaf clover`) || pullSequence($item`11-leaf clover`)) {
      use($item`11-leaf clover`);
    }
    if (have($effect`Lucky!`)) adv1(outpost, -1, "");
  }
}

export function helmetQuest(opts: { summonLane: boolean }): Quest {
  return {
    name: "Helmet",
    tasks: [
      {
        // Old Guy: 63 sand dollars covers black glass (13) + damp old boot
        // (50, coinmasters.txt:156-171). The old SCUBA tank is NOT in Big
        // Brother's modeled store — the ash always takes reward 6313, the
        // damp old wallet (UTS:1392-1401); breathing comes from the trunks/
        // masks/Waterproofly instead (research fact #1).
        name: "Sand Dollars",
        ready: () => get("bigBrotherRescued") && get("questS01OldGuy") === "started",
        completed: () =>
          itemAmount($item`sand dollar`) >= 63 ||
          get("dampOldBootPurchased") ||
          questStepOf("questS01OldGuy") === 999,
        do: gainSandDollars,
        underwater: true,
        combat: new CombatStrategy().kill(),
        outfit: { modifier: "item" },
        prepare: () => recover(),
        limit: { soft: 8, message: "Sand dollars are short; farm Mer-kin thingpouches and rerun." },
      },
      {
        name: "Old Guy Boot",
        ready: () =>
          get("bigBrotherRescued") &&
          (itemAmount($item`sand dollar`) >= 63 || get("dampOldBootPurchased")),
        completed: () => questStepOf("questS01OldGuy") === 999,
        do: (): void => {
          if (!have($item`black glass`) && monkeesStep() < 12) {
            buy($coinmaster`Big Brother`, 1, $item`black glass`);
          }
          if (!get("dampOldBootPurchased")) buy($coinmaster`Big Brother`, 1, $item`damp old boot`);
          visitUrl(
            "place.php?whichplace=sea_oldman&action=oldman_oldman&preaction=pickreward&whichreward=6313",
          );
        },
        underwater: true,
        freeaction: true,
        limit: { tries: 2 },
      },
      ...(opts.summonLane
        ? [
            {
              // Plan A (ash UTS:2027-2105): summon unholy divers; each
              // saber-Forced diver guarantees 4 rivets + porthole + broken
              // helmet (iotm:117-118, 185-199). The mimic lays an insurance
              // egg first so diver #2 is free. diverTries < 4 in the ash;
              // tries 5 covers the first summon.
              name: "Diver Summon",
              ready: () => summonsAvailable() >= 1 && diverHuntActive(),
              completed: helmetDone,
              do: () => summon(diver),
              saberPurpose: "diver" as const,
              combat: new CombatStrategy()
                .macro(Macro.trySkill($skill`%fn, lay an egg`), diver)
                .forceItems(diver),
              outfit: () => ({
                modifier: "item",
                familiar: have(mimic) && mimic.experience >= 100 ? mimic : undefined,
              }),
              effects: itemDropEffects,
              prepare: () => recover(),
              limit: { tries: 5 },
            },
          ]
        : []),
      {
        // Plan B (ash UTS:2106-2147): grind the Wreck for divers. Peridot
        // forces the diver; forceItems (ray or saber) forces the drops.
        name: "Wreck Rivets",
        ready: () => diverHuntActive(),
        completed: helmetDone,
        do: wreck,
        peridot: diver,
        saberPurpose: "diver" as const,
        combat: new CombatStrategy().forceItems(diver).banish(),
        outfit: { modifier: "item" },
        effects: itemDropEffects,
        choices: { 299: 1 },
        prepare: () => recover(),
        limit: { soft: 30, message: "Diver parts are not dropping; check item-drop gear." },
      },
      {
        name: "Craft Helmet",
        ready: rivetsDone,
        completed: () => !diverHuntActive(),
        do: () => void retrieveItem($item`aerated diving helmet`),
        prepare: (): void => {
          // Ash backstop (UTS:2103-2105): one pulled rivet closes a 7/8 gap.
          if (itemAmount($item`rusty rivet`) < 8) pullSequence($item`rusty rivet`);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
    ],
  };
}
```

Notes: add `$effect` to the libram import for `Lucky!` and drop `cliExecute` if unused; `sand penny` item name is lint-verified (`coinmasters.txt` token "sand penny"). List order puts Diver Summon before Wreck Rivets, so the grind only runs when summons are exhausted or the lane is off.

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/tasks/monkees/helmet.ts
git commit -m "feat: old guy boot turn-in and diving helmet hunt"
```

---

### Task 10: Mom rescue and wanderer redemptions

**Files:**

- Create: `src/tasks/monkees/mom.ts`

**Interfaces:**

- Consumes: `monkeesStep`/`grandpaZone`/`recover` (lib), moods, `pullBudgetAllows`/`pullSequence` (pulls), `Quest`/`Task` types.
- Produces: `momQuest(opts: { cyber: boolean }): Quest`, `wandererTasks(): Task[]`, `pearlResModifier(): string`.

- [ ] **Step 1: Write `src/tasks/monkees/mom.ts`**

```ts
import {
  availableAmount,
  buy,
  canAdventure,
  handlingChoice,
  itemAmount,
  myBuffedstat,
  myPrimestat,
  runChoice,
  totalTurnsPlayed,
  use,
  visitUrl,
} from "kolmafia";
import {
  $coinmaster,
  $effect,
  $familiar,
  $item,
  $items,
  $location,
  $monster,
  $skill,
  $stat,
  get,
  have,
  Macro,
} from "libram";

import { CombatStrategy } from "../../engine/combat";
import { Quest, Task } from "../../engine/task";
import { grandpaZone, monkeesStep, recover } from "../../lib";
import { itemDropEffects, resEffects } from "../../lib/moods";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";

const abyss = $location`The Caliginous Abyss`;
const glass = $item`black glass`;
const vhs = $item`Spooky VHS Tape`;
const eagle = $familiar`Patriotic Eagle`;
const habitatTargets = [$monster`slithering thing`, $monster`eye in the darkness`];
const vhsTargets = [...habitatTargets, $monster`school of many`];

function momDone(): boolean {
  return get("questS02Monkees") === "finished" || get("momSeaMonkeeProgress", 0) >= 40;
}

/** Ash pearlRes (UTS:22-26): the class zone's element. */
export function pearlResModifier(): string {
  switch (myPrimestat()) {
    case $stat`Mysticality`:
      return "hot res";
    case $stat`Moxie`:
      return "sleaze res";
    default:
      return "spooky res";
  }
}

/** Record a Spooky VHS of an abyss monster during the ash's window
 * (22 < momSeaMonkeeProgress < 36; UTS:900-912, CCS:891-896). */
function vhsMacro(): Macro {
  return !get("spookyVHSTapeMonster") && get("momSeaMonkeeProgress", 0) < 36 && itemAmount(vhs) > 0
    ? Macro.tryItem(vhs)
    : new Macro();
}

function combJellyPrep(): void {
  // Reserved pull (pulls.ts); Jelly Combed shields the abyss dive (UTS:2177).
  if (!have($effect`Jelly Combed`) && availableAmount($item`comb jelly`) === 0) {
    if (pullBudgetAllows($item`comb jelly`)) pullSequence($item`comb jelly`);
  }
  if (!have($effect`Jelly Combed`) && availableAmount($item`comb jelly`) > 0) {
    use($item`comb jelly`);
  }
}

export function momQuest(opts: { cyber: boolean }): Quest {
  const cyberKit = () => have(eagle) && have($item`server room key`);
  return {
    name: "Mom",
    tasks: [
      {
        name: "Black Glass",
        ready: () => get("bigBrotherRescued") && itemAmount($item`sand dollar`) >= 13,
        completed: () => have(glass) || monkeesStep() >= 12,
        do: () => void buy($coinmaster`Big Brother`, 1, glass),
        underwater: true,
        freeaction: true,
        limit: { tries: 2 },
      },
      ...(opts.cyber
        ? ([
            {
              // Cyber lane 1 (ash UTS:2196-2205): banish the construct
              // phylum via Patriotic Screech so cyberzone fights draw the
              // habitat monsters.
              name: "Banish Constructs",
              ready: () => cyberKit(),
              completed: () => get("banishedPhyla").includes("construct"),
              do: $location`Madness Bakery`,
              combat: new CombatStrategy()
                .macro(Macro.trySkill($skill`%fn, Release the Patriotic Screech!`))
                .kill(),
              outfit: { familiar: eagle },
              prepare: (): void => {
                recover();
                // The bakery unlocks via the armory conversation (ash
                // UTS:2199-2201).
                if (!canAdventure($location`Madness Bakery`)) {
                  visitUrl("shop.php?whichshop=armory&action=talk");
                  if (handlingChoice()) runChoice(1);
                }
              },
              limit: { tries: 4 },
            },
            {
              // Cyber lane 2 (UTS:2206-2213, CCS:897-900): habitat an abyss
              // monster.
              name: "Abyss Habitats",
              ready: () => cyberKit() && have($skill`Just the Facts`) && have(glass),
              completed: () => {
                const habitat = get("_monsterHabitatsMonster");
                return (
                  get("_monsterHabitatsRecalled", 0) >= 3 ||
                  habitatTargets.some((target) => target === habitat)
                );
              },
              do: abyss,
              combat: new CombatStrategy()
                .macro(Macro.trySkill($skill`Recall Facts: Monster Habitats`), habitatTargets)
                .kill(),
              outfit: { modifier: "item", offhand: glass },
              effects: itemDropEffects,
              prepare: (): void => {
                recover();
                combJellyPrep();
              },
              limit: { soft: 8 },
            },
            {
              // Cyber lane 3 (UTS:2214-2222, CCS:728-735): burn the habitat
              // fights inside CyberRealm's free fights; each abyss-monster
              // kill ticks momSeaMonkeeProgress wherever it happens.
              name: "Cyber Mom",
              ready: () => cyberKit() && get("_monsterHabitatsFightsLeft", 0) > 0,
              completed: () => momDone() || get("_cyberFreeFights", 0) >= 10,
              do: $location`Cyberzone 1`,
              combat: new CombatStrategy()
                .macro(Macro.trySkill($skill`Throw Cyber Rock`).repeat(), habitatTargets)
                .kill(),
              outfit: () => ({
                modifier: "moxie",
                equip: $items`shark jumper, Monodent of the Sea`,
              }),
              prepare: (): void => {
                recover();
                if (myBuffedstat($stat`Moxie`) < 500) {
                  throw "Cyberzone habitat fights want 500+ buffed moxie to be safe (ash UTS:2219). Buff up or let the abyss fallback run.";
                }
              },
              limit: { soft: 12 },
            },
          ] as Task[])
        : []),
      {
        // The universal lane (ash high branch UTS:2165-2195 + fallback
        // finishCaliginous UTS:1369-1377): grind the Abyss to
        // momSeaMonkeeProgress 40. Black glass must be *equipped* — mafia
        // refuses the zone otherwise (KoLAdventure.java:2887-2894). VHS
        // recording rides along during the window.
        name: "Abyss Mom",
        ready: () => have(glass),
        completed: momDone,
        do: abyss,
        combat: new CombatStrategy().macro(vhsMacro, vhsTargets).kill(),
        outfit: () => ({
          modifier: "item",
          offhand: glass,
          equip: $items`shark jumper, scale-mail underwear`,
        }),
        effects: itemDropEffects,
        prepare: (): void => {
          recover();
          combJellyPrep();
        },
        limit: { soft: 30, message: "Mom's rescue is stalling; check momSeaMonkeeProgress." },
      },
    ],
  };
}

/** Counter-window redemptions (spec §2: wanderer follow-ups are
 * high-priority tasks, never adventured from hooks). Both counters are
 * mafia-maintained 8-turn windows (FightRequest.java:9663-9682,
 * 11273-11287); the copies redeem at the class pearl zone wearing that
 * zone's resistance (ash UTS:888-924). */
export function wandererTasks(): Task[] {
  const redemption = (name: string, monsterPref: string, turnPref: string): Task => ({
    name,
    ready: () => !!get(monsterPref) && totalTurnsPlayed() >= get(turnPref, 0) + 8,
    completed: () => !get(monsterPref),
    do: () => grandpaZone(),
    underwater: true,
    combat: new CombatStrategy().kill(),
    outfit: () => ({ modifier: `item, ${pearlResModifier()}` }),
    effects: () => [...itemDropEffects(), ...resEffects()],
    prepare: () => recover(),
    limit: { soft: 4 },
  });
  return [
    redemption("Redeem VHS", "spookyVHSTapeMonster", "spookyVHSTapeMonsterTurn"),
    redemption("Redeem Club 'Em", "clubEmNextWeekMonster", "clubEmNextWeekMonsterTurn"),
  ];
}
```

Notes: `get(monsterPref)` on monster-typed prefs returns `Monster | null`, on string-typed returns string — the `!!`/`!` falsy checks work for both; if tsc complains about the untyped-pref default on `get(turnPref, 0)`, use `parseInt(getProperty(turnPref) || "0")` and report. `server room key` and `%fn, Release the Patriotic Screech!` / `Throw Cyber Rock` names: lint-verify against game data.

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/tasks/monkees/mom.ts
git commit -m "feat: mom rescue lanes (cyber + abyss) and wanderer redemptions"
```

---

### Task 11: Coral Corral, seahorse taming, and the final runplans

**Files:**

- Create: `src/tasks/monkees/corral.ts`
- Modify: `src/tasks/runplans.ts`

**Interfaces:**

- Consumes: everything above.
- Produces: `corralQuest(opts: { opener: boolean; swordLane: boolean }): Quest`; final `buildRunplan(tier)`.

- [ ] **Step 1: Write `src/tasks/monkees/corral.ts`**

```ts
import { availableAmount, retrieveItem } from "kolmafia";
import { $familiar, $item, $items, $location, $monster, $skill, get, have, Macro } from "libram";

import { CombatStrategy } from "../../engine/combat";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { itemDropEffects } from "../../lib/moods";
import { pullBudgetAllows, pullSequence } from "../../resources/pulls";

const corral = $location`The Coral Corral`;
const rustler = $monster`Mer-kin rustler`;
const cowboy = $monster`sea cowboy`;
const cow = $monster`sea cow`;
const seahorse = $monster`wild seahorse`;
const cowbell = $item`sea cowbell`;
const lasso = $item`sea lasso`;
const sword = $familiar`Sword of S Words`;

/** Ash doneWithSeaCow (UTS:1446-1453). */
function leatherDone(): boolean {
  return (
    availableAmount($item`sea leather`) +
      availableAmount($item`sea chaps`) +
      availableAmount($item`sea cowboy hat`) >=
      2 && availableAmount(cowbell) >= 3
  );
}

/** Ash doneWithCowboy (UTS:1439-1444): banked lassos finish the training. */
function lassosDone(): boolean {
  return get("lassoTrainingCount", 0) + 3 * availableAmount(lasso) >= 21;
}

function tamed(): boolean {
  return get("seahorseName") !== "";
}

/** Cowbell,cowbell then cowbell,lasso (funkslinging); singles otherwise.
 * Ash CCS:738-744 + the old salvage's singles fallback. Ends with abort:
 * if the fight is still open the tame failed (ash's exact protocol). */
function tamingMacro(): Macro {
  return have($skill`Ambidextrous Funkslinging`)
    ? Macro.item([cowbell, cowbell]).item([cowbell, lasso]).abort()
    : Macro.item(cowbell).item(cowbell).item(cowbell).item(lasso).abort();
}

export function corralQuest(opts: { opener: boolean; swordLane: boolean }): Quest {
  const swordOut = () => opts.swordLane && have(sword) && get("swordOfSWordsMonster") !== "";
  return {
    name: "Corral",
    tasks: [
      ...(opts.opener
        ? [
            {
              // One-turn opener (ash UTS:2229-2261): first corral fight with
              // the pro skateboard — Do an epic McTwist! forces every drop
              // off the sea cow (leather + cowbell in one turn).
              name: "Corral Opener",
              ready: () => get("corralUnlocked"),
              completed: () =>
                corral.turnsSpent > 0 ||
                availableAmount($item`sea leather`) > 0 ||
                have($item`sea cowboy hat`) ||
                tamed(),
              do: corral,
              combat: new CombatStrategy()
                .macro(Macro.trySkill($skill`Do an epic McTwist!`), cow)
                .kill(cow, cowboy)
                .banish(rustler)
                .freeRun(seahorse)
                .kill(),
              outfit: { modifier: "item", equip: $items`pro skateboard` },
              effects: itemDropEffects,
              prepare: () => recover(),
              limit: { tries: 3 },
            },
          ]
        : []),
      {
        // Sea-cow farm: leather (chaps + hat) and three cowbells. The
        // seaCow saber reservation backs forceItems; the parka ray serves
        // first when charged (both force all drops). Ash getMissingCorralItems
        // UTS:1455-1495, CCS tier-3 regime CCS:823-876.
        name: "Corral Leather",
        ready: () => get("corralUnlocked"),
        completed: () => leatherDone() || tamed(),
        do: corral,
        saberPurpose: "seaCow" as const,
        combat: new CombatStrategy()
          .macro(Macro.trySkill($skill`Do an epic McTwist!`), cow)
          .forceItems(cow)
          .kill(cowboy)
          .banish(rustler)
          .freeRun(seahorse),
        outfit: () => ({
          modifier: "item",
          equip: $items`pro skateboard`,
          familiar: swordOut() ? sword : undefined,
        }),
        effects: itemDropEffects,
        prepare: (): void => {
          recover();
          if (availableAmount(cowbell) < 3 && pullBudgetAllows(cowbell)) pullSequence(cowbell);
        },
        limit: { soft: 15, message: "Sea leather/cowbells are not accumulating." },
      },
      {
        name: "Craft Chaps",
        ready: () => availableAmount($item`sea leather`) > 0 && !have($item`sea chaps`),
        completed: () => have($item`sea chaps`) || get("lassoTrainingCount", 0) >= 20,
        do: () => void retrieveItem($item`sea chaps`),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        name: "Craft Hat",
        ready: () => availableAmount($item`sea leather`) > 0 && !have($item`sea cowboy hat`),
        completed: () => have($item`sea cowboy hat`) || get("lassoTrainingCount", 0) >= 20,
        do: () => void retrieveItem($item`sea cowboy hat`),
        freeaction: true,
        limit: { tries: 1 },
      },
      {
        // Lasso stock + training. Sea cowboys drop lassos (doubled under
        // the imprinted Sword); the engine's round-1 lasso injection
        // (customize(), Phase 1) trains on every underwater fight while
        // hat + chaps are worn, +3 per throw.
        name: "Corral Lassos",
        ready: () => get("corralUnlocked"),
        completed: () => (lassosDone() && availableAmount(lasso) >= 1) || tamed(),
        do: corral,
        combat: new CombatStrategy()
          .macro(
            () =>
              swordOut() ? Macro.trySkill($skill`%fn, kill a lot of these guys`) : new Macro(),
            cowboy,
          )
          .kill(cowboy, cow)
          .banish(rustler)
          .freeRun(seahorse),
        outfit: () => ({ modifier: "item", familiar: swordOut() ? sword : undefined }),
        effects: itemDropEffects,
        prepare: () => recover(),
        limit: { soft: 15, message: "Sea lassos are not accumulating." },
      },
      {
        // Taming (ash sorceress() UTS:3024-3074 + CCS:738-744): banish the
        // other draws so the seahorse spawns, then throw cowbell/cowbell,
        // cowbell/lasso at exactly lassoTrainingCount 20. Initiative
        // maximized so the throws land before the 1M-HP seahorse acts
        // (monsters.txt: Phys+Elem 100 — the lasso is the only win).
        name: "Tame Seahorse",
        ready: () =>
          get("lassoTrainingCount", 0) >= 20 &&
          availableAmount(cowbell) >= 3 &&
          availableAmount(lasso) >= 1,
        completed: tamed,
        do: corral,
        combat: new CombatStrategy()
          .macro(tamingMacro, seahorse)
          .banish(rustler, cowboy, cow)
          .kill(),
        outfit: { modifier: "initiative" },
        prepare: (): void => {
          recover();
          if (availableAmount(cowbell) < 3 && pullBudgetAllows(cowbell)) pullSequence(cowbell);
        },
        limit: { soft: 12, message: "The wild seahorse is not spawning; check banishes." },
      },
    ],
  };
}
```

- [ ] **Step 2: Final `src/tasks/runplans.ts`**

```ts
import { getTasks } from "grimoire-kolmafia";

import { Task } from "../engine/task";
import { Tier } from "../lib/tier";

import { initQuest } from "./init";
import { bigBrotherQuest } from "./monkees/bigbrother";
import { corralQuest } from "./monkees/corral";
import { currentsQuest } from "./monkees/currents";
import { grandpaQuest } from "./monkees/grandpa";
import { guildTasks } from "./monkees/guild";
import { helmetQuest } from "./monkees/helmet";
import { momQuest, wandererTasks } from "./monkees/mom";
import { outpostQuest } from "./monkees/outpost";
import { pelletQuest } from "./monkees/pellet";

/**
 * One composition per tier (spec §3). List order is priority: init dailies,
 * then wanderer-window redemptions (they fire only inside their 8-turn
 * counters), then the seaMonkees() spine in ash order (UTS:1759-2296).
 * Tier differences are route membership only — resource behavior lives in
 * ResourcePolicy:
 *  - high skips the guild unlock and golem recall (UTS:1770-1777, 1911-1921
 *    !highShiny gates), skips the one-turn corral opener (UTS:2233), runs
 *    the sword corral lane, and uses the abyss-only Mom lane (UTS:2165).
 *  - low/mid run the guild, golem, summon-diver lane, cyber Mom lanes, and
 *    the corral opener; the sword imprint fires only on phoneless accounts
 *    (UTS:1760-1767).
 */
export function buildRunplan(tier: Tier): Task[] {
  const wanderers = { name: "Wanderers", tasks: wandererTasks() };
  const high = tier === "high";
  return getTasks([
    initQuest(),
    wanderers,
    guildTasks({ phonelessSwordOnly: !high, unlockGuild: !high }),
    pelletQuest(),
    bigBrotherQuest(),
    grandpaQuest({ golem: !high }),
    outpostQuest(),
    currentsQuest(),
    helmetQuest({ summonLane: !high }),
    momQuest({ cyber: !high }),
    corralQuest({ opener: !high, swordLane: high }),
  ]);
}
```

- [ ] **Step 3: Verify** — Run: `yarn check && yarn lint && yarn build` — Expected: pass; three bundles. `subaqua list` (user, live) should print the full spine with init tasks first.

- [ ] **Step 4: Commit**

```bash
git add src/tasks/monkees/corral.ts src/tasks/runplans.ts
git commit -m "feat: coral corral farms, seahorse taming, per-tier runplan composition"
```

---

## Phase exit criteria

- `yarn check`, `yarn lint`, `yarn build` all green; three bundles.
- `subaqua list` prints the composed spine per tier with init first; `subaqua sim` unchanged.
- Live validation is the **user's**: incremental `subaqua actions=N` runs (this phase spends real turns). The plan's task `completed()` conditions all re-derive from mafia state, so re-runs fast-forward.
- The seahorse tame (`seahorseName` set) is the phase's terminal quest state; Phase 4 (sorceress/deepcity, dreadscroll, README) builds on it.

## Deliberate deferrals and drops (tracked, not gaps)

Deferred to Phase 4 or a later optimization pass, each with its ash anchor:

- Shadow Rift subsystem (Rufus, Shadow Waters, monkey-paw lasso wishes, rift lasso training, Sea \*dent wave; UTS:1508-1559, 2974-3000) — training happens organically via the engine's round-1 lasso injection instead.
- Skate-park war resolution + fountain Fishy (UTS:1320-1348; spec §9 takes it opportunistically during Phase 4's forced waits). The skate-blade pull reservation from Phase 2 stays dormant until then.
- Baseball diamond pitch programming (iotm baseballD), backup-camera copy chains, Macrometeorite/CHEAT-CODE re-rolls, Map the Monsters, Time-Spinner, BCZ Refracted Gaze victims, codpiece gem socketing for the corral opener (UTS:2237; §8 socketing pattern), Source Terminal enhance/educate, Pocket Professor lectures, otoscope — all combat-optimizer layers on top of a working spine.
- Mer-kin Elementary/Library/Gymnasium regimes, dreadscroll spading tasks, `dreadSeedCheck` post() hook — Phase 4 (deepcity opens once the seahorse is tamed).
- Mom's daily buff (`mom` CLI; the ash never claims it — MomRequest is free value Phase 4 can take before the sorceress).
- Dropped on net-turn grounds (spec §9 evaluation principle), documented: stillsuit setup (aftercore-only value), autumn leaves/distilled resin, DoD bang-potion spading (UTS:1146-1159), numberology, trainset per-turn reconfiguration and autumn-aton re-sends (both live in ash post_adv; the autumn-aton/trainset init installs remain). If live runs show these matter, they slot into `post()` beside the existing duties.
- The ash's `NCtoC` combat-NC interplay (Club 'Em Across the Battlefield gating) and `elementaryQueue` — Phase 4 concerns; no Phase 3 code writes those prefs.
- Worktea-sushi timing for dreadscroll clue 7 (UTS:833-837, 3276-3281) and the `godRunGuard` — Phase 4's dreadscroll module; the Phase 3 Fishy ladder eats plain nigiri only.
- Monodent Talk to Some Fish lasso-halving (throw the lasso before _and_ after casting, spec §9) and BCZ Refracted Gaze pairing — combat-optimizer layer over the working corral farm.

## Self-review notes (resolved during planning)

- The Phase-2 flagged **choice 1387 collision** is resolved by making option 3 a run-global property (Task 3) — all three writers now agree on one value.
- The **NC-force pull-trio budget ruling**: `forceNextNoncombat()` is invoked only from the Wreck rescue (route-critical, one NC) — the trio's deliberate `pullBudgetAllows` bypass stands; no additional budget policy needed this phase.
- **`_subaqua_outpost_choices` is retired** (Tasks 3-4) in favor of `_subaqua_stashbox_checked`, still solely owned by the choice bundle.
- **Old SCUBA tank decision point** (spec §9) is closed by mafia ground truth: not purchasable; no code models it.
