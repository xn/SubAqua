# SubAqua Phase 2: Resources Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the iotm.ash port — seven `resources/` modules plus `ResourcePolicy` — and wire the engine's `customize()` so abstract combat actions (`banish`, `killFree`, `freeRun`, `yellowRay`, `forceItems`) resolve against real, tier-aware ladders instead of degrading.

**Architecture:** Per `docs/superpowers/specs/2026-08-11-subaqua-design.md` §2–§4 (read §4 first). Each module encodes *this route's priorities* on top of libram's mechanics: budget/ladder data with `available()`/`remaining()`, selected by ordered search, tier-varied only through the `ResourcePolicy` object (spec §3 principle: tier logic lives in runplans + policy, nowhere else). Ash facts below were verified against `../UnderTheSea` source (iotm.ash / UnderTheSea.ash / UnderTheSeaCCS.ash) and libram 0.11.23 source on 2026-08-12; ash line references are cited so reviewers can spot-check.

**Tech Stack:** TypeScript on grimoire-kolmafia 0.3.33 / libram 0.11.23 / kolmafia typings, rollup (three CJS bundles, Rhino 1.8.0), yarn 4.

## Global Constraints

- Runs inside KoLmafia's Rhino JS runtime — **no Node APIs**, `kolmafia` stays `external` in rollup.
- Script-owned prefs use `subaqua_` (persistent) / `_subaqua_` (daily) namespaces. This phase writes **no new script prefs** — every counter here is a mafia-native pref.
- `$item`/`$effect`/`$skill`/`$location` template constants must be **module-level** (eslint-plugin-libram). Never invent game names — the names below were pre-verified where possible, but `yarn lint` is the authority; if it rejects one, find the real name in `node_modules/kolmafia/index.d.ts` data / kolmafia's `src/data/*.txt` (checkout at `../kolmafia`) and report the correction. Do not guess.
- **No `user_confirm`/blocking dialogs.** The ash `pullSequence()`'s price prompt becomes `buyLimit()` + abort-with-instructions (spec §4).
- **No adventuring from engine hooks.** `summon()` may adventure (Overgrown Lot wish farm) because it is invoked from task context only — its doc comment must say so.
- Explicit fallbacks, never silent: every ladder's ordering and every degradation is commented with its ash source.
- Verification cycle: `yarn check` (tsc), `yarn lint`, `yarn build` (Task 9 only for build). No unit-test runner exists; nothing in the `kolmafia` package executes outside mafia.
- Commit after every task.

## File Structure (this phase)

```
src/
  lib/index.ts         MODIFY: + haveAnywhere()
  sim.ts               MODIFY: use lib's haveAnywhere (drop local copy)
  resources/
    resource.ts        shared Resource/CombatResource interfaces (salvage a8c4168, remaining promoted)
    policy.ts          ResourcePolicy + policyForTier + currentPolicy
    pulls.ts           pullSequence / reservedPulls / budget gates
    saber.ts           Force budget: cascading reservations, purpose grants
    summon.ts          summonsAvailable + summon() ladder (locket→fax→mimic→wish)
    banish.ts          banish sources + record parsing + pickBanishSource
    freekill.ts        free-kill ladder + bczCost + selectFreeKill/selectYellowRay
    freerun.ts         free-run ladder + selectFreeRun (falls back to free kill)
    ncforce.ts         ncForceEstimate + combat/noncombat forcer ladders + forceNextNoncombat
  engine/
    combat.ts          MODIFY: comment update (defaults are now the fallback tier)
    engine.ts          MODIFY: customize() resolves actions via the ladders
```

Cross-task naming contract (spec §Self-Review): `haveAnywhere(item)`, `currentPolicy()`, `policyForTier(tier)`, `pullSequence(item)`, `pulledToday(item)`, `reservedPulls()`, `pullBudgetAllows(item)`, `discretionaryPull(item)`, `saberChargesLeft()`, `saberAllowedAt(loc)`, `forceGranted(purpose, loc?)`, `saberForcesFree()`, `summonsAvailable()`, `summon(monster)`, `banishSources`, `pickBanishSource(loc?)`, `banishedBy(source)`, `selectFreeKill(opts)`, `selectYellowRay()`, `selectFreeRun(opts)`, `ncForceEstimate()`, `forceNextNoncombat()`, `combatNCForceSources`, `ncForceSources`.

---

### Task 1: Shared resource types, ResourcePolicy, haveAnywhere

**Files:**
- Create: `src/resources/resource.ts`, `src/resources/policy.ts`
- Modify: `src/lib/index.ts`, `src/sim.ts`

**Interfaces:**
- Consumes: `Tier`/`currentTier` (Phase 1 `lib/tier.ts`).
- Produces: `interface Resource {name, available(), remaining(), prepare?, equip?}`, `type CombatResource = Resource & BaseCombatResource`; `type ResourcePolicy {freeKillMode, allowClubEmBackInTime, allowDiscretionaryPulls}`, `policyForTier(tier)`, `currentPolicy()`; `haveAnywhere(item)` exported from `src/lib/index.ts`.

- [ ] **Step 1: Write `src/resources/resource.ts`**

```ts
import { CombatResource as BaseCombatResource, OutfitSpec } from "grimoire-kolmafia";
import { Familiar, Item } from "kolmafia";

/**
 * Shared vocabulary for every resources/ ladder. Salvaged from the old repo's
 * src/engine/resource.ts (a8c4168): `remaining` is promoted into the base
 * interface so each ladder stops bolting it on locally; the unused
 * `effect`/`chance` fields are dropped.
 */
export interface Resource {
  name: string;
  available: () => boolean;
  remaining: () => number;
  prepare?: () => void;
  equip?: Item | Familiar | OutfitSpec | OutfitSpec[];
}

/** A Resource grimoire can splice into a combat macro via resources.provide(). */
export type CombatResource = Resource & BaseCombatResource;
```

- [ ] **Step 2: Write `src/resources/policy.ts`**

```ts
import { currentTier, Tier } from "../lib/tier";

/**
 * Spec §3: tier logic lives in exactly two places — the runplans (route
 * membership, Phase 3) and this policy object (resource behavior). These
 * fields replace the ash's lowShiny()/highShiny() call sites inside resource
 * systems; route-level tier sites become runplan composition, not policy
 * fields, and land in Phase 3.
 */
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
};

const policies: Record<Tier, ResourcePolicy> = {
  low: { freeKillMode: "full", allowClubEmBackInTime: false, allowDiscretionaryPulls: false },
  mid: { freeKillMode: "full", allowClubEmBackInTime: true, allowDiscretionaryPulls: true },
  high: { freeKillMode: "dartsOnly", allowClubEmBackInTime: false, allowDiscretionaryPulls: true },
};

export function policyForTier(tier: Tier): ResourcePolicy {
  return policies[tier];
}

export function currentPolicy(): ResourcePolicy {
  return policyForTier(currentTier());
}
```

- [ ] **Step 3: Add `haveAnywhere` to `src/lib/index.ts`** — change the imports and append the function. The file currently starts:

```ts
import { print } from "kolmafia";
import { get } from "libram";
```

Replace those two lines with:

```ts
import { Item, print, storageAmount } from "kolmafia";
import { get, have } from "libram";
```

