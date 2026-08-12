# SubAqua Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale SubAqua source with the spec's foundation: clean args, tier detection, a correct grimoire Engine subclass with underwater-breathing enforcement, the sim checklist, the choice-script and relay bundles, and a main entry that runs an (empty, for now) per-tier runplan.

**Architecture:** Per `docs/superpowers/specs/2026-08-11-subaqua-design.md` (read it first — especially §1–§2, §7, §8). This phase builds everything _except_ the resources layer (Phase 2), the quest tasks (Phase 3), and the sorceress endgame (Phase 4). The old source is one giant "wip" commit; salvaged code is retrieved from git history (`git show a8c4168:<path>`), fixed per the spec, and everything else is deleted.

**Tech Stack:** TypeScript on grimoire-kolmafia 0.3.33 / libram 0.11.23 / kolmafia typings, bundled by rollup (three CJS bundles targeting Rhino 1.8.0), yarn 4.

## Global Constraints

- Runs inside KoLmafia's Rhino JS runtime — **no Node APIs**, `kolmafia` must stay `external` in rollup.
- KoLmafia revision floor: **29057** (`sinceKolmafiaRevision(29057)` at entry, from libram).
- Script-owned prefs use `subaqua_` (persistent) / `_subaqua_` (daily) namespaces. Grimoire `Args` auto-back props as `subaqua_<key>`.
- `$item`/`$effect`/etc. template constants must be **module-level** (eslint-plugin-libram enforces). Never invent game names — verify in `node_modules/libram/dist/propertyTypes.d.ts` / `node_modules/kolmafia/index.d.ts`; `yarn lint` validates all enumerated names.
- **No `user_confirm`/blocking dialogs anywhere.**
- Every adventuring task must have a `limit` (type-enforced by our Task type). No adventuring tasks exist in this phase.
- Verification cycle: `yarn check` (tsc), `yarn lint` (eslint + prettier), `yarn build` (rollup). There is no unit-test runner: nothing in the `kolmafia` package executes outside mafia (every stub throws). Pure mafia-free logic gets a test runner in Phase 4 (dreadscroll math). Final smoke test is a real `subaqua sim` run in mafia by the user.
- Commit after every task. Old code reference: commit `a8c4168` (`git show a8c4168:src/...`).

## File Structure (this phase)

```
src/
  main.ts              entry: guards → sim | list | engine.run(actions) w/ destruct
  args.ts              Args.create("subaqua", ...) — only args that are consumed
  sim.ts               readiness checklist (iotm/skill/familiar/pull/pre-ascension/tier)
  lib/
    index.ts           tiny shared helpers
    tier.ts            Tier type + detectTier() + currentTier()
  engine/
    task.ts            Task/Quest types (required limit, peridot, underwater, freeaction)
    combat.ts          CombatActions taxonomy + MyActionDefaults + killMacro/runMacro
    outfit.ts          breathing constants (single source), familiar scoring
    engine.ts          SubAquaEngine (stock scheduling; breathing; peridot; post checks)
  tasks/
    runplans.ts        buildRunplan(tier) — empty task lists this phase
  standalone/
    choice.ts          choiceAdventureScript bundle (salvaged + fixed)
  relay.ts             relay UI (salvaged, workshed hack removed)
```

---

### Task 1: Clean slate + minimal building stub

**Files:**

- Delete: everything under `src/`, plus `prefs.txt`, `webpack.config.js`
- Create: `src/main.ts` (stub)
- Modify: `rollup.config.ts:46-53` (single bundle for now)

**Interfaces:**

- Consumes: nothing.
- Produces: a repo where `yarn check && yarn lint && yarn build` all pass; later tasks re-add files.

- [ ] **Step 1: Delete the old source and stale config**

```bash
git rm -r src
git rm prefs.txt webpack.config.js
```

- [ ] **Step 2: Write the stub entry** — `src/main.ts`:

```ts
import { print } from "kolmafia";

export function main(): void {
  print("subaqua: foundation stub", "blue");
}
```

- [ ] **Step 3: Trim rollup to the one existing entry** — in `rollup.config.ts`, replace the `bundles` array (lines 46-53) with:

```ts
const bundles: Array<{ input: Record<string, string>; dir: string }> = [
  { input: { subaqua: "src/main.ts" }, dir: "dist/KoLmafia/scripts/subaqua" },
];
```

- [ ] **Step 4: Verify**

Run: `yarn check && yarn lint && yarn build`
Expected: all pass; `dist/KoLmafia/scripts/subaqua/subaqua.js` exists.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: clean slate for foundation rebuild"
```

---

### Task 2: Args

**Files:**

- Create: `src/args.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `export const args` with fields `command: string` ("run"|"sim"), `tier: string` ("auto"|"low"|"mid"|"high"), `buyLimit: number | undefined`, `postloopCommand: string`, `godRunGuard: boolean`, `list: boolean`, `actions: number | undefined`, `version: boolean`, `help: boolean` (auto). Positional arg: `command`.

- [ ] **Step 1: Write `src/args.ts`**