Append at the end of the file:

```ts
/** Ash have_item(): owned anywhere useful — inventory/equipped (libram have)
 * or still in Hagnk's. The resource ladders and sim share this definition. */
export function haveAnywhere(item: Item): boolean {
  return have(item) || storageAmount(item) > 0;
}
```

- [ ] **Step 4: Point `src/sim.ts` at the shared helper** — delete its private copy:

```ts
function haveAnywhere(item: Item): boolean {
  return have(item) || storageAmount(item) > 0;
}
```

Add `import { haveAnywhere } from "./lib";` alongside the existing `import { detectTier } from "./lib/tier";`, and remove `Item` and `storageAmount` from the `kolmafia` import list if nothing else in the file uses them (nothing does today; `yarn lint` will confirm).

- [ ] **Step 5: Verify** — Run: `yarn check && yarn lint` — Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/resources src/lib/index.ts src/sim.ts
git commit -m "feat: resource interfaces, ResourcePolicy, shared haveAnywhere"
```

---

### Task 2: Pull bookkeeping

**Files:**
- Create: `src/resources/pulls.ts`

**Interfaces:**
- Consumes: `buyLimit`, `haveAnywhere` (lib); `currentPolicy` (Task 1).
- Produces: `pulledToday(item)`, `pullSequence(item): boolean`, `reservedPulls(): number`, `pullBudgetAllows(item): boolean`, `discretionaryPull(item): boolean`.

- [ ] **Step 1: Write `src/resources/pulls.ts`**

```ts
import {
  abort,
  availableAmount,
  Item,
  mallPrice,
  pullsRemaining,
  storageAmount,
  takeStorage,
  toInt,
  buyUsingStorage,
} from "kolmafia";
import { $effect, $item, $items, get, have } from "libram";

import { buyLimit } from "../lib";
import { currentPolicy } from "./policy";

/** _roninStoragePulls holds today's pulled item ids, comma-separated. Exact-id
 * membership needs the comma-wrap trick (iotm.ash:368): id 360 must not
 * substring-match a list containing 3604. */
export function pulledToday(item: Item): boolean {
  return `,${get("_roninStoragePulls")},`.includes(`,${toInt(item)},`);
}

/** Ash pullSequence() (iotm.ash:363-379) minus its user_confirm: the
 * mall-price guard aborts with instructions instead of prompting (spec §4).
 * Returns false when the pull is unavailable (already pulled today / no pulls
 * left) so callers fall back to farming, exactly like the ash. */
export function pullSequence(item: Item): boolean {
  if (pullsRemaining() === 0) return false;
  if (pulledToday(item)) return false;
  if (storageAmount(item) === 0) {
    const price = mallPrice(item);
    if (price > buyLimit()) {
      abort(
        `${item.name} costs ${price} meat in the mall, over your buy limit of ${buyLimit()}. ` +
          `Raise buyLimit= (or autoBuyPriceLimit), or put one in Hagnk's yourself, then rerun.`,
      );
    }
    buyUsingStorage(1, item);
  }
  return takeStorage(1, item);
}

type PullReservation = {
  name: string;
  /** The pull that would satisfy this reservation. */
  item: Item;
  /** Recomputed live; the reservation releases the moment the need lapses. */
  needed: () => boolean;
};

const escapeGear = $items`peppermint parasol, navel ring of navel gazing, Greatest American Pants`;

/**
 * Ash reservedPulls() (UnderTheSea.ash:181-235). Each item can be pulled once
 * per day in-run, so every entry reserves at most one slot. The Shub null-day
 * exploit entry is deliberately absent: it needs shubPrepShort()'s delevel
 * math, which lands with Phase 4's sorceress module — Phase 4 adds that entry
 * here. The first two entries skip the pulled-today check on purpose,
 * mirroring the ash (any of the three escape items serves; shavings are
 * farmable).
 */
const pullReservations: PullReservation[] = [
  {
    name: "escape gear",
    item: $item`peppermint parasol`,
    needed: () => !escapeGear.some((it) => availableAmount(it) > 0),
  },
  {
    name: "crayon shavings",
    item: $item`crayon shavings`,
    needed: () => availableAmount($item`crayon shavings`) < 9,
  },
  {
    name: "Mer-kin pinkslip",
    item: $item`Mer-kin pinkslip`,
    needed: () =>
      availableAmount($item`Mer-kin pinkslip`) === 0 && !pulledToday($item`Mer-kin pinkslip`),
  },
  {
    name: "Mer-kin prayerbeads",
    item: $item`Mer-kin prayerbeads`,
    needed: () =>
      availableAmount($item`Mer-kin prayerbeads`) < 3 && !pulledToday($item`Mer-kin prayerbeads`),
  },
  {
    name: "sea cowbell",
    item: $item`sea cowbell`,
    needed: () => availableAmount($item`sea cowbell`) < 3 && !pulledToday($item`sea cowbell`),
  },
  {
    name: "ink bladder",
    item: $item`ink bladder`,
    needed: () => availableAmount($item`ink bladder`) === 0 && !pulledToday($item`ink bladder`),
  },
  {
    name: "comb jelly",
    item: $item`comb jelly`,
    needed: () =>
      !have($effect`Jelly Combed`) &&
      availableAmount($item`comb jelly`) === 0 &&
      !pulledToday($item`comb jelly`),
  },
  {
    // Skate-war Fishy: hold the blade while the war is live and Holey Rollers
    // hasn't been queued (ash also gated on path 55 — always true here).
    name: "skate blade",
    item: $item`skate blade`,
    needed: () =>
      get("skateParkStatus") === "war" &&
      !get("noncombatQueue").includes("Holey Rollers") &&
      availableAmount($item`skate blade`) === 0 &&
      !pulledToday($item`skate blade`),
  },
];

export function reservedPulls(): number {
  return pullReservations.filter((reservation) => reservation.needed()).length;
}

/** Budget gate. Strict `>` for discretionary pulls; `>=` when the requested
 * item is itself a live reservation — its slot is already inside the count, so
 * `>` would deadlock the reservation against its own pull. The ash documents
 * this exact trap at the skate-blade site (UnderTheSea.ash:1331-1333); this
 * generalizes it to every reserved item. */
export function pullBudgetAllows(item: Item): boolean {
  const isOwnReservation = pullReservations.some(
    (reservation) => reservation.item === item && reservation.needed(),
  );
  return isOwnReservation
    ? pullsRemaining() >= reservedPulls()
    : pullsRemaining() > reservedPulls();
}

/** Policy- and budget-gated convenience for non-essential pulls (low shiny
 * farms instead — ash `lowShiny() == false && pulls_remaining() >
 * reservedPulls()`). Reserved pulls call pullSequence directly after a
 * pullBudgetAllows check. */