```ts
import { Args } from "grimoire-kolmafia";

export const args = Args.create(
  "subaqua",
  'Speedrun the 11,037 Leagues Under the Sea path. Run "subaqua" for the run, "subaqua sim" for a readiness checklist.',
  {
    command: Args.string({
      help: "What to do.",
      options: [
        ["run", "Execute the path speedrun (default)"],
        ["sim", "Print the readiness checklist; no turns, purchases, or server writes"],
      ],
      default: "run",
    }),
    tier: Args.string({
      help: "Shiny-tier override; 'auto' detects from owned items and garbo_valueOfFreeFight.",
      options: [
        ["auto", "Detect automatically"],
        ["low", "No 2002 Catalog / monkey's paw / august scepter: farm instead of pull"],
        ["mid", "Spend every daily resource on run speed"],
        ["high", "Free fights worth more in aftercore: conserve them in-run"],
      ],
      default: "auto",
    }),
    buyLimit: Args.number({
      help: "Max meat per mall purchase; defaults to your autoBuyPriceLimit mafia preference.",
    }),
    postloopCommand: Args.string({
      help: "CLI command to run once the route completes (e.g. a farming script). Empty = skip.",
      default: "",
    }),
    godRunGuard: Args.flag({
      help: "Abort at ≤17 turns played if dreadscroll clue 7 is still unknown (top-turncount insurance).",
      default: false,
    }),
    list: Args.flag({
      help: "Print the selected runplan with per-task completed status, then exit.",
      default: false,
      setting: "",
    }),
    actions: Args.number({
      help: "Run at most this many tasks, then stop (incremental testing).",
      setting: "",
    }),
    version: Args.flag({ help: "Print the version and exit.", default: false, setting: "" }),
  },
  { positionalArgs: ["command"] },
);
```

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/args.ts && git commit -m "feat: rebuilt args (only consumed options)"
```

---

### Task 3: Tier detection + lib

**Files:**

- Create: `src/lib/tier.ts`, `src/lib/index.ts`

**Interfaces:**

- Consumes: `args` from Task 2.
- Produces: `type Tier = "low" | "mid" | "high"`, `detectTier(): Tier`, `currentTier(): Tier` (honors `args.tier` override, memoizes, writes `_subaqua_tier`), `buyLimit(): number`. `lib/index.ts` re-exports tier plus a `debug(msg)` print helper.

- [ ] **Step 1: Write `src/lib/tier.ts`**

```ts
import { getProperty } from "kolmafia";
import { $item, get, have, set } from "libram";

import { args } from "../args";

export type Tier = "low" | "mid" | "high";

// Spec §3: ships the ash *code's* rule, not its README's (no Asdon check in highShiny()).
const shinyMarkers = [
  $item`2002 Mr. Store Catalog`,
  $item`cursed monkey's paw`,
  $item`august scepter`,
];

export function detectTier(): Tier {
  if (!shinyMarkers.some((marker) => have(marker))) return "low";
  const freeFightValue = Number(getProperty("garbo_valueOfFreeFight") || 0);
  if (freeFightValue > get("valueOfAdventure")) return "high";
  return "mid";
}

let cachedTier: Tier | undefined;

/** Resolve the run's tier once: arg override beats detection; recorded in _subaqua_tier
 * so the separately-bundled choice script can read it (spec §1 principle 3). */
export function currentTier(): Tier {
  if (cachedTier === undefined) {
    cachedTier =
      args.tier === "low" || args.tier === "mid" || args.tier === "high" ? args.tier : detectTier();
    set("_subaqua_tier", cachedTier);
  }
  return cachedTier;
}
```

- [ ] **Step 2: Write `src/lib/index.ts`**

```ts
import { print } from "kolmafia";
import { get } from "libram";

import { args } from "../args";

export * from "./tier";

export function debug(message: string): void {
  print(`[subaqua] ${message}`, "gray");
}

/** Spec §4: the ash's autoBuyPriceLimit user_confirm becomes an arg with the
 * user's own mafia preference as the default. */
export function buyLimit(): number {
  return args.buyLimit ?? get("autoBuyPriceLimit");
}
```

- [ ] **Step 3: Verify** — Run: `yarn check && yarn lint` — Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib && git commit -m "feat: tier detection and shared lib helpers"
```

---

### Task 4: Task types + combat action taxonomy

**Files:**

- Create: `src/engine/task.ts`, `src/engine/combat.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `type Task` (grimoire task + required `limit`, optional `peridot`, `underwater`, `freeaction`, `combat`), `type Quest`, `type CombatActions`, `class CombatStrategy`, `class MyActionDefaults`, `killMacro(hard?: boolean): Macro`, `runMacro(): Macro`. Phase 2's resource layer will _resolve_ actions like `banish`/`killFree`; until then defaults degrade explicitly (banish→kill, killFree→abort) exactly as documented in the class.

- [ ] **Step 1: Write `src/engine/task.ts`** (salvage, unchanged shape)

```ts
import { Quest as BaseQuest, Task as BaseTask, Limit } from "grimoire-kolmafia";
import { CombatStrategy as BaseCombatStrategy } from "grimoire-kolmafia";
import { Monster } from "kolmafia";

import { CombatActions, CombatStrategy } from "./combat";

export type Quest = BaseQuest<Task>;

export type Task = {
  combat?: CombatStrategy | BaseCombatStrategy<CombatActions>;

  // Control safeguards
  limit: Limit;
  peridot?: Monster | (() => Monster | undefined); // Peridot of Peril target, if possible
  underwater?: boolean; // force breathing enforcement for function-`do` tasks
  freeaction?: boolean | (() => boolean);
} & BaseTask<CombatActions>;
```

- [ ] **Step 2: Write `src/engine/combat.ts`** (salvage minus the unused `replaceActions`; keep the explicit-degradation comments — spec §2 requires fallbacks be visible, never silent)

```ts
import { ActionDefaults, CombatStrategy as BaseCombatStrategy } from "grimoire-kolmafia";
import { haveEquipped, Location, Monster, myLevel } from "kolmafia";
import { $effect, $item, $skill, have, Macro } from "libram";