export function discretionaryPull(item: Item): boolean {
  if (!currentPolicy().allowDiscretionaryPulls) return false;
  if (!pullBudgetAllows(item)) return false;
  return pullSequence(item);
}
```

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass. (`noncombatQueue` and `skateParkStatus` are typed libram prefs; if lint flags `navel ring of navel gazing` or `Greatest American Pants` capitalization, correct per the game data and report.)

- [ ] **Step 3: Commit**

```bash
git add src/resources/pulls.ts && git commit -m "feat: pull bookkeeping with reservation economics"
```

---

### Task 3: Saber Force budget

**Files:**
- Create: `src/resources/saber.ts`

**Interfaces:**
- Consumes: `haveAnywhere` (lib).
- Produces: `saberChargesLeft()`, `saberAllowedAt(loc)`, `diverHuntActive()`, `prayerbeadsShort()`, `seaCowNeeded()`, `forcesAfterDiver()`, `forcesAfterHealer()`, `saberForcesFree()`, `type ForcePurpose`, `forceGranted(purpose, loc?)`.

- [ ] **Step 1: Write `src/resources/saber.ts`**

```ts
import { availableAmount, itemAmount, Location } from "kolmafia";
import { $item, $items, $location, get } from "libram";

import { haveAnywhere } from "../lib";

const saber = $item`Fourth of May Cosplay Saber`;

/** Breathing hats the diver hunt exists to replace — once any is owned the
 * diver reservation releases (iotm.ash diverHuntActive(), :123-132). */
const diverPayoffGear = $items`Mer-kin gladiator mask, Mer-kin scholar mask, crappy Mer-kin mask, aerated diving helmet, Elf Guard SCUBA tank`;

export function saberChargesLeft(): number {
  if (!haveAnywhere(saber)) return 0;
  return Math.max(0, 5 - get("_saberForceUses"));
}

/** Forcing burns no turn but forfeits the win — safe only where zone progress
 * is item-gated. The Outpost's lockkey progress gates on turns spent, so
 * Forces are banned there (iotm.ash saberZone()). */
export function saberAllowedAt(location: Location): boolean {
  return location !== $location`The Mer-Kin Outpost`;
}

export function diverHuntActive(): boolean {
  return itemAmount($item`rusty rivet`) < 8 && !diverPayoffGear.some((it) => haveAnywhere(it));
}

export function prayerbeadsShort(): boolean {
  return availableAmount($item`Mer-kin prayerbeads`) < 3;
}

export function seaCowNeeded(): boolean {
  return (
    availableAmount($item`sea leather`) +
      availableAmount($item`sea chaps`) +
      availableAmount($item`sea cowboy hat`) <
      2 || availableAmount($item`sea cowbell`) < 3
  );
}

/**
 * The reservation chain (iotm.ash:149-174): each tier sees only what remains
 * after every higher tier's live reservation — diver ×2, then outpost healer
 * ×1, then sea cow ×1; the leftovers are free for researcher/free-run use.
 * Reservations are recomputed on every call and release when their need-check
 * goes false; the only consumed state is mafia's _saberForceUses.
 */
export function forcesAfterDiver(): number {
  return saberChargesLeft() - (diverHuntActive() ? 2 : 0);
}

export function forcesAfterHealer(): number {
  return forcesAfterDiver() - (prayerbeadsShort() ? 1 : 0);
}

export function saberForcesFree(): number {
  return forcesAfterHealer() - (seaCowNeeded() ? 1 : 0);
}

export type ForcePurpose = "diver" | "healer" | "seaCow" | "researcher" | "free";

/** May this purpose spend a Force right now? Higher-priority purposes always
 * see their own reservation; lower ones only the leftovers. The ash's
 * seaCowForce McTwist/opener skips are combat-context guards and live with
 * the Phase 3 combat builders, not here. */
export function forceGranted(purpose: ForcePurpose, location?: Location): boolean {
  if (location && !saberAllowedAt(location)) return false;
  switch (purpose) {
    case "diver":
      return diverHuntActive() && saberChargesLeft() > 0;
    case "healer":
      return prayerbeadsShort() && forcesAfterDiver() > 0;
    case "seaCow":
      return seaCowNeeded() && forcesAfterHealer() > 0;
    case "researcher":
    case "free":
      return saberForcesFree() > 0;
  }
}
```

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/resources/saber.ts && git commit -m "feat: saber Force budget with cascading reservations"
```

---

### Task 4: Summon ladder

**Files:**
- Create: `src/resources/summon.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (libram + kolmafia only).
- Produces: `summonsAvailable(): number`, `summon(target: Monster): void`.

- [ ] **Step 1: Write `src/resources/summon.ts`**

```ts
import {
  abort,
  adv1,
  canFaxbot,
  cliExecute,
  equip,
  faxbot,
  handlingChoice,
  itemAmount,
  lastChoice,
  Monster,
  myClass,
  runChoice,
  runCombat,
  use,
} from "kolmafia";
import {
  $class,
  $familiar,
  $item,
  $location,
  $monster,
  $skill,
  ChestMimic,
  CombatLoversLocket,
  get,
  have,
  set,
} from "libram";

const mimic = $familiar`Chest Mimic`;

/** Ash count_summons() (UnderTheSea.ash:580-591): banked monster-summon
 * charges across fax, locket, and mimic eggs. Feeds Phase 3's opener
 * decisions and retry-loop guards. */
export function summonsAvailable(): number {
  let n = 0;
  if (!get("_photocopyUsed")) n += 1;
  if (CombatLoversLocket.have()) n += CombatLoversLocket.reminiscesLeft();
  if (have(mimic)) n += Math.floor(mimic.experience / 200);
  return n;
}

/** Just the Facts: an Accordion Thief's fact for the Overgrown Lot's sewer
 * snake is a pocket wish drop; the Peridot steers the zone onto it (iotm.ash
 * wantedMonster table :76, target id 1752). Bounded, and called only from
 * task context — resource modules never adventure from engine hooks (spec
 * §2). */
function farmPocketWish(): void {
  if (myClass() !== $class`Accordion Thief`) return;
  const lot = $location`The Overgrown Lot`;
  const snake = $monster`sewer snake with a sewer snake in it`;
  for (let tries = 0; tries < 5 && itemAmount($item`pocket wish`) === 0; tries++) {
    if (
      have($item`Peridot of Peril`) &&
      !get("_perilLocations").split(",").includes(`${lot.id}`)
    ) {
      equip($item`Peridot of Peril`);
      set("choiceAdventure1557", `1&bandersnatch=${snake.id}`);
    }
    adv1(lot, -1, "");
  }
}

/**
 * The summon ladder (ash summon(), UnderTheSea.ash:1597-1634): locket
 * reminisce → fax (3 attempts) → mimic egg (libram ChestMimic replaces the
 * c2t_megg dependency) → pocket wish/genie (with the AT Overgrown Lot farm) →
 * abort. Starts a fight against `target`; the active combat handler owns the
 * fight. Every fallback is explicit; the final abort means the account has no
 * summon source left, which is a routing error upstream.
 */