const myActions = [
  "ignore", // Task doesn't care what happens
  "ignoreSoftBanish", // Do not seek out a banish, but it is advantageous to have it
  "ignoreNoBanish", // Task doesn't care what happens, as long as it is not banished
  "kill", // Task needs to kill it, with or without a free kill
  "killFree", // Task needs to kill it with a free kill
  "killHard", // Task needs to kill it without using a free kill (boss / already free)
  "banish", // Task doesn't care what happens, but banishing is useful
  "killBanish", // Banishing is useful, but we prefer to still trigger end-of-combat things
  "abort", // Abort the macro and the script; an error has occurred
  "killItem", // Kill with an item boost
  "yellowRay", // Kill with a drop-everything YR action
  "forceItems", // Force items to drop with a YR or saber
  "freeRun", // Run away from the monster
] as const;
export type CombatActions = (typeof myActions)[number];

export class CombatStrategy extends BaseCombatStrategy.withActions(myActions) {}

/**
 * Defaults when no combat resource is allocated (resource layer arrives in Phase 2).
 * Degradations are deliberate and explicit per spec §2: banish, the ignore family,
 * killItem, yellowRay and forceItems all degrade to kill; freeRun is taffy-or-nothing;
 * killFree ABORTS (a task that requires a free kill must be given one).
 */
export class MyActionDefaults implements ActionDefaults<CombatActions> {
  freeRun(_target?: Monster | Location) {
    return runMacro();
  }
  ignore(target?: Monster | Location) {
    return this.kill(target);
  }
  ignoreSoftBanish(target?: Monster | Location) {
    return this.kill(target);
  }
  kill(_target?: Monster | Location) {
    return killMacro(false);
  }
  killHard(_target?: Monster | Location) {
    return killMacro(true);
  }
  killBanish(target?: Monster | Location) {
    return this.kill(target);
  }
  ignoreNoBanish(target?: Monster | Location) {
    return this.kill(target);
  }
  killFree() {
    return this.abort();
  }
  banish(target?: Monster | Location) {
    return this.kill(target);
  }
  abort() {
    return new Macro().abort();
  }
  killItem(target?: Monster | Location) {
    return this.kill(target);
  }
  yellowRay(target?: Monster | Location) {
    return this.killItem(target);
  }
  forceItems(target?: Monster | Location) {
    return this.killItem(target);
  }
}

export function killMacro(hard?: boolean): Macro {
  const result = new Macro();

  if (haveEquipped($item`Everfull Dart Holster`)) {
    if (!hard && myLevel() >= 12 && !have($effect`Everything Looks Red`)) {
      result
        .trySkill($skill`Darts: Aim for the Bullseye`)
        .trySkill($skill`Darts: Aim for the Bullseye`)
        .trySkill($skill`Darts: Aim for the Bullseye`)
        .trySkill($skill`Darts: Aim for the Bullseye`)
        .trySkill($skill`Darts: Aim for the Bullseye`);
    } else {
      result.trySkill($skill`Darts: Throw at %part1`);
    }
  }

  if (!haveEquipped($item`June cleaver`) && have($skill`Saucegeyser`)) {
    // Fail-soft so MP gating never hard-stops combat.
    result.trySkill($skill`Saucegeyser`);
  }

  return result.attack().repeat();
}

export function runMacro(): Macro {
  return new Macro().tryItem($item`pulled indigo taffy`);
}
```

- [ ] **Step 3: Verify** — Run: `yarn check && yarn lint` — Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/engine && git commit -m "feat: task types and combat action taxonomy"
```

---

### Task 5: Outfit module — single source of breathing truth

**Files:**

- Create: `src/engine/outfit.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: `waterBreathingEquipment: Item[]`, `familiarWaterBreathingEquipment: Item[]`, `canBreatheUnderwater(): boolean`, `hasBreathingEffect(): boolean`, `isTrainingLasso(): boolean`, `preferredBreathingGear(): Item[]`, `bestFamUnderwaterGear(fam: Familiar): Item`, `chooseFamiliar(): Familiar`. This is the _only_ module allowed to define these lists (spec fix for the old repo's three copies).

- [ ] **Step 1: Write `src/engine/outfit.ts`**

```ts
import {
  booleanModifier,
  canEquip,
  equippedItem,
  Familiar,
  Item,
  numericModifier,
  print,
} from "kolmafia";
import {
  $effect,
  $familiar,
  $item,
  $items,
  $slot,
  findLeprechaunMultiplier,
  get,
  have,
  maxBy,
  totalFamiliarWeight,
} from "libram";

/** Single source of truth (spec §1: the old repo carried three copies of these). */
export const waterBreathingEquipment = $items`The Crown of Ed the Undying, aerated diving helmet, crappy Mer-kin mask, Mer-kin gladiator mask, Mer-kin scholar mask, old SCUBA tank, Elf Guard SCUBA tank`;
export const familiarWaterBreathingEquipment = $items`das boot, little bitty bathysphere`;

/** Effects that grant breathing without gear (Driving Waterproofly covers familiar too). */
export function hasBreathingEffect(): boolean {
  return (
    have($effect`Driving Waterproofly`) ||
    have($effect`Wet Willied`) ||
    booleanModifier("Adventure Underwater")
  );
}

export function canBreatheUnderwater(): boolean {
  return (
    booleanModifier("Adventure Underwater") ||
    waterBreathingEquipment.some((item) => have(item) && canEquip(item))
  );
}

/** Wiki §9: hat+pants must stay free for sea cowboy hat + sea chaps while lasso training,
 * so back-slot SCUBA tanks jump the breathing-preference queue. */
export function isTrainingLasso(): boolean {
  return (
    get("lassoTraining") !== "expertly" && get("lassoTrainingCount") < 20 && have($item`sea lasso`)
  );
}

const scubaTanks = $items`old SCUBA tank, Elf Guard SCUBA tank`;

export function preferredBreathingGear(): Item[] {
  const gear = isTrainingLasso()
    ? [...scubaTanks, ...waterBreathingEquipment]
    : [...waterBreathingEquipment];
  return gear.filter((item, idx, arr) => arr.indexOf(item) === idx);
}

export function bestFamUnderwaterGear(fam: Familiar): Item {
  // Underwater-capable (or effect-covered) familiars take general meat gear;
  // otherwise das boot / bathysphere (idiom from garbo yachtzee familiar.ts).
  return fam.underwater || have($effect`Driving Waterproofly`) || have($effect`Wet Willied`)
    ? have($item`amulet coin`)
      ? $item`amulet coin`
      : $item`filthy child leash`
    : have($item`das boot`)
      ? $item`das boot`
      : $item`little bitty bathysphere`;
}

function equipmentlessFamiliarWeight(fam: Familiar): number {
  return (
    totalFamiliarWeight(fam, true) -
    numericModifier(equippedItem($slot`familiar`), "Familiar Weight")
  );
}

export function chooseFamiliar(): Familiar {
  const haveUnderwaterFamEquipment = familiarWaterBreathingEquipment.some((item) => have(item));
  const candidates = Familiar.all()
    .filter(
      (fam) =>
        have(fam) &&
        findLeprechaunMultiplier(fam) > 0 &&
        fam !== $familiar`Ghost of Crimbo Commerce` &&
        fam !== $familiar`Robortender` &&
        (fam.underwater || haveUnderwaterFamEquipment),
    )
    .map((familiar) => ({
      familiar,
      meat: numericModifier(
        familiar,
        "Meat Drop",
        equipmentlessFamiliarWeight(familiar),
        bestFamUnderwaterGear(familiar),
      ),
    }));

  if (candidates.length === 0) return $familiar.none;
  const best = maxBy(candidates, "meat").familiar;
  print(`Best meat familiar underwater: ${best}`, "blue");
  return best;
}
```

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/engine/outfit.ts && git commit -m "feat: outfit module with single breathing source"
```

---

### Task 6: SubAquaEngine

**Files:**

- Create: `src/engine/engine.ts`

**Interfaces:**

- Consumes: `Task` (Task 4), `CombatActions`/`MyActionDefaults` (Task 4), breathing helpers (Task 5).
- Produces: `class SubAquaEngine extends Engine<CombatActions, Task>` with grimoire's **stock scheduling** (no `getNextTask` override — the old one silently broke every `after` dependency), overriding: `customize` (peridot equip + lasso-training macro/gear + breathing enforcement), `createOutfit` (defensive stripping of un-owned gear), `dress` (last-chance breathing equip + verify), `do` (Peridot choice-1557 targeting), `post` (lost-combat abort / Beaten Up cleanup), `setChoices` (outpost 315 rotation + June cleaver safety), `initPropertiesManager` (restorer bans, choice script registration).

- [ ] **Step 1: Write `src/engine/engine.ts`**