export function summon(target: Monster): void {
  if (CombatLoversLocket.canReminisce(target)) {
    CombatLoversLocket.reminisce(target);
    return;
  }
  if (!get("_photocopyUsed") && canFaxbot(target)) {
    if (faxbot(target) || faxbot(target) || faxbot(target)) {
      use($item`photocopied monster`);
      runCombat();
      return;
    }
  }
  if (have(mimic) && mimic.experience > 200) {
    if (ChestMimic.differentiableQuantity(target) === 0) ChestMimic.receive(target);
    if (ChestMimic.differentiableQuantity(target) === 0) {
      abort(`Failed to extract a mimic egg for ${target.name}. Rerun; if it repeats, summon it manually.`);
    }
    ChestMimic.differentiate(target);
    // A Force cast mid-egg-fight can strand choice 1387; answer it (ash parity).
    if (handlingChoice() && lastChoice() === 1387) runChoice(3);
    return;
  }
  if (have($skill`Just the Facts`)) {
    if (itemAmount($item`pocket wish`) === 0) farmPocketWish();
    if (itemAmount($item`pocket wish`) > 0) {
      cliExecute(`genie monster ${target.name}`);
      runCombat();
      return;
    }
  }
  abort(`No summon source left for ${target.name} (locket, fax, mimic egg, and pocket wish all unavailable).`);
}
```

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/resources/summon.ts && git commit -m "feat: summon ladder over locket/fax/mimic/wish"
```

---

### Task 5: Banish framework

**Files:**
- Create: `src/resources/banish.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `type BanishSource`, `banishSources`, `banishedBy(source)`, `banishActive(target)`, `pickBanishSource(location?)`.

- [ ] **Step 1: Write `src/resources/banish.ts`**

Design note (spec deviation, deliberate): the spec names libram's `getBanishedMonsters()`, but its internal banisher-name→`Item|Skill` mapping cannot represent all four of our sources distinctly (verified in libram source: `"sea *dent"` is special-cased, but `"Spring Kick"`/`"Heartstone"` fall through `toItem`, which mismaps skill-name banishers). We parse mafia's `banishedMonsters` pref directly with the ash's literal-prefix matching (iotm.ash banished(), :1096-1100) — same data, faithful semantics. Record format is flat colon-separated triplets `monster:banisher:turn`.

```ts
import { appearanceRates, Item, Location, Monster, Skill, toMonster } from "kolmafia";
import { $item, $skill, get, have } from "libram";

export type BanishSource = {
  /** Literal prefix mafia records in the banishedMonsters pref. */
  name: string;
  skill: Skill;
  /** Gear that must be worn to cast it (snokebomb needs none). */
  equip?: Item;
  available: () => boolean;
};

/** Ash banMap (iotm.ash:1073-1085) plus snokebomb, which the ash kept outside
 * its gear map (no item) but uses as a banish in free_run(banish=true). Order
 * is the ash's gear-picker order; snokebomb last. */
export const banishSources: BanishSource[] = [
  {
    name: "Spring Kick",
    skill: $skill`Spring Kick`,
    equip: $item`spring shoes`,
    available: () => have($item`spring shoes`),
  },
  {
    name: "Sea *dent",
    skill: $skill`Sea *dent: Throw a Lightning Bolt`,
    equip: $item`Monodent of the Sea`,
    available: () => have($item`Monodent of the Sea`),
  },
  {
    name: "Heartstone",
    skill: $skill`Heartstone: %banish`,
    equip: $item`Heartstone`,
    available: () => have($item`Heartstone`) && get("heartstoneBanishUnlocked"),
  },
  {
    name: "snokebomb",
    skill: $skill`Snokebomb`,
    available: () => have($skill`Snokebomb`) && get("_snokebombUsed") < 3,
  },
];

type BanishRecord = { monster: Monster; banisher: string };

function banishRecords(): BanishRecord[] {
  const parts = get("banishedMonsters").split(":");
  const records: BanishRecord[] = [];
  for (let i = 0; i + 1 < parts.length; i += 3) {
    if (!parts[i]) continue;
    records.push({ monster: toMonster(parts[i]), banisher: parts[i + 1] ?? "" });
  }
  return records;
}

/** The monster this source currently has banished, if any (ash banished():
 * literal-prefix, case-insensitive match against the recorded banisher name). */
export function banishedBy(source: BanishSource): Monster | undefined {
  return banishRecords().find((record) =>
    record.banisher.toLowerCase().startsWith(source.name.toLowerCase()),
  )?.monster;
}

export function banishActive(target: Monster): boolean {
  return banishRecords().some((record) => record.monster === target);
}

/**
 * Ash banishGear() (iotm.ash:1115-1132) minus its `<slot>Override` pref
 * side-effect (spec §4: replaced by returning the equip requirement for the
 * task outfit). Picks the first available source whose existing banish is
 * irrelevant at `location` — its currently-banished monster does not appear
 * there, so re-pointing the source wastes nothing.
 */
export function pickBanishSource(location?: Location): BanishSource | undefined {
  return banishSources.find((source) => {
    if (!source.available()) return false;
    if (!location) return true;
    const current = banishedBy(source);
    if (!current) return true;
    return (appearanceRates(location)[current.name] ?? 0) === 0;
  });
}
```

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass. `Heartstone: %banish` is the skill name the ash uses verbatim; if lint rejects it, find the Heartstone banish skill's real name in kolmafia's `src/data/classskills.txt` (checkout at `../kolmafia`) and report the correction — do not guess.

- [ ] **Step 3: Commit**

```bash
git add src/resources/banish.ts && git commit -m "feat: banish framework with prefix-matched mafia records"
```

---

### Task 6: Free-kill ladder

**Files:**
- Create: `src/resources/freekill.ts`

**Interfaces:**
- Consumes: `CombatResource` (Task 1), `currentPolicy` (Task 1).
- Produces: `type FreeKillSource`, `freeKillSources`, `bczCost(counterPref)`, `selectFreeKill(opts)`, `selectYellowRay()`.

- [ ] **Step 1: Write `src/resources/freekill.ts`**

```ts
import { getProperty, itemAmount, Location, Monster, myBasestat, Stat } from "kolmafia";
import { $effect, $item, $items, $location, $locations, $skill, get, have, Macro } from "libram";

import { currentPolicy } from "./policy";
import { CombatResource } from "./resource";

export type FreeKillSource = CombatResource & {
  do: Macro;
  /** Damage instakills glance off Colosseum gladiators (spec §8 boss facts);
   * only sources flagged true may fire there. */
  colosseumSafe: boolean;
  /** Club 'Em Back in Time is pointless outside the Colosseum. */
  colosseumOnly?: boolean;
  /** Groveling gravel forfeits the fight's drops; skip when drops matter. */
  dropSafe: boolean;
};

/** Ash BCZcost (iotm.ash:1182-1198): substat price of the NEXT cast of a BCZ
 * skill. Sequence 11, 23, 37, 110, 230, 370, …; the 13th cast is a flat 420k.
 * Ported statement-for-statement, including the in-place decrement. */
export function bczCost(counterPref: string): number {
  let cast = Number(getProperty(counterPref) || "0");
  if (cast === 12) return 420000;
  if (cast > 12) cast -= 1;
  const tier = Math.floor(cast / 3);
  const mod = cast % 3;
  const base = [11, 23, 37][mod];
  return base * 10 ** (cast < 12 || (cast > 12 && mod === 0) ? tier : tier + 1);
}

function bczSweatBulletsAffordable(): boolean {
  // Stat.get("submoxie"): mafia's runtime accepts substat names even though
  // the typings' StatType union lists only the three mainstats; MafiaClass.get
  // takes any string. Gate: base moxie substats above the 150-moxie floor
  // (150² = 22500) must exceed the next cast's price (ash freeKill():249).
  return myBasestat(Stat.get("submoxie")) - 22500 > bczCost("_bczSweatBulletsCasts");
}