```ts
import {
  CombatResources,
  CombatStrategy,
  Engine as BaseEngine,
  EngineOptions,
  Outfit,
  outfitSlots,
} from "grimoire-kolmafia";
import {
  booleanModifier,
  canEquip,
  equip,
  equippedAmount,
  haveEquipped,
  Item,
  Location,
  print,
} from "kolmafia";
import {
  $effect,
  $familiar,
  $item,
  $items,
  $slot,
  get,
  have,
  Macro,
  PropertiesManager,
  set,
  undelay,
  uneffect,
} from "libram";

import { CombatActions, MyActionDefaults } from "./combat";
import {
  familiarWaterBreathingEquipment,
  hasBreathingEffect,
  preferredBreathingGear,
  isTrainingLasso,
  waterBreathingEquipment,
} from "./outfit";
import { Task } from "./task";

function isUnderwaterTask(task: Task): boolean {
  return (
    (task.do instanceof Location && task.do.environment === "underwater") ||
    task.underwater === true
  );
}

export class SubAquaEngine extends BaseEngine<CombatActions, Task> {
  constructor(tasks: Task[], options: EngineOptions<CombatActions, Task> = {}) {
    if (!options.combat_defaults) options.combat_defaults = new MyActionDefaults();
    super(tasks, options);
  }

  // NOTE deliberately no getNextTask() override: grimoire's available() honors
  // `after` dependencies and limit.skip; the old repo's override silently broke both.

  override customize(
    task: Task,
    outfit: Outfit,
    combat: CombatStrategy<CombatActions>,
    resources: CombatResources<CombatActions>,
  ): void {
    const peridotTarget = undelay(task.peridot);
    if (
      peridotTarget &&
      task.do instanceof Location &&
      !get("_perilLocations").split(",").includes(`${task.do.id}`)
    ) {
      outfit.equip($item`Peridot of Peril`);
    } else {
      outfit.equip({ avoid: $items`Peridot of Peril` });
    }

    // Train sea lasso once per fight (round 1 only): macros restart each round, and
    // tryItem only guards hascombatitem — sea lasso is limited per combat.
    if (!undelay(task.freeaction) && isTrainingLasso() && isUnderwaterTask(task)) {
      combat.startingMacro(Macro.ifNot("pastround 1", Macro.tryItem($item`sea lasso`)));
      outfit.equip($item`sea cowboy hat`);
      outfit.equip($item`sea chaps`);
    }

    super.customize(task, outfit, combat, resources);

    // Breathing enforcement (spec §2/§8: mafia REFUSES underwater zones rather than
    // equipping for you — this is where the script does it).
    if (isUnderwaterTask(task) && !hasBreathingEffect()) {
      const hasBreathingGearInOutfit = Array.from(outfit.equips.values()).some((it) =>
        waterBreathingEquipment.includes(it),
      );
      if (!hasBreathingGearInOutfit) {
        const breather = preferredBreathingGear().find((item) => have(item));
        if (!breather) throw `Unable to provide player water breathing for ${task.name}`;
        outfit.equip(breather);
      }

      if (outfit.familiar && !outfit.familiar.underwater) {
        const famequip = outfit.equips.get($slot`familiar`) ?? $item.none;
        if (!familiarWaterBreathingEquipment.includes(famequip)) {
          const famBreather = familiarWaterBreathingEquipment.find((item) => have(item));
          if (!famBreather) throw `Unable to provide familiar water breathing for ${task.name}`;
          outfit.equips.set($slot`familiar`, famBreather);
        }
      }
    }
  }

  override createOutfit(task: Task): Outfit {
    // Strip gear/familiars the account doesn't own so Outfit.dress() can't throw
    // on aspirational equipment (salvaged from the old engine — its best part).
    const spec = undelay(task.outfit);
    if (spec === undefined) return new Outfit();

    if (spec instanceof Outfit) {
      const clone = spec.clone();
      for (const [slot, item] of Array.from(clone.equips.entries())) {
        if (!have(item) && item !== $item.none) {
          print(`Ignoring slot ${slot}: don't have ${item}`, "red");
          clone.equips.delete(slot);
        }
      }
      return clone;
    }

    if (spec.familiar && !have(spec.familiar)) {
      print(`Ignoring familiar ${spec.familiar}: not in terrarium`, "red");
      spec.familiar = $familiar.none;
    }
    for (const slotName of outfitSlots) {
      const itemOrItems = spec[slotName];
      if (!itemOrItems) continue;
      if (itemOrItems instanceof Item) {
        if (!have(itemOrItems)) {
          print(`Ignoring slot ${slotName}: don't have ${itemOrItems}`, "red");
          spec[slotName] = undefined;
        }
      } else if (!itemOrItems.some((it) => have(it))) {
        print(
          `Ignoring slot ${slotName}: don't have ${itemOrItems.map((it) => it.name).join(", ")}`,
          "red",
        );
        spec[slotName] = undefined;
      }
    }
    if (spec.equip) spec.equip = spec.equip.filter((it) => have(it));
    if (spec.avoid) spec.avoid = spec.avoid.filter((it) => have(it));

    return Outfit.from(spec, new Error(`Failed to build outfit for ${task.name}`));
  }

  override dress(task: Task, outfit: Outfit): void {
    super.dress(task, outfit);
    // Last-chance: if the maximizer's result still can't breathe, force it and verify.
    if (isUnderwaterTask(task) && !booleanModifier("Adventure Underwater")) {
      const breather = preferredBreathingGear().find((item) => have(item) && canEquip(item));
      if (!breather) throw `Unable to equip player water breathing for ${task.name}`;
      equip(breather);
      if (!booleanModifier("Adventure Underwater")) {
        throw `Failed to establish underwater breathing for ${task.name}`;
      }
    }
  }

  override do(task: Task): void {
    const propertyManager = this.propertyManager;
    super.do({
      ...task,
      do: () => {
        const peridotTarget = undelay(task.peridot);
        if (peridotTarget && haveEquipped($item`Peridot of Peril`)) {
          propertyManager.setChoice(1557, `1&bandersnatch=${peridotTarget.id}`);
        }
        if (task.do instanceof Location) return task.do;
        return task.do();
      },
    });
  }

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
  }

  override setChoices(task: Task, manager: PropertiesManager): void {
    super.setChoices(task, manager);
    // Outpost stashbox rotation: bounded, one pref, owned by the script (spec §8:
    // mafia tracks nothing for 313-315). Choice 312 is NOT set here — mafia
    // auto-writes choiceAdventure312 from the lockkey drop; the choice script
    // falls back if it's unset.
    manager.setChoices({ 315: (get("_subaqua_outpost_choices", 0) % 3) + 1 });
    if (equippedAmount($item`June cleaver`) > 0) {
      manager.setChoices({
        1467: 3,
        1468: get("_juneCleaverSkips", 0) < 5 ? 4 : 1,
        1469: !have($effect`Yapping Pal`) ? 1 : get("_juneCleaverSkips", 0) < 5 ? 4 : 1,
        1470: 2,
        1471: get("_juneCleaverSkips", 0) < 5 ? 4 : 1,
        1472: !have($item`trampled ticket stub`) ? 1 : get("_juneCleaverSkips", 0) < 5 ? 4 : 2,
        1473: get("_juneCleaverSkips", 0) < 5 ? 4 : 2,
        1474: get("_juneCleaverSkips", 0) < 5 ? 4 : 2,
        1475: get("_juneCleaverSkips", 0) < 5 ? 4 : 1,
      });
    }
  }

  override execute(task: Task): void {
    super.execute(task);
    if (get("lastChoice", 0) === 315) {
      set("_subaqua_outpost_choices", get("_subaqua_outpost_choices", 0) + 1);
    }
  }

  override initPropertiesManager(manager: PropertiesManager): void {
    super.initPropertiesManager(manager);
    const bannedRestorers = [
      "sleep on your clan sofa",
      "rest in your campaway tent",
      "rest at the chateau",
      "rest at your campground",
      "free rest",
    ];
    const hpItems = get("hpAutoRecoveryItems")
      .split(";")
      .filter((s) => !bannedRestorers.includes(s))
      .join(";");
    const mpItems = Array.from(
      new Set([...get("mpAutoRecoveryItems").split(";"), "doc galaktik's invigorating tonic"]),
    )
      .filter((s) => !bannedRestorers.includes(s))
      .join(";");
    manager.set({
      autoSatisfyWithCloset: false,
      // Spec §2: recovery is explicit restoreHp/restoreMp calls; auto-triggers off.
      hpAutoRecovery: -0.05,
      mpAutoRecovery: -0.05,
      maximizerCombinationLimit: 0,
      hpAutoRecoveryItems: hpItems,
      mpAutoRecoveryItems: mpItems,
      choiceAdventureScript: "subaqua_choice.js",
    });
  }
}
```

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/engine/engine.ts && git commit -m "feat: SubAquaEngine with stock scheduling and breathing enforcement"
```

---

### Task 7: Choice script bundle

**Files:**

- Create: `src/standalone/choice.ts`
- Modify: `rollup.config.ts` (add the bundle entry back)

**Interfaces:**

- Consumes: nothing at runtime from the main bundle (separate interpreter — state via prefs only).
- Produces: `subaqua_choice.js` registered by the engine (Task 6). Handles: generic safety choices, dart perks (1525), Möbius (1562), dreadscroll solve/submit (703), catalog card (704), outpost 312/315, Economist of Scales (310), 1565, doctor bag (1340), tavern (496/513/514/515), NEP (1322), Random Lack (182), Hidden City + Black Forest leftovers.

- [ ] **Step 1: Restore the salvaged file**

```bash
git show a8c4168:src/standalone/subaqua_choice.ts > src/standalone/choice.ts
```

- [ ] **Step 2: Apply the four spec-mandated fixes** in `src/standalone/choice.ts`:

**(a)** Delete the Violet Fog abort (copy-paste from another script; those choices don't occur here). Remove:

```ts
  } else if (choice >= 48 && choice <= 61) {
    abort();
```

and remove `abort` from the `kolmafia` import list.

**(b)** Choice 312 must defer to mafia's lockkey auto-answer (spec §8) — replace `runChoice(3);` in the `choice === 312` branch with:

```ts
// Mafia writes choiceAdventure312 (1/2/3) when the lockkey drops; 3 = healer default.
const lockkeyChoice = parseInt(getProperty("choiceAdventure312") || "3");
runChoice(lockkeyChoice >= 1 && lockkeyChoice <= 3 ? lockkeyChoice : 3);
```

**(c)** Bound the 315 stashbox rotation (the unbounded counter eventually submits invalid options) — replace the `choice === 315` branch body with:

```ts
const encounters = get("_subaqua_outpost_choices", 0);
set("_subaqua_outpost_choices", encounters + 1);
runChoice((encounters % 3) + 1);
```

**(d)** In the 704 branch, delete the debug `print(page);` line and add a fallback after the loop so the handler always answers (spec §6 invariant):

```ts
// All entries known: take the first card (stats) rather than stalling the choice.
runChoice(1);
```

- [ ] **Step 3: Re-add the bundle entry** — in `rollup.config.ts`, the `bundles` array becomes:

```ts
const bundles: Array<{ input: Record<string, string>; dir: string }> = [
  { input: { subaqua: "src/main.ts" }, dir: "dist/KoLmafia/scripts/subaqua" },
  {
    input: { subaqua_choice: "src/standalone/choice.ts" },
    dir: "dist/KoLmafia/scripts/subaqua",
  },
];
```

- [ ] **Step 4: Verify** — Run: `yarn check && yarn lint && yarn build`
      Expected: pass; `dist/KoLmafia/scripts/subaqua/subaqua_choice.js` exists. If lint flags unused imports after edit (a), remove them.

- [ ] **Step 5: Commit**

```bash
git add src/standalone/choice.ts rollup.config.ts
git commit -m "feat: choice script salvaged with 312/315/704 fixes"
```

---

### Task 8: Relay bundle

**Files:**

- Create: `src/relay.ts`
- Modify: `rollup.config.ts` (add the relay entry back)

**Interfaces:**

- Consumes: `args` (Task 2) via `Args.getMetadata` traversal.
- Produces: `relay_subaqua.js` — settings UI reflecting whatever `args.ts` declares.

- [ ] **Step 1: Restore and simplify**

```bash
git show a8c4168:src/relay.ts > src/relay.ts
```

Then remove the workshed hack (new args has no workshed option): delete the import of `$item` from `libram`, delete `supportedWorksheds` from the `./args` import (keep `args`), and delete this block from `convertArgsToHtml`:

```ts
      } else if (name === "workshed" || name === "swapworkshed") {
        // Hardcoded hack; show workshed options
        component.type = "dropdown";
        component.dropdown = supportedWorksheds.map((i) => {
          const name = i === $item`none` ? "none" : i.name;
          return { display: name, value: name };
        });
```

- [ ] **Step 2: Re-add the bundle entry** — append to the `bundles` array in `rollup.config.ts`:

```ts
  { input: { relay_subaqua: "src/relay.ts" }, dir: "dist/KoLmafia/relay" },
```

- [ ] **Step 3: Verify** — Run: `yarn check && yarn lint && yarn build`
      Expected: pass; `dist/KoLmafia/relay/relay_subaqua.js` exists.

- [ ] **Step 4: Commit**

```bash
git add src/relay.ts rollup.config.ts && git commit -m "feat: relay settings UI over rebuilt args"
```

---

### Task 9: Sim checklist

**Files:**

- Create: `src/sim.ts`

**Interfaces:**

- Consumes: `detectTier` (Task 3).
- Produces: `printSimChecklist(): void` — no purchases, no turns, no server writes. Called by `main.ts` (Task 10).

- [ ] **Step 1: Write `src/sim.ts`** (lists ported from `iotm.ash:1449-1551` `iotmChecklist`/`pullChecklist` plus the spec §7 pre-ascension block; `yarn lint` validates every name — if the libram plugin auto-corrects capitalization via `yarn format`, accept its fixes)

```ts
import { getCampground, getWorkshed, isTradeable, Item, print, storageAmount } from "kolmafia";
import { $familiars, $item, $items, $skill, $skills, EternityCodpiece, get, have } from "libram";

import { detectTier } from "./lib/tier";

const supportedIotms = $items`Monodent of the Sea, The Eternity Codpiece, closed-circuit pay phone, 2002 Mr. Store Catalog, cursed monkey's paw, august scepter, Fourth of May Cosplay Saber, Peridot of Peril, blood cubic zirconia, baseball diamond, Heartstone, backup camera, Jurassic Parka, spring shoes, Everfull Dart Holster, Mayam Calendar, Leprecondo, Cincho de Mayo, McHugeLarge duffel bag, Apriling band helmet, April Shower Thoughts shield, bat wings, server room key, Time-Spinner, January's Garbage Tote, Powerful Glove, combat lover's locket, Lil' Doctor™ bag, mumming trunk, Kremlin's Greatest Briefcase, Cargo Cultist Shorts, Eight Days a Week Pill Keeper, Sept-Ember Censer, vampyric cloake, unwrapped knock-off retro superhero cape, roman candelabra, miniature crystal ball, latte lovers member's mug, V for Vivala mask, designer sweatpants, tearaway pants, autumn-aton, cosmic bowling ball`;

const supportedSkills = $skills`Just the Facts, Map the Monsters, Macrometeorite, Feel Nostalgic`;

const supportedFamiliars = $familiars`Grouper Groupie, Red-Nosed Snapper, Jill-of-All-Trades, Chest Mimic, Patriotic Eagle, Sword of S Words, Peace Turkey, Disgeist, Jumpsuited Hound Dog, Glover, Foul Ball, Space Jellyfish, Pocket Professor, Tiny Plastic Santa Claus Skeleton`;

const routePulls = $items`Mer-kin sneakmask, sea lasso, shark jumper, scale-mail underwear, Congressional Medal of Insanity, Flash Liquidizer Ultra Dousing Accessory, Mer-kin digpick, lodestone, comb jelly, Elf Guard SCUBA tank, rusty rivet, sea cowbell, Mer-kin prayerbeads, Mer-kin healscroll, Mer-kin killscroll, Mer-kin worktea, Mer-kin knucklebone, Mer-kin cheatsheet, Mer-kin hallpass, Mer-kin hidepaint, pro skateboard, software glitch, pulled yellow taffy, stuffed yam stinkbomb, waffle, skate blade, null-day exploit, New Age healing crystal, soggy used band-aid, damp old wallet, fish sauce, Aldebaran sardines, pie man was not meant to eat, handheld Allied radio, Clara's bell, stench jelly, peppermint parasol, ink bladder, Mer-kin pinkslip, Louder Than Bomb, anchor bomb`;

const catalogCovered = $items`pro skateboard, software glitch`;

function checkRow(owned: boolean, label: string, note = ""): number {
  print(`${owned ? "✓" : "✗"} ${label}${note ? ` — ${note}` : ""}`, owned ? "blue" : "red");
  return owned ? 1 : 0;
}

function haveAnywhere(item: Item): boolean {
  return have(item) || storageAmount(item) > 0;
}

export function printSimChecklist(): void {
  let owned = 0;
  let total = 0;

  print("IOTM check — supported IOTMs:");
  for (const item of supportedIotms) {
    total++;
    owned += checkRow(haveAnywhere(item), item.name);
  }
  for (const skill of supportedSkills) {
    total++;
    const has =
      have(skill) || (skill === $skill`Macrometeorite` && have($item`Pocket Meteor Guide`));
    owned += checkRow(has, skill.name);
  }
  for (const familiar of supportedFamiliars) {
    total++;
    owned += checkRow(have(familiar), familiar.name);
  }
  total++;
  owned += checkRow(
    getWorkshed() !== $item.none ||
      have($item`Asdon Martin keyfob (on ring)`) ||
      have($item`model train set`) ||
      have($item`portable Mayo Clinic`) ||
      have($item`TakerSpace letter of Marque`),
    "a workshed",
  );
  total++;
  // getCampground() is keyed by item NAME strings; the $item tag still lint-validates the name.
  owned += checkRow($item`Source terminal`.name in getCampground(), "Source Terminal");
  print(`IOTM check: ${owned} of ${total} supported IOTMs owned.`);

  print("");
  print("Pull check — Hagnk's stock:");
  for (const item of routePulls) {
    if (have($item`2002 Mr. Store Catalog`) && catalogCovered.includes(item)) continue;
    if (item === $item`Congressional Medal of Insanity` && !haveAnywhere(item)) {
      print(`✗ ${item.name} — optional, the script won't buy one`, "red");
      continue;
    }
    if (haveAnywhere(item)) print(`✓ ${item.name}`, "blue");
    else if (isTradeable(item))
      print(`✗ ${item.name} — will be mall-bought if the route needs it`, "red");
    else print(`✗ ${item.name} — NOT mall-buyable, acquire before it's needed`, "red");
  }

  print("");
  print("Pre-ascension checklist (spec §7 / wiki strategy):");
  const pearl = $item`unblemished pearl`;
  const pearlsLoaded = EternityCodpiece.have()
    ? EternityCodpiece.currentGems().filter((gem) => gem === pearl).length
    : 0;
  checkRow(pearlsLoaded >= 5, `5 unblemished pearls in the codpiece (${pearlsLoaded}/5)`);
  checkRow(have($skill`Deep Dark Visions`), "Deep Dark Visions permed (dreadScroll3 source)");
  checkRow($item`sushi-rolling mat`.name in getCampground(), "sushi-rolling mat installed");
  checkRow(get("mapToAnemoneMinePurchased"), "Anemone Mine unlocked");
  checkRow(get("mapToTheMarinaraTrenchPurchased"), "The Marinara Trench unlocked");
  checkRow(get("mapToTheDiveBarPurchased"), "The Dive Bar unlocked");
  checkRow(get("mapToMadnessReefPurchased"), "Madness Reef unlocked");
  checkRow(get("mapToTheSkateParkPurchased"), "The Skate Park unlocked");

  print("");
  print(`Tier verdict (auto-detect): ${detectTier()}`, "blue");
}
```

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass. Name mismatches (e.g. trademark glyphs, capitalization) are exactly what eslint-plugin-libram exists to catch: run `yarn format` to auto-fix unambiguous ones; fix any remainder by checking the name in `node_modules/kolmafia/index.d.ts` data or the item in libram's typings — do not guess.

- [ ] **Step 3: Commit**

```bash
git add src/sim.ts && git commit -m "feat: sim readiness checklist"
```

---

### Task 10: Runplan skeleton + full main wiring

**Files:**

- Create: `src/tasks/runplans.ts`
- Modify: `src/main.ts` (replace the stub)

**Interfaces:**

- Consumes: `args` (2), `currentTier`/`Tier`/`debug` (3), `Task` (4), `SubAquaEngine` (6), `printSimChecklist` (9).
- Produces: `buildRunplan(tier: Tier): Task[]` (empty this phase; Phases 3–4 fill it), and the real `main()`. Deliverable: `subaqua sim` works anywhere; `subaqua` in-path reports an empty route and exits cleanly; `subaqua list` prints the (empty) plan.

- [ ] **Step 1: Write `src/tasks/runplans.ts`**

```ts
import { Task } from "../engine/task";
import { Tier } from "../lib/tier";

/**
 * One composition per tier (spec §3). Phases 3-4 populate these from the shared
 * task-factory catalog; the foundation ships an empty route so the engine loop,
 * list mode, and destruct paths are exercised end-to-end.
 */
export function buildRunplan(tier: Tier): Task[] {
  switch (tier) {
    case "low":
    case "mid":
    case "high":
      return [];
  }
}
```

- [ ] **Step 2: Replace `src/main.ts`**

```ts
import { Args } from "grimoire-kolmafia";
import { abort, cliExecute, myPath, print, turnsPlayed } from "kolmafia";
import { $path, get, sinceKolmafiaRevision } from "libram";

import { args } from "./args";
import { SubAquaEngine } from "./engine/engine";
import { currentTier } from "./lib/tier";
import { printSimChecklist } from "./sim";
import { buildRunplan } from "./tasks/runplans";

const seaPath = $path`11,037 Leagues Under the Sea`;

export function main(command = ""): void {
  sinceKolmafiaRevision(29057);

  Args.fill(args, command);
  if (args.help) {
    Args.showHelp(args);
    return;
  }
  if (args.version) {
    print(`subaqua build ${process.env.GITHUB_SHA} (${process.env.GITHUB_REF_NAME})`, "blue");
    return;
  }

  if (args.command === "sim") {
    printSimChecklist();
    return;
  }
  if (args.command !== "run") {
    abort(`Unknown command "${args.command}". Try "subaqua help".`);
  }

  // Path-only script (spec scope): every my_path()==0 branch of the ash is cut.
  if (myPath() !== seaPath) {
    abort(
      "subaqua only runs inside the 11,037 Leagues Under the Sea path. " +
        'Use "subaqua sim" for the pre-ascension checklist.',
    );
  }
  if (!get("autoSatisfyWithNPCs")) {
    abort("subaqua requires autoSatisfyWithNPCs. Run: set autoSatisfyWithNPCs = true");
  }

  const tier = currentTier();
  print(`Shiny tier: ${tier}`, "blue");
  const tasks = buildRunplan(tier);

  if (args.list) {
    print(`Runplan (${tier}): ${tasks.length} tasks`, "blue");
    for (const task of tasks) {
      print(`${task.completed() ? "✓" : "○"} ${task.name}`, task.completed() ? "gray" : "blue");
    }
    return;
  }

  if (tasks.length === 0) {
    print("Runplan is empty — quest phases arrive in later milestones.", "red");
    return;
  }

  const startTurns = turnsPlayed();
  const engine = new SubAquaEngine(tasks);
  try {
    engine.run(args.actions);
  } finally {
    engine.destruct();
  }

  const remaining = tasks.filter((task) => !task.completed());
  print(`Spent ${turnsPlayed() - startTurns} turns; ${remaining.length} tasks remaining.`, "blue");
  if (remaining.length === 0 && args.postloopCommand !== "") {
    print(`Route complete — running: ${args.postloopCommand}`, "blue");
    cliExecute(args.postloopCommand);
  }
}
```

- [ ] **Step 3: Verify** — Run: `yarn check && yarn lint && yarn build`
      Expected: all pass; three bundles in `dist/`.

- [ ] **Step 4: Smoke test (user, in mafia)**

Run: `yarn mafia` then in the gCLI: `subaqua sim` (any account state) and `subaqua help`.
Expected: checklist prints with ✓/✗ rows and a tier verdict; help shows only the Task-2 args. In-path, bare `subaqua` prints the tier and the empty-route notice.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/tasks/runplans.ts
git commit -m "feat: main wiring with runplan skeleton, list and actions modes"
```

---

## Phase exit criteria

- `yarn check`, `yarn lint`, `yarn build` all green; three bundles produced.
- `subaqua sim` runs on a real account without touching state.
- Known deferrals (tracked, not gaps): the remaining spec-§2 `post()` duties — poison cure,
  dolphin-whistle decision (`dolphinItem`), junk autosell, and the dreadscroll narrowing hook —
  land in Phases 3–4 alongside the tasks that generate those situations.
- Engine, breathing enforcement, choice script, and relay exist and are wired, ready for Phase 2 (resources layer: `resources/{saber,summon,ncforce,banish,freekill,freerun,pulls}.ts` + `ResourcePolicy`), Phase 3 (monkee spine), Phase 4 (sorceress + dreadscroll + runplans + README).