const sheriffZones = $locations`An Octopus's Garden, Mer-kin Gymnasium, The Caliginous Abyss`;
const sheriffOutfit = $items`Sheriff moustache, Sheriff badge, Sheriff pistol`;
const colosseum = $location`Mer-kin Colosseum`;

/** Ordered per the ash's prep-time freeKill() (UnderTheSea.ash:237-253) with
 * the CCS free_kill() spenders folded in (UnderTheSeaCCS.ash:6-70). The
 * one-free-source-per-fight guard is structural: each `do` macro ends the
 * fight, and grimoire provides exactly one resource per action. */
export const freeKillSources: FreeKillSource[] = [
  {
    name: "Darts: Bullseye",
    available: () => have($item`Everfull Dart Holster`) && !have($effect`Everything Looks Red`),
    remaining: () =>
      have($item`Everfull Dart Holster`) && !have($effect`Everything Looks Red`) ? 1 : 0,
    equip: $item`Everfull Dart Holster`,
    do: Macro.trySkill($skill`Darts: Aim for the Bullseye`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    // Parka yellow-ray double duty: with darts, the only free kill high shiny spends.
    name: "Spit jurassic acid",
    available: () =>
      have($skill`Torso Awareness`) &&
      have($item`Jurassic Parka`) &&
      !have($effect`Everything Looks Yellow`),
    remaining: () => (have($item`Jurassic Parka`) && !have($effect`Everything Looks Yellow`) ? 1 : 0),
    equip: { equip: [$item`Jurassic Parka`], modes: { parka: "dilophosaur" } },
    do: Macro.trySkill($skill`Spit jurassic acid`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    name: "Assert your Authority",
    available: () => get("_assertYourAuthorityCast") < 3 && sheriffOutfit.every((it) => have(it)),
    remaining: () =>
      sheriffOutfit.every((it) => have(it)) ? Math.max(0, 3 - get("_assertYourAuthorityCast")) : 0,
    equip: { equip: [...sheriffOutfit] },
    do: Macro.trySkill($skill`Assert your Authority`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    name: "Chest X-Ray",
    available: () => get("_chestXRayUsed") < 3 && have($item`Lil' Doctor™ bag`),
    remaining: () => (have($item`Lil' Doctor™ bag`) ? Math.max(0, 3 - get("_chestXRayUsed")) : 0),
    equip: $item`Lil' Doctor™ bag`,
    do: Macro.trySkill($skill`Chest X-Ray`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    name: "BCZ: Sweat Bullets",
    available: () => have($item`blood cubic zirconia`) && bczSweatBulletsAffordable(),
    remaining: () => (have($item`blood cubic zirconia`) && bczSweatBulletsAffordable() ? 1 : 0),
    equip: $item`blood cubic zirconia`,
    do: Macro.trySkill($skill`BCZ: Sweat Bullets`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    name: "Shattering Punch",
    available: () => have($skill`Shattering Punch`) && get("_shatteringPunchUsed") < 3,
    remaining: () => (have($skill`Shattering Punch`) ? Math.max(0, 3 - get("_shatteringPunchUsed")) : 0),
    do: Macro.trySkill($skill`Shattering Punch`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    name: "Gingerbread Mob Hit",
    available: () => have($skill`Gingerbread Mob Hit`) && !get("_gingerbreadMobHitUsed"),
    remaining: () => (have($skill`Gingerbread Mob Hit`) && !get("_gingerbreadMobHitUsed") ? 1 : 0),
    do: Macro.trySkill($skill`Gingerbread Mob Hit`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    name: "shadow brick",
    available: () => itemAmount($item`shadow brick`) > 0 && get("_shadowBricksUsed") < 13,
    remaining: () => Math.min(itemAmount($item`shadow brick`), 13 - get("_shadowBricksUsed")),
    do: Macro.tryItem($item`shadow brick`),
    colosseumSafe: false,
    dropSafe: true,
  },
  {
    name: "groveling gravel",
    available: () => itemAmount($item`groveling gravel`) > 0,
    remaining: () => itemAmount($item`groveling gravel`),
    do: Macro.tryItem($item`groveling gravel`),
    colosseumSafe: false,
    dropSafe: false,
  },
  {
    // Colosseum-only 30% max-HP chip that works on instakill-immune
    // gladiators; ≤5/day, policy-gated (CCS:33-38, UnderTheSea.ash:2829).
    name: "Club 'Em Back in Time",
    available: () =>
      currentPolicy().allowClubEmBackInTime &&
      have($item`legendary seal-clubbing club`) &&
      get("_clubEmTimeUsed") < 5,
    remaining: () =>
      have($item`legendary seal-clubbing club`) ? Math.max(0, 5 - get("_clubEmTimeUsed")) : 0,
    equip: $item`legendary seal-clubbing club`,
    do: Macro.trySkill($skill`Club 'Em Back in Time`),
    colosseumSafe: true,
    colosseumOnly: true,
    dropSafe: true,
  },
];

const dartsOnlyNames = ["Darts: Bullseye", "Spit jurassic acid"];

/** First free kill the policy, zone, and fight context allow. A pending
 * curveball already banks the target's free win (CCS free_kill():14-15). */
export function selectFreeKill(
  options: { location?: Location; target?: Monster; dropsMatter?: boolean } = {},
): FreeKillSource | undefined {
  const { location, target, dropsMatter = false } = options;
  if (target && get("_curveballMonster") === target && get("_curveballFightsLeft") > 0) {
    return undefined;
  }
  const policy = currentPolicy();
  const atColosseum = location === colosseum;
  return freeKillSources.find((source) => {
    if (policy.freeKillMode === "dartsOnly" && !dartsOnlyNames.includes(source.name)) return false;
    if (atColosseum && !source.colosseumSafe) return false;
    if (!atColosseum && source.colosseumOnly) return false;
    if (source.name === "Assert your Authority" && (!location || !sheriffZones.includes(location))) {
      return false;
    }
    if (dropsMatter && !source.dropSafe) return false;
    return source.available();
  });
}

/** The parka dilophosaur ray, when Everything Looks Yellow is down. */
export function selectYellowRay(): FreeKillSource | undefined {
  const parka = freeKillSources.find((source) => source.name === "Spit jurassic acid");
  return parka?.available() ? parka : undefined;
}
```

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass. Watch three names lint may correct: `Mer-kin Gymnasium` vs `The Mer-Kin Gymnasium`, `Mer-kin Colosseum` vs `The Mer-Kin Colosseum` (match Phase 1's `$location`The Mer-Kin Outpost`` casing), and the Sheriff pieces. Fix per game data and report each correction.

- [ ] **Step 3: Commit**

```bash
git add src/resources/freekill.ts && git commit -m "feat: free-kill ladder with tier policy and BCZ cost math"
```

---

### Task 7: Free-run ladder

**Files:**
- Create: `src/resources/freerun.ts`

**Interfaces:**
- Consumes: `CombatResource` (1), `banishSources`/`banishedBy` (5), `FreeKillSource`/`selectFreeKill` (6).
- Produces: `type FreeRunSource`, `freeRunSources`, `selectFreeRun(opts): FreeRunSource | FreeKillSource | undefined`.

- [ ] **Step 1: Write `src/resources/freerun.ts`**

```ts
import { appearanceRates, itemAmount, Location, Monster } from "kolmafia";
import { $effect, $item, $locations, $phylum, $skill, get, have, Macro } from "libram";

import { banishedBy, banishSources } from "./banish";
import { FreeKillSource, selectFreeKill } from "./freekill";
import { CombatResource } from "./resource";

export type FreeRunSource = CombatResource & {
  do: Macro;
  /** True = this source banishes; reserved for call sites that opt in
   * (ash free_run()'s `banish` flag, UnderTheSeaCCS.ash:74-107). */
  banishes: boolean;
};

/** The ash zone-excludes snokebomb at three surface farm zones
 * (UnderTheSeaCCS.ash:86-89). */
const snokebombExcludedZones = $locations`The Outskirts of Cobb's Knob, The Sleazy Back Alley, The Haunted Pantry`;

/** Ordered per ash freeRun() (UnderTheSea.ash:255-265) with the CCS spenders
 * folded in. Spring shoes appear twice on purpose: banish mode upgrades
 * Spring Away to Spring Kick (CCS:98); both share the Everything Looks Green
 * cooldown. */
export const freeRunSources: FreeRunSource[] = [
  {
    name: "Spring Kick",
    available: () => have($item`spring shoes`) && !have($effect`Everything Looks Green`),
    remaining: () => (have($item`spring shoes`) && !have($effect`Everything Looks Green`) ? 1 : 0),
    equip: $item`spring shoes`,
    do: Macro.trySkill($skill`Spring Kick`),
    banishes: true,
  },
  {
    name: "Spring Away",
    available: () => have($item`spring shoes`) && !have($effect`Everything Looks Green`),
    remaining: () => (have($item`spring shoes`) && !have($effect`Everything Looks Green`) ? 1 : 0),
    equip: $item`spring shoes`,
    do: Macro.trySkill($skill`Spring Away`),
    banishes: false,
  },
  {
    // Underwater the GAP runaway only works while Driving Waterproofly
    // (ash freeRun():257).
    name: "GAP runaway",
    available: () =>
      have($item`Greatest American Pants`) &&
      get("_navelRunaways") < 3 &&
      have($effect`Driving Waterproofly`),
    remaining: () => (have($item`Greatest American Pants`) ? Math.max(0, 3 - get("_navelRunaways")) : 0),
    equip: $item`Greatest American Pants`,
    do: Macro.runaway(),
    banishes: false,
  },
  {
    name: "Bowl a Curveball",
    available: () => itemAmount($item`cosmic bowling ball`) > 0,
    remaining: () => (itemAmount($item`cosmic bowling ball`) > 0 ? 1 : 0),
    do: Macro.trySkill($skill`Bowl a Curveball`),
    banishes: true,
  },
  {
    name: "Creepy Grin",
    available: () => have($item`V for Vivala mask`) && !get("_vmaskBanisherUsed"),
    remaining: () => (have($item`V for Vivala mask`) && !get("_vmaskBanisherUsed") ? 1 : 0),
    equip: $item`V for Vivala mask`,
    do: Macro.trySkill($skill`Creepy Grin`),
    banishes: true,
  },
  {
    name: "Throw Latte on Opponent",
    available: () => have($item`latte lovers member's mug`) && !get("_latteBanishUsed"),
    remaining: () => (have($item`latte lovers member's mug`) && !get("_latteBanishUsed") ? 1 : 0),
    equip: $item`latte lovers member's mug`,
    do: Macro.trySkill($skill`Throw Latte on Opponent`),
    banishes: true,
  },
  {
    name: "Feel Hatred",
    available: () => have($skill`Feel Hatred`) && get("_feelHatredUsed") < 3,
    remaining: () => (have($skill`Feel Hatred`) ? Math.max(0, 3 - get("_feelHatredUsed")) : 0),
    do: Macro.trySkill($skill`Feel Hatred`),
    banishes: true,
  },
  {
    name: "Snokebomb",
    available: () => have($skill`Snokebomb`) && get("_snokebombUsed") < 3,
    remaining: () => (have($skill`Snokebomb`) ? Math.max(0, 3 - get("_snokebombUsed")) : 0),
    do: Macro.trySkill($skill`Snokebomb`),
    banishes: true,
  },
  {
    name: "glob of Blank-Out",
    available: () => itemAmount($item`glob of Blank-Out`) > 0,
    remaining: () => itemAmount($item`glob of Blank-Out`),
    do: Macro.tryItem($item`glob of Blank-Out`),
    banishes: false,
  },
  {
    name: "peppermint parasol",
    available: () => itemAmount($item`peppermint parasol`) > 0 && get("parasolUsed") < 3,
    remaining: () =>
      itemAmount($item`peppermint parasol`) > 0 ? Math.max(0, 3 - get("parasolUsed")) : 0,
    do: Macro.tryItem($item`peppermint parasol`),
    banishes: false,
  },
  {
    name: "anchor bomb",
    available: () => itemAmount($item`anchor bomb`) > 0,
    remaining: () => itemAmount($item`anchor bomb`),
    do: Macro.tryItem($item`anchor bomb`),
    banishes: true,
  },
  {
    name: "stuffed yam stinkbomb",
    available: () => itemAmount($item`stuffed yam stinkbomb`) > 0,
    remaining: () => itemAmount($item`stuffed yam stinkbomb`),
    do: Macro.tryItem($item`stuffed yam stinkbomb`),
    banishes: true,
  },
  {
    name: "handful of split pea soup",
    available: () => itemAmount($item`handful of split pea soup`) > 0,
    remaining: () => itemAmount($item`handful of split pea soup`),
    do: Macro.tryItem($item`handful of split pea soup`),
    banishes: true,
  },
  {
    // Mer-kin phylum only; the selector enforces it when a target is known.
    name: "Mer-kin pinkslip",
    available: () => itemAmount($item`Mer-kin pinkslip`) > 0,
    remaining: () => itemAmount($item`Mer-kin pinkslip`),
    do: Macro.tryItem($item`Mer-kin pinkslip`),
    banishes: false,
  },
  {
    name: "ink bladder",
    available: () => itemAmount($item`ink bladder`) > 0,
    remaining: () => itemAmount($item`ink bladder`),
    do: Macro.tryItem($item`ink bladder`),
    banishes: false,
  },
];

/**
 * First run source the mode, zone, and fight context allow. `banish: true`
 * additionally admits the banishing sources (and prefers Spring Kick over
 * Spring Away by list order). Falls through to the free-kill ladder like the
 * ash's freeRun() (UnderTheSea.ash:264): a free kill substitutes when no run
 * source is left. Curveball guard as in free-kill.
 */
export function selectFreeRun(
  options: { banish?: boolean; location?: Location; target?: Monster } = {},
): FreeRunSource | FreeKillSource | undefined {
  const { banish = false, location, target } = options;
  if (target && get("_curveballMonster") === target && get("_curveballFightsLeft") > 0) {
    return undefined;
  }
  const snokebomb = banishSources.find((source) => source.name === "snokebomb");
  const run = freeRunSources.find((source) => {
    if (source.banishes && !banish) return false;
    if (source.name === "Snokebomb") {
      if (location && snokebombExcludedZones.includes(location)) return false;
      // Skip when snokebomb's existing banish already covers this zone
      // (ash banishUsedAtYourLocation(), iotm.ash:1102-1109).
      const current = snokebomb ? banishedBy(snokebomb) : undefined;
      if (location && current && (appearanceRates(location)[current.name] ?? 0) > 0) return false;
    }
    if (source.name === "Mer-kin pinkslip" && target && target.phylum !== $phylum`mer-kin`) {
      return false;
    }
    return source.available();
  });
  return run ?? selectFreeKill({ location, target });
}
```

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass. (`$phylum`mer-kin``: if lint corrects the casing, accept it and report.)

- [ ] **Step 3: Commit**

```bash
git add src/resources/freerun.ts && git commit -m "feat: free-run ladder with banish mode and free-kill fallback"
```

---

### Task 8: NC-force

**Files:**
- Create: `src/resources/ncforce.ts`

**Interfaces:**
- Consumes: `haveAnywhere`, `debug` (lib); `pulledToday`, `pullSequence` (Task 2); `Resource`, `CombatResource` (Task 1).
- Produces: `ncForceEstimate(): number`, `combatNCForceSources`, `ncForceSources`, `forceNextNoncombat(): boolean`.

- [ ] **Step 1: Write `src/resources/ncforce.ts`**

```ts
import {
  chew,
  cliExecute,
  equip,
  haveEquipped,
  itemAmount,
  pullsRemaining,
  storageAmount,
  totalFreeRests,
  use,
  useSkill,
} from "kolmafia";
import {
  $item,
  $items,
  $skill,
  $slot,
  AprilingBandHelmet,
  CinchoDeMayo,
  get,
  have,
  Macro,
} from "libram";

import { debug, haveAnywhere } from "../lib";
import { pulledToday, pullSequence } from "./pulls";
import { CombatResource, Resource } from "./resource";

export type CombatNCForceSource = CombatResource & { do: Macro };

/**
 * In-combat NC forcers: cast during a fight, the next turn in the zone is a
 * forced noncombat. Consumed by Phase 3 task combat configs. Salvaged from
 * a8c4168 forcenc.ts (which was never wired) minus its McHugeLarge Love Gnats
 * prelude — the avalanche alone is the forcer.
 */
export const combatNCForceSources: CombatNCForceSource[] = [
  {
    name: "Spikolodon Spikes",
    available: () =>
      have($skill`Torso Awareness`) &&
      have($item`Jurassic Parka`) &&
      get("_spikolodonSpikeUses") < 5,
    remaining: () => (have($item`Jurassic Parka`) ? Math.max(0, 5 - get("_spikolodonSpikeUses")) : 0),
    equip: { equip: [$item`Jurassic Parka`], modes: { parka: "spikolodon" } },
    do: Macro.trySkill($skill`Launch spikolodon spikes`),
  },
  {
    name: "McHugeLarge Avalanche",
    available: () => have($item`McHugeLarge left ski`) && get("_mcHugeLargeAvalancheUses") < 3,
    remaining: () =>
      have($item`McHugeLarge left ski`) ? Math.max(0, 3 - get("_mcHugeLargeAvalancheUses")) : 0,
    equip: $item`McHugeLarge left ski`,
    do: Macro.trySkill($skill`McHugeLarge Avalanche`),
  },
];

export type NCForceSource = Resource & { force: () => void };

/** The ash only spends pulls on forcers when no reusable forcer gear exists
 * on the account (iotm.ash NCforce():1019). */
const reusableForcerGear = $items`McHugeLarge duffel bag, Jurassic Parka, Allied Radio Backpack`;

function pullBackedFallbackActive(): boolean {
  return !reusableForcerGear.some((it) => have(it)) && pullsRemaining() > 0;
}

/**
 * Out-of-combat spend ladder, cheapest-first (iotm.ash NCforce():991-1037):
 * tuba → Cincho (free rests restore cinch) → Sneakisol (free, so it beats
 * anything costing a pull) → pull-backed radio/bell/jelly. The pull trio's
 * membership tests use the comma-delimited discipline the ash's own loop
 * forgot (iotm.ash:1024 — real substring-collision bug, fixed in this port),
 * and Clara's remaining() fixes the old repo's inversion (forcenc.ts salvage
 * note). Clara's bell is untradeable: pull-only, never mall-bought.
 */
export const ncForceSources: NCForceSource[] = [
  {
    name: "Apriling tuba",
    available: () => have($item`Apriling band tuba`) && get("_aprilBandTubaUses") < 3,
    remaining: () => (have($item`Apriling band tuba`) ? Math.max(0, 3 - get("_aprilBandTubaUses")) : 0),
    force: () => AprilingBandHelmet.play($item`Apriling band tuba`),
  },
  {
    name: "Cincho: Fiesta Exit",
    available: () => have($item`Cincho de Mayo`) && CinchoDeMayo.totalAvailableCinch() >= 60,
    remaining: () =>
      have($item`Cincho de Mayo`) ? Math.floor(CinchoDeMayo.totalAvailableCinch() / 60) : 0,
    force: () => {
      if (!haveEquipped($item`Cincho de Mayo`)) equip($slot`acc3`, $item`Cincho de Mayo`);
      while (CinchoDeMayo.currentCinch() < 60 && totalFreeRests() > get("timesRested")) {
        cliExecute("rest free");
      }
      if (CinchoDeMayo.currentCinch() >= 60) useSkill(CinchoDeMayo.skills.FiestaExit);
    },
  },
  {
    name: "Pillkeeper Sneakisol",
    available: () => haveAnywhere($item`Eight Days a Week Pill Keeper`) && !get("_freePillKeeperUsed"),
    remaining: () =>
      haveAnywhere($item`Eight Days a Week Pill Keeper`) && !get("_freePillKeeperUsed") ? 1 : 0,
    force: () => cliExecute("pillkeeper free noncombat"),
  },
  {
    name: "handheld Allied radio",
    available: () => pullBackedFallbackActive() && !pulledToday($item`handheld Allied radio`),
    remaining: () =>
      pullBackedFallbackActive() && !pulledToday($item`handheld Allied radio`) ? 1 : 0,
    force: () => {
      if (itemAmount($item`handheld Allied radio`) > 0 || pullSequence($item`handheld Allied radio`)) {
        cliExecute("alliedradio misc sniper");
      }
    },
  },
  {
    name: "Clara's bell",
    available: () =>
      pullBackedFallbackActive() &&
      !get("_claraBellUsed") &&
      !pulledToday($item`Clara's bell`) &&
      (have($item`Clara's bell`) || storageAmount($item`Clara's bell`) > 0),
    remaining: () =>
      !get("_claraBellUsed") && (have($item`Clara's bell`) || storageAmount($item`Clara's bell`) > 0)
        ? 1
        : 0,
    force: () => {
      if (have($item`Clara's bell`) || pullSequence($item`Clara's bell`)) use($item`Clara's bell`);
    },
  },
  {
    name: "stench jelly",
    available: () => pullBackedFallbackActive() && !pulledToday($item`stench jelly`),
    remaining: () => (pullBackedFallbackActive() && !pulledToday($item`stench jelly`) ? 1 : 0),
    force: () => {
      if (itemAmount($item`stench jelly`) > 0 || pullSequence($item`stench jelly`)) {
        chew(1, $item`stench jelly`);
      }
    },
  },
];

/**
 * Ash NCForceEstimate() (iotm.ash:470-482). Base 2 stands in for the
 * always-pullable backstops; the Pill Keeper is DELIBERATELY excluded — this
 * estimate decides whether the day's free pill must be reserved for
 * Sneakisol, so counting it would be circular. Ash integer division floors,
 * hence Math.floor on the Cincho term.
 */
export function ncForceEstimate(): number {
  let force = 2;
  if (have($item`Apriling band tuba`)) force += Math.max(0, 3 - get("_aprilBandTubaUses"));
  if (have($item`McHugeLarge left ski`)) force += Math.max(0, 3 - get("_mcHugeLargeAvalancheUses"));
  if (have($item`Cincho de Mayo`)) {
    force += Math.min(3, 1 + Math.floor(Math.max(0, totalFreeRests() - get("timesRested")) / 2));
  }
  if (have($item`Jurassic Parka`)) force += Math.max(0, 5 - get("_spikolodonSpikeUses"));
  return force;
}

/** Arm an out-of-combat NC forcer, cheapest-first. Returns true when a forcer
 * is armed afterwards, including one that was already pending. */
export function forceNextNoncombat(): boolean {
  if (get("noncombatForcerActive")) return true;
  const source = ncForceSources.find((s) => s.available());
  if (!source) return false;
  debug(`NC force via ${source.name}`);
  source.force();
  return get("noncombatForcerActive");
}
```

- [ ] **Step 2: Verify** — Run: `yarn check && yarn lint` — Expected: pass. If lint corrects `Allied Radio Backpack` / `handheld Allied radio` casing, accept and report. If `cliExecute("rest free")` concerns the reviewer: it is the mafia CLI rest command the ash uses (`camp rest free`); keep the shorter form only if kolmafia accepts it — otherwise use `cliExecute("campground rest free")` and note it.

- [ ] **Step 3: Commit**

```bash
git add src/resources/ncforce.ts && git commit -m "feat: NC-force estimate and forcer ladders (Clara fix, delimiter fix)"
```

---

### Task 9: Engine resolution wiring

**Files:**
- Modify: `src/engine/engine.ts`, `src/engine/combat.ts`

**Interfaces:**
- Consumes: `pickBanishSource` (5), `selectFreeKill`/`selectYellowRay` (6), `selectFreeRun` (7), `forceGranted`/`saberAllowedAt` (3).
- Produces: `customize()` that resolves `banish`/`killFree`/`freeRun`/`yellowRay`/`forceItems` before falling back to `MyActionDefaults`.

- [ ] **Step 1: Update `src/engine/combat.ts` doc comment** — the `MyActionDefaults` JSDoc currently says:

```ts
/**
 * Defaults when no combat resource is allocated (resource layer arrives in Phase 2).
```

Replace that first line with:

```ts
/**
 * Defaults when the resources layer provides nothing for an action.
```

(The rest of the comment — the explicit degradation list — stays.)

- [ ] **Step 2: Wire resolution into `src/engine/engine.ts`** — in `customize()`, insert between `super.customize(task, outfit, combat, resources);` and the breathing-enforcement block (`// Breathing enforcement (spec §2/§8: …`):

```ts
    // Resolve abstract combat actions against the resource ladders (spec §2).
    // Anything unresolved falls through to MyActionDefaults' explicit
    // degradations — killFree still aborts by design when no source exists.
    const location = task.do instanceof Location ? task.do : undefined;
    if (combat.can("banish")) {
      const banisher = pickBanishSource(location);
      if (banisher) {
        if (banisher.equip) outfit.equip(banisher.equip);
        resources.provide("banish", { do: Macro.trySkill(banisher.skill) });
      }
    }
    if (combat.can("killFree")) {
      const source = selectFreeKill({ location });
      if (source) {
        if (source.equip) outfit.equip(source.equip);
        resources.provide("killFree", { prepare: source.prepare, do: source.do });
      }
    }
    if (combat.can("freeRun")) {
      const source = selectFreeRun({ location });
      if (source) {
        if (source.equip) outfit.equip(source.equip);
        resources.provide("freeRun", { prepare: source.prepare, do: source.do });
      }
    }
    if (combat.can("yellowRay") || combat.can("forceItems")) {
      const action = combat.can("yellowRay") ? "yellowRay" : "forceItems";
      const ray = selectYellowRay();
      if (ray) {
        if (ray.equip) outfit.equip(ray.equip);
        resources.provide(action, { do: ray.do });
      } else if (action === "forceItems" && (!location || saberAllowedAt(location)) && forceGranted("free", location)) {
        // Saber force-drop: choice 1387 option 3 drops the yellow-ray items.
        this.propertyManager.setChoice(1387, 3);
        outfit.equip($item`Fourth of May Cosplay Saber`);
        resources.provide("forceItems", { do: Macro.trySkill($skill`Use the Force`) });
      }
    }
```

Add the imports this needs at the top of the file: `pickBanishSource` from `"../resources/banish"`, `selectFreeKill, selectYellowRay` from `"../resources/freekill"`, `selectFreeRun` from `"../resources/freerun"`, `forceGranted, saberAllowedAt` from `"../resources/saber"`, and add `$skill` to the existing `libram` import if not present. `Location`, `Macro`, `$item` are already imported. If tsc reports that `combat.can` does not exist, check the real method name in `node_modules/grimoire-kolmafia/dist/combat.d.ts` (it is declared as `can(action: A): boolean` at line 115) and report what you found.

- [ ] **Step 3: Verify** — Run: `yarn check && yarn lint && yarn build`
Expected: all pass; three bundles produced (`subaqua.js`, `subaqua_choice.js`, `relay_subaqua.js`).

- [ ] **Step 4: Commit**

```bash
git add src/engine/engine.ts src/engine/combat.ts
git commit -m "feat: customize() resolves combat actions via resource ladders"
```

---

## Phase exit criteria

- `yarn check`, `yarn lint`, `yarn build` all green; three bundles produced; the empty-route `subaqua` run and `subaqua sim` behave exactly as in Phase 1 (no task requests any combat action yet, so resolution is dormant until Phase 3).
- Known deferrals (tracked, not gaps):
  - Shub null-day-exploit pull reservation → Phase 4 (needs `shubPrepShort()` delevel math; `pulls.ts` comment marks the insertion point).
  - `summon()`, `forceNextNoncombat()`, `combatNCForceSources`, `forceGranted()` purposes, and `discretionaryPull()` gain their first callers in Phase 3 task bodies; the seaCowForce McTwist/opener combat guards land with those combat builders.
  - The ash's per-monster saber CCS dispatch (diverForce/healerForce/seaCowForce/researcherForce page-text handling) becomes Phase 3/4 combat-strategy wiring on top of `forceGranted()`.
  - Dropped from the salvage on purpose: the McHugeLarge Love Gnats macro prelude (undocumented interaction), the ash's `<slot>Override` pref side-effect (returned equips instead), and the fax-path locket-passive pre-equip (outfit concern, not a summon concern).
