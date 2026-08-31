# Gold-Trace Ranked Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement every unimplemented ranked fix from the 2026-08-31 gold-trace reports (#1 hallpass, #3 shadow bricks, #4 backup policy incl. the F4 corral opener, #5 habitat off-by-one, #7 PYEC/rift familiar, #8 Mom finish, #9 pull reservations, plus the #2 leftovers) so the next run tracks UTS 2026-08-21 (41 turns) past the corral.

**Architecture:** Small targeted edits across `src/tasks/**`, `src/resources/**`, `src/engine/**`, each mapped one-to-one to a trace-report Change: line. No new subsystems except a fairy-familiar picker and a Sept-Ember censer init task.

**Tech Stack:** TypeScript → rollup → KoLmafia JS (rhino). Libram/grimoire combat DSL.

**Spec:** `docs/superpowers/research/2026-08-31-gold-trace/README.md` (ranked table) + per-phase reports `A-`…`F-` in the same directory.

## Global Constraints

- No test framework exists (`package.json:30`). Verification per task = `yarn check` (tsc). Final gate = `yarn lint && yarn build`. Live verification happens on the next gold-guarded run.
- Branch: `gold-guard` (current). One commit per task, message style `fix:`/`feat:` matching repo history.
- Never rename quest groups or task names — `src/lib/gold.ts:37-62` keys checkpoints and `FLOATING` on them verbatim.
- Comments must cite gold log lines / ash lines the way the codebase already does (user rule in memory: cite gold vs code for every fix).
- Skill `BCZ: Refracted Gaze` and other codpiece-gem names may lag the libram verify-constants plugin — use the `// eslint-disable-next-line libram/verify-constants` pattern from `corral.ts:286` if eslint complains.
- Skip (explicitly out of scope): scale-mail pull when jelly is down (legality UNVERIFIED, E F1), Macrometeorite school re-rolls (README #10, unverified share), X-Ray ladder reorder (README #10), SCUBA pull removal (report only says "review").

---

### Task 1: Outpost habitat recall off-by-one (+ suppress backup on the recall fight) — README #5, A F2, F#4

**Files:**

- Modify: `src/tasks/monkees/outpost.ts:66-90`

**Interfaces:** none new.

- [ ] **Step 1: Fix the compile-time fights-left test**

In `golemRecallMacro()` (outpost.ts:66-77) change `=== 0` to `<= 1`:

```ts
function golemRecallMacro(): Macro {
  const macro = new Macro();
  if (
    have($skill`Just the Facts`) &&
    // <= 1, not === 0: mafia decrements _monsterHabitatsFightsLeft at
    // ENCOUNTER (FightRequest.java:2307), so the last habitat golem is met
    // with a build-time value of 1 — the same fact screechTurn() above
    // already encodes with === 1. Gold recalled inside that fight
    // (G:2531-2549); live 2026-08-30 the recall clause first compiled only
    // after the 5th habitat fight (Y:2634) and no golem followed (A F2).
    get("_monsterHabitatsFightsLeft", 0) <= 1 &&
    get("_monsterHabitatsRecalled", 0) < 2
  ) {
    macro.trySkill($skill`Recall Facts: Monster Habitats`);
  }
  if (screechTurn()) macro.trySkill($skill`%fn, Release the Patriotic Screech!`);
  return macro.components.length > 0 ? openerOnce(macro) : macro;
}
```

- [ ] **Step 2: Suppress the backup on a fight where the recall will fire**

The engine prepends the backup ahead of every task macro (engine.ts:270-294); a backup that converts the golem into something else would eat the recall (F#4: "suppress the backup on that fight"). Add a guard helper above `farmBackup` and use it:

```ts
/** True while golemRecallMacro() still has a recall to land: the backup
 * must not convert that golem fight (F ledger #4: "emit the recall when
 * fightsLeft <= 1, and suppress the backup on that fight"). */
function recallPending(): boolean {
  return (
    have($skill`Just the Facts`) &&
    get("_monsterHabitatsFightsLeft", 0) <= 1 &&
    get("_monsterHabitatsRecalled", 0) < 2
  );
}

const farmBackup = () => ({
  targets: recallPending()
    ? []
    : [
        ...(get("_monsterHabitatsFightsLeft", 0) === 0 && get("_monsterHabitatsRecalled", 0) >= 2
          ? [golem]
          : []),
      ],
  cap: 7,
});
```

Note this also drops the `Mer-kin healer` target — that is Task 2's change, folded here because both edits touch the same lines; keep the two rationales separate in comments (healer: A F1, recall: A F2/F#4).

- [ ] **Step 3: Run `yarn check`** — expect clean tsc.

- [ ] **Step 4: Commit**

```bash
git add src/tasks/monkees/outpost.ts
git commit -m "fix: second habitat recall off-by-one; no healer backups; backup yields to the recall fight"
```

---

### Task 2: Backup policy — only copy into free monsters unless the task opts into a paid copy — README #4(i), A F1

**Files:**

- Modify: `src/resources/backup.ts:9-24, 25, 43-50`
- Modify: `src/tasks/monkees/corral.ts:318-321` (opener opts in)

**Interfaces:**

- Produces: `BackupSpec` gains optional `allowPaid?: boolean`. `backupTarget()` refuses non-`freeMonsters` targets unless `spec.allowPaid`.

- [ ] **Step 1: Fix the false doc comment (backup.ts:9-24)**

Replace the "a backed-up fight refunds its adventure" sentence with the truth:

```ts
/**
 * Backup-camera copies (Back-Up to your Last Enemy, 11/day): the fight you
 * are in becomes a copy of `lastCopyableMonster`. The copy is only free when
 * the copied monster is itself a free fight (ash free_monster()); a copy of
 * an ordinary monster costs the turn like any fight — live 2026-08-30 the
 * corral backup paid its turn (Y:4767, next marker [19]), and five healer
 * copies each burned a free-kill charge (A F1). The ash backs up only INTO
 * free targets (CCS:684-707), plus the corral opener's deliberate paid-copy
 * exception (UTS:1659-1662) where the turn is bought back by a free kill.
 * ...
 */
```

- [ ] **Step 2: Add `allowPaid` to the spec and enforce it in `backupTarget`**

```ts
export type BackupSpec = { targets: Monster[] | "free"; cap?: number; allowPaid?: boolean };

export function backupTarget(spec: BackupSpec): Monster | undefined {
  if (!currentPolicy().useBackupCamera) return undefined;
  if (backupUsesLeft(spec.cap ?? 11) === 0) return undefined;
  const last = lastCopyableMonster();
  if (!last) return undefined;
  const targets = spec.targets === "free" ? freeMonsters : spec.targets;
  if (!targets.includes(last)) return undefined;
  // A copy of a non-free monster costs its turn (doc above). Only a task
  // that explicitly buys that turn back (corral opener: free kill on the
  // copy) may arm one — A F1's "never arm a backup when lastCopyableMonster
  // is not in freeMonsters unless the task explicitly wants a paid copy".
  if (!freeMonsters.includes(last) && !spec.allowPaid) return undefined;
  return last;
}
```

- [ ] **Step 3: Opt the corral opener in (corral.ts:318-321)**

```ts
              backup: () =>
                get("momSeaMonkeeProgress", 0) < 40
                  ? // Paid-copy exception (backup.ts): the eye/slithering copy
                    // costs its turn unless the free kill in the opener macro
                    // lands — exactly the ash's trade (UTS:1659-1662).
                    { targets: $monsters`eye in the darkness, slithering thing`, allowPaid: true }
                  : undefined,
```

- [ ] **Step 4: Run `yarn check`.**

- [ ] **Step 5: Commit**

```bash
git add src/resources/backup.ts src/tasks/monkees/corral.ts
git commit -m "fix: backup camera copies only free monsters unless the task opts into a paid copy"
```

---

### Task 3: F4 — corral opener fires Refracted Gaze + McTwist on the copied fight — README #4(ii), B F4, F#3

**Files:**

- Modify: `src/tasks/monkees/corral.ts` ("Corral Opener" task, lines ~300-343)
- Modify: `src/resources/saber.ts` (seaCowNeeded releases on tame)

**Interfaces:**

- Consumes: `bczAffordable` from `src/resources/freekill.ts:69`.

- [ ] **Step 1: Add an unscoped opener starting macro**

In the "Corral Opener" task, add a `startingMacro` to the CombatStrategy (the engine's backup startingMacro is prepended at customize time, so this runs right after Back-Up, matching ash CCS:763-766 `Back-Up → BCZ: Refracted Gaze → Do an epic McTwist! → free_kill`). Keep the existing cow-scoped macro as-is for the no-backup case; the new macro is guarded off the rustler (banish handles him) and the seahorse (boss; skills fail):

```ts
              combat: new CombatStrategy()
                // Ash CCS:763-766: after the Back-Up lands (engine prepends
                // it), gaze + McTwist run on the COPY, whatever it is — B F4:
                // yesterday's copy (slithering thing) fell to the paid kill
                // ladder because McTwist was scoped to the sea cow only.
                .startingMacro(() =>
                  openerOnce(
                    Macro.ifNot(
                      $monsters`Mer-kin rustler, wild seahorse`,
                      (bczAffordable("_bczRefractedGazeCasts", "submysticality", 40000)
                        ? // eslint-disable-next-line libram/verify-constants -- codpiece gem skill, plugin data lags
                          Macro.trySkill($skill`BCZ: Refracted Gaze`)
                        : new Macro()
                      ).trySkill($skill`Do an epic McTwist!`),
                    ),
                  ),
                )
                .kill($monsters`sea cow, sea cowboy`)
                .banish(rustler)
                .macro(seahorseMacro, seahorse)
                .kill(),
```

Remove the old `.macro(() => openerOnce(Macro.trySkill($skill`Do an epic McTwist!`)), cow)` line from THIS task only (the startingMacro covers the cow too). Leave "Corral Leather"'s cow-scoped McTwist line untouched.

- [ ] **Step 2: Add the BCZ gem to the opener outfit**

```ts
              outfit: { modifier: "item", equip: $items`pro skateboard, blood cubic zirconia` },
```

(Same equip pattern as freekill.ts:137's Sweat Bullets source; gold wore the codpiece with the BCZ socketed for this exact fight, G:4529-4534.)

- [ ] **Step 3: Import `bczAffordable` in corral.ts**

```ts
import { bczAffordable } from "../../resources/freekill";
```

- [ ] **Step 4: seaCowNeeded() releases once the seahorse is tamed (F#3)**

In `src/resources/saber.ts`, `seaCowNeeded()` (lines ~93-100):

```ts
export function seaCowNeeded(): boolean {
  // Once the seahorse is tamed the corral is over — leather/cowbell counts
  // no longer bind a Force, and the researcher's bank must see it released
  // (F ledger #3: 2 cow Forces yesterday left forceGranted("researcher")
  // false and the library researcher was farmed at paid turns).
  if (get("seahorseName", "") !== "") return false;
  return (
    availableAmount($item`sea leather`) +
      availableAmount($item`sea chaps`) +
      availableAmount($item`sea cowboy hat`) <
      2 || availableAmount($item`sea cowbell`) < 3
  );
}
```

- [ ] **Step 5: Run `yarn check`.**

- [ ] **Step 6: Commit**

```bash
git add src/tasks/monkees/corral.ts src/resources/saber.ts
git commit -m "fix: corral opener runs Refracted Gaze + McTwist on the backed-up copy (gold-trace F4)"
```

---

### Task 4: Stashbox free-kills the bead-short healer; crystal ball off the -combat hunt — A F3, README #2 leftover

**Files:**

- Modify: `src/tasks/monkees/outpost.ts` ("Outpost Stashbox", lines ~156-187)

- [ ] **Step 1: Kill the healer while beads are short, free-run the rest**

Make the combat a function so the beads check is fresh per compile; the engine's opportunistic free-kill upgrade (engine.ts:558-644) turns the `.kill(healer)` into a free kill (healer is drop-safe, freekill.ts:274):

```ts
        // ash CCS:698-704 keeps free_kill(drop) for bead-short healers even
        // in -combat mode; banishing him wastes a Feel Hatred AND fights the
        // crystal ball's re-force (A F3: 2 Feel Hatred lost, Y:3226-3262).
        combat: () =>
          availableAmount(beads) < 2
            ? new CombatStrategy().kill($monster`Mer-kin healer`).freeRun()
            : new CombatStrategy().freeRun(),
```

(Check whether `combat:` accepts a thunk in this engine — grep `combat: () =>` in src/tasks. If it does not, build the strategy with the healer-kill line unconditionally: the upgrade only fires when a source is available, and once beads >= 3 the Prayerbeads task is complete anyway. Prefer the thunk if supported.)

- [ ] **Step 2: Avoid the crystal ball on the hunt**

```ts
        outfit: () => ({
          modifier: "-combat",
          familiar: sneakFamiliar(),
          equip: $items`Monodent of the Sea`,
          // The turkey carried the ball in as famequip and its predictions
          // overrode the banishes (A F3, Y:3219-3262).
          avoid: $items`miniature crystal ball`,
        }),
```

- [ ] **Step 3: Run `yarn check`.**

- [ ] **Step 4: Commit**

```bash
git add src/tasks/monkees/outpost.ts
git commit -m "fix: stashbox hunt free-kills bead-short healers, bans the crystal ball (A F3)"
```

---

### Task 5: Trench banish-runs gated on the bowling ball — README #2, F#2

**Files:**

- Modify: `src/engine/task.ts:26-31` (type), `src/engine/engine.ts:434` (undelay), `src/tasks/monkees/grandpa.ts:31-35`

**Interfaces:**

- Produces: `freeRunBanishes?: boolean | (() => boolean)`.

- [ ] **Step 1: Widen the task field type** (task.ts):

```ts
  /** Free-run ladder may spend banishing rungs on this task's fights.
   * Thunk form: re-evaluated at compile, e.g. the Trench's bowling-ball
   * gate (ash CCS:646-654). */
  freeRunBanishes?: boolean | (() => boolean);
```

- [ ] **Step 2: Undelay at the consumption site** (engine.ts:434):

```ts
const banish = undelay(task.freeRunBanishes) === true;
```

- [ ] **Step 3: Gate the Trench** (grandpa.ts):

```ts
        // ash free_run(page_text, true) here, CCS:646-654 — but only with
        // the cosmic bowling ball IN HAND does the ash walk straight into
        // the banish ladder; ball out, it runs fish/darts first. Live
        // 2026-08-30 the latte went on a t3 diving belle while the ball
        // rolled back (F ledger #2) and the gym then paid 15 fights.
        freeRunBanishes: () => itemAmount($item`cosmic bowling ball`) > 0,
```

Add the `itemAmount` / `$item` imports if missing.

- [ ] **Step 4: Run `yarn check`.**

- [ ] **Step 5: Commit**

```bash
git add src/engine/task.ts src/engine/engine.ts src/tasks/monkees/grandpa.ts
git commit -m "fix: Trench banish-runs wait for the bowling ball (latte gate, gold-trace #2)"
```

---

### Task 6: Gym dresses free-kill gear — D F4, README #2

**Files:**

- Modify: `src/tasks/sorceress/gym.ts` (maximizer pieces, ~lines 60-100)

- [ ] **Step 1: Push Sheriff pieces while Assert charges remain**

In the maximizer-pieces builder (after the `runGear` pushes at gym.ts:78-86):

```ts
// Ash freeKill() wears the Sheriff set in the gym (G:659) so Assert your
// Authority is castable when the run ladder dries up — D F4. The gym is a
// sheriffZone (freekill.ts:77); fights.ts's worn-check (:145-151) already
// refuses unworn kills, so unworn = the charge silently unusable.
const sheriff = $items`Sheriff moustache, Sheriff badge, Sheriff pistol`;
if (get("_assertYourAuthorityCast", 0) < 3 && sheriff.every((it) => have(it))) {
  for (const it of sheriff) pieces.push(`+equip ${it.name}`);
}
```

Add imports as needed. If the maximizer then drops run gear (slot conflicts), that is acceptable — the run ladder's worn-check re-walks past unworn sources by design (fights.ts:145-151).

- [ ] **Step 2: Run `yarn check`.**

- [ ] **Step 3: Commit**

```bash
git add src/tasks/sorceress/gym.ts
git commit -m "feat: gym wears the Sheriff set while Assert your Authority has charges (D F4)"
```

---

### Task 7: PYEC before the shadow rift — README #7, B F2

**Files:**

- Modify: `src/tasks/runplans.ts:72-77`

- [ ] **Step 1: Reorder**

```ts
    // Sorceress dailies BEFORE the rift: the PYEC extends Shadow Affinity
    // (gold's PYEC at G:4801 made 16 free rift fights vs yesterday's 11 —
    // B F2). They are free actions, so nothing else moves.
    sorceressDailies(),
    ...(high ? [] : [shadowRiftQuest()]),
    corralQuest({ opener: !high, swordLane: high }),
    mineQuest(),
```

(Delete the old `sorceressDailies()` call site at line 76 and its comment; keep the mine comment.)

- [ ] **Step 2: Run `yarn check`.**

- [ ] **Step 3: Commit**

```bash
git add src/tasks/runplans.ts
git commit -m "fix: PYEC runs before the shadow rift so Shadow Affinity covers it (B F2)"
```

---

### Task 8: Default item familiar for +item tasks; rift wears FLUDA/bat wings — README #7, B F2

**Files:**

- Modify: `src/engine/outfit.ts` (new `chooseItemFamiliar()` near `chooseFamiliar` at :153)
- Modify: `src/engine/engine.ts` (customize, before `super.customize` at :323)
- Modify: `src/tasks/monkees/shadow.ts:50-55` (riftOutfit) and the rift tasks (add `batWings: true`)

**Interfaces:**

- Produces: `chooseItemFamiliar(): Familiar` in outfit.ts.

- [ ] **Step 1: Add the picker** (outfit.ts, next to chooseFamiliar; libram exports `findFairyMultiplier`):

```ts
/** Ash UTS:878-879: Jill-of-All-Trades first, else mafia's "itdrop" pick.
 * Ranked by fairy (item) multiplier with underwater viability, mirroring
 * chooseFamiliar()'s meat version above. B F2: the whole 08-30 B slice ran
 * on the Patriotic Eagle because nothing ever picked an item familiar. */
export function chooseItemFamiliar(): Familiar {
  const jill = $familiar`Jill-of-All-Trades`;
  const haveUnderwaterFamEquipment = familiarWaterBreathingEquipment.some((item) => have(item));
  if (have(jill) && (jill.underwater || haveUnderwaterFamEquipment)) return jill;
  const candidates = Familiar.all().filter(
    (fam) =>
      have(fam) && findFairyMultiplier(fam) > 0 && (fam.underwater || haveUnderwaterFamEquipment),
  );
  if (candidates.length === 0) return $familiar.none;
  return maxBy(candidates, (fam) => findFairyMultiplier(fam));
}
```

- [ ] **Step 2: Wire it as the default for +item tasks** (engine.ts customize, BEFORE `super.customize` at :323 and before the breathing enforcement at :646 so the breather fits the new familiar):

```ts
// Default item familiar on +item tasks that name none (B F2): without
// this the previous task's familiar rides along — 08-30 ran the whole
// B slice on the Patriotic Eagle. Only when the task left the slot
// open; sneakFamiliar()/eagle/sword picks all still win.
const modifiers = outfit.modifier ?? [];
if (
  outfit.familiar === undefined &&
  !undelay(task.freeaction) &&
  modifiers.some((m) => m.includes("item"))
) {
  outfit.equip(chooseItemFamiliar());
}
```

Check how `outfit.modifier` is typed in this engine (string[] vs string) and adapt the `.some` accordingly. Place after the backup/peridot block so those equips are settled.

- [ ] **Step 3: Rift outfit gets FLUDA + keeps monodent; rift tasks allow bat wings** (shadow.ts):

```ts
function riftOutfit() {
  return {
    modifier: "item",
    // FLUDA: Douse Foe rider on the slab (Task: slab yoink); bat wings for
    // Swoop like a Bat (engine.ts:328 avoids them unless task.batWings).
    // Gold's rift item% ran 863-928% with FLUDA/Kramco/wings on (B F2).
    equip: [
      monodent,
      $item`Flash Liquidizer Ultra Dousing Accessory`,
      ...(training() < 20 ? $items`sea cowboy hat, sea chaps` : []),
    ],
  };
}
```

Add `batWings: true` to each rift combat task ("Rufus Labyrinth", "Loded Stone", "Rift Fights") — NOT the freeaction ones.

- [ ] **Step 4: Run `yarn check`.**

- [ ] **Step 5: Commit**

```bash
git add src/engine/outfit.ts src/engine/engine.ts src/tasks/monkees/shadow.ts
git commit -m "feat: default item familiar on +item tasks; rift wears FLUDA and bat wings (B F2)"
```

---

### Task 9: Shadow-brick slab yoink + brick reservation — README #3, F#1

**Files:**

- Modify: `src/tasks/monkees/shadow.ts` (slab macro; replace the no-port comment at :34-38)
- Modify: `src/tasks/init.ts` (censer task)
- Modify: `src/resources/freekill.ts` (bricks not at the corral) + `selectFreeKill`

- [ ] **Step 1: Censer → Septapus charms at init** (port of UnderTheSeaGlobals.ash:1929-1943; add near the other init one-shots):

```ts
      {
        // Sept-Ember Censer: claim the day's embers, spend them on Septapus
        // summoning charms for the slab yoink (Globals:1929-1943; 2 embers
        // each, want 3). Gold farmed ~12 bricks off slabs this way (F #1).
        name: "Septapus Charms",
        ready: () => have($item`Sept-Ember Censer`),
        completed: () =>
          !have($item`Sept-Ember Censer`) ||
          itemAmount($item`Septapus summoning charm`) >= 3 ||
          get("_subaqua_censer_done", false),
        do: (): void => {
          if (!get("_septEmberBalanceChecked", false)) visitUrl("shop.php?whichshop=september");
          const wanted = Math.min(
            3 - itemAmount($item`Septapus summoning charm`),
            Math.floor(get("availableSeptEmbers", 0) / 2),
          );
          if (wanted > 0)
            buy($coinmaster`Sept-Ember Censer`, wanted, $item`Septapus summoning charm`);
          set("_subaqua_censer_done", true);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
```

- [ ] **Step 2: Slab yoink macro in riftCombat()** (shadow.ts; replaces the :34-38 no-port note — update that comment to say the port landed, censer/bat-wings support now exists):

```ts
const slab = $monster`shadow slab`;

/** Slab yoink (ash CCS:538-547): Septapus charm → Swoop like a Bat →
 * Perpetrate Mild Evil → Douse Foe up to 3/day until one lands. Each rider
 * multiplies the slab's brick yield; gold banked ~12 bricks off 5 slabs
 * (G:5285-6184) and spent 10 as School/Abyss free kills. Douse needs the
 * FLUDA worn, Swoop the bat wings (riftOutfit + task.batWings). */
function slabMacro(): Macro {
  const macro = new Macro();
  if (itemAmount($item`Septapus summoning charm`) > 0)
    macro.tryItem($item`Septapus summoning charm`);
  macro.trySkill($skill`Swoop like a Bat`);
  macro.trySkill($skill`Perpetrate Mild Evil`);
  if (!get("_douseFoeSuccess", false)) {
    const douses = Math.max(0, 3 - get("_douseFoeUses", 0));
    for (let i = 0; i < douses; i++) macro.trySkill($skill`Douse Foe`);
  }
  return macro;
}
```

Register it in `riftCombat()` ahead of fish/kill: `strategy.macro(slabMacro, slab);`

- [ ] **Step 3: Bricks never spent at the corral** (freekill.ts): add an optional field and filter.

On the type: `avoidAt?: Location[];`
On the shadow brick source:

```ts
    // Gold spent zero bricks before the School (F #1); the 08-30 run threw
    // all three at corral tumbleweeds. Bank them for School/Abyss.
    avoidAt: [$location`The Coral Corral`],
```

In `selectFreeKill`'s filter chain (freekill.ts:224-237):

```ts
if (location && source.avoidAt?.includes(location)) return false;
```

- [ ] **Step 4: Run `yarn check`.**

- [ ] **Step 5: Commit**

```bash
git add src/tasks/monkees/shadow.ts src/tasks/init.ts src/resources/freekill.ts
git commit -m "feat: shadow-slab brick yoink (Septapus/Swoop/Mild Evil/Douse), bricks banked for School (gold-trace #3)"
```

---

### Task 10: Hallpass supply — whistle, reservation, unconditional pull, pure -combat, backup, school loot macro — README #1, C F1 + C F4 + C F2

**Files:**

- Modify: `src/engine/engine.ts:1025` (whistle list)
- Modify: `src/lib/pulls.ts` (reservation) — actual path per survey: `src/resources/pulls.ts`
- Modify: `src/tasks/sorceress/school.ts` (Cowl and Rope; school combat/outfits)

- [ ] **Step 1: Whistle stolen hallpasses while a piece is missing** (engine.ts):

```ts
const alwaysWhistle = [
  ...$items`sea lasso, sea leather, sea cowbell, Mer-kin knucklebone, Mer-kin killscroll, Mer-kin healscroll, Mer-kin worktea`,
  // Hallpasses feed the cowl/rope superlikely (C F1: two stolen passes
  // went un-whistled with a whistle in hand, Y:8013/9427).
  ...(availableAmount($item`Mer-kin facecowl`) === 0 ||
  availableAmount($item`Mer-kin waistrope`) === 0
    ? $items`Mer-kin hallpass`
    : []),
];
```

(Whistle check uses `itemAmount(stolen) === 0` — the closeted passes make `availableAmount` nonzero but `itemAmount` zero; verify which count the superlikely / whistle logic needs. The stashed-in-closet passes are `availableAmount`; a stolen pass leaves `itemAmount` 0 which is the firing condition already in place at :1031.)

- [ ] **Step 2: Hallpass reservation** (pulls.ts, new entry in `pullReservations`):

```ts
  {
    // C F1: the hallpass pull must clear pullBudgetAllows' >= branch while
    // the cowl/rope hunt is live; the discretionary > branch refused it all
    // of 08-30 (16 pulls used, 5 reservations idle).
    name: "Mer-kin hallpass",
    item: $item`Mer-kin hallpass`,
    needed: () =>
      get("merkinElementaryTeacherUnlock", false) &&
      (availableAmount($item`Mer-kin facecowl`) === 0 ||
        availableAmount($item`Mer-kin waistrope`) === 0) &&
      availableAmount($item`Mer-kin hallpass`) <
        Number(availableAmount($item`Mer-kin facecowl`) === 0) +
          Number(availableAmount($item`Mer-kin waistrope`) === 0) &&
      !pulledToday($item`Mer-kin hallpass`),
  },
```

- [ ] **Step 3: Pull regardless of whether a first piece is held** (school.ts Cowl and Rope prepare — drop the `(cowl>0||rope>0) &&` clause):

```ts
        prepare: (): void => {
          takeCloset(closetAmount(hallpass), hallpass);
          sourceEnhanceItems();
          // C F1: pull whenever passes are short — the old first-piece gate
          // meant the pull could never seed the FIRST superlikely.
          if (availableAmount(hallpass) === 0 && pullBudgetAllows(hallpass)) {
            pullSequence(hallpass);
          }
          recover();
        },
```

- [ ] **Step 4: Pure -combat objective + free backup** (school.ts Cowl and Rope):

```ts
        backup: { targets: "free" }, // same lane as School Unlocks (C F2)
        combat: new CombatStrategy().macro(schoolLootMacro).kill(),
        outfit: () => ({
          modifier: "-combat", // ash UTS:2679 "-combat,sea"; +item from effects only (C F1)
          equip: [...crappyPieces, monodent, $item`blood cubic zirconia`],
          familiar: sneakFamiliar(),
        }),
```

- [ ] **Step 5: School loot macro (C F4)** — new helper in school.ts, attach to School Unlocks, Cowl and Rope, Farm School combats ahead of `.kill()`:

```ts
const monodent = $item`Monodent of the Sea`;

/** Ash CCS:990-1011 school case: Talk to Some Fish converts the draw, then
 * Refracted Gaze yoinks ~5 Mer-kin items (hallpasses included — gold banked
 * 10 passes in 11 free fights, C F4). Gaze gated on affordability
 * (submysticality over a 40k floor, CCS:113). Fish-table yield UNVERIFIED
 * (BRIEF flag) — verify live; the gaze's hallpass stack alone justifies it.
 * Never on free monsters (a converted copy loses lastCopyableMonster) and
 * never on the monitor (cheatsheet fight). */
function schoolLootMacro(): Macro {
  const steps = new Macro();
  if (have($skill`Sea *dent: Talk to Some Fish`))
    steps.trySkill($skill`Sea *dent: Talk to Some Fish`);
  if (bczAffordable("_bczRefractedGazeCasts", "submysticality", 40000)) {
    // eslint-disable-next-line libram/verify-constants -- codpiece gem skill, plugin data lags
    steps.trySkill($skill`BCZ: Refracted Gaze`);
  }
  if (steps.components.length === 0) return new Macro();
  return Macro.ifNot([...freeMonsters, monitor], openerOnce(steps, 3));
}
```

Imports: `bczAffordable` (resources/freekill), `freeMonsters` (resources/backup), `openerOnce` (engine/combat). Add `monodent` + BCZ to School Unlocks / Farm School outfit equip arrays as well (C F4 "pin Monodent + BCZ in the school outfits").

- [ ] **Step 6: Run `yarn check`.**

- [ ] **Step 7: Commit**

```bash
git add src/engine/engine.ts src/resources/pulls.ts src/tasks/sorceress/school.ts
git commit -m "feat: hallpass supply — whistle+reservation+pull, pure -combat cowl hunt, school fish/gaze loot macro (gold-trace #1)"
```

---

### Task 11: Kramco off-hand when the goblin is due — README #4(iv)/F#7, C F3

**Files:**

- Modify: `src/tasks/sorceress/library.ts` (Library Farm outfit), `src/tasks/sorceress/school.ts` (Farm School outfit), `src/tasks/monkees/shadow.ts` (riftOutfit)

- [ ] **Step 1: Helper** (put in `src/engine/outfit.ts`, export):

```ts
/** Kramco rides the off-hand on +item farm fights when a sausage goblin is
 * guaranteed (ash delay() pattern, G:497) — the goblin is the free
 * lastCopyableMonster that seeds backup:{targets:"free"} chains (C F3:
 * yesterday's backup charges sat at 8/11 all day with no goblin to copy). */
export function kramcoIfDue(): Item[] {
  return have($item`Kramco Sausage-o-Matic™`) && getKramcoWandererChance() >= 1
    ? $items`Kramco Sausage-o-Matic™`
    : [];
}
```

(`getKramcoWandererChance` is a libram export.)

- [ ] **Step 2: Spread `...kramcoIfDue()` into the equip arrays** of Library Farm, Farm School, and riftOutfit.

- [ ] **Step 3: Run `yarn check`.**

- [ ] **Step 4: Commit**

```bash
git add src/engine/outfit.ts src/tasks/sorceress/library.ts src/tasks/sorceress/school.ts src/tasks/monkees/shadow.ts
git commit -m "feat: Kramco off-hand on +item farms when the goblin is due (C F3)"
```

---

### Task 12: Mom finish — peridot + VHS + shark jumper on the cyber-lane Abyss tasks — README #8, B F5, #4(iii)

**Files:**

- Modify: `src/tasks/monkees/mom.ts` (Abyss Habitats :243-291, Cyber Mom :292-324)

- [ ] **Step 1: Abyss Habitats** — add `peridot: abyssPeridot` (B F5: gold's Peanut-free entry, `_perilLocations 190→190,337` G:3665), thread `vhsMacro` into its combat, and add the shark jumper:

```ts
              do: abyss,
              peridot: abyssPeridot,
              combat: new CombatStrategy()
                .macro(monsterMacro(vhsMacro, vhsTargets))
                .macro(
                  monsterMacro(
                    () => openerOnce(Macro.trySkill($skill`Recall Facts: Monster Habitats`)),
                    habitatTargets,
                  ),
                )
                .kill(),
              outfit: {
                modifier: "item",
                equip: [glass, $item`shark jumper`],
                avoid: [crystalBall],
              },
```

(Keep whatever the current combat block looks like — the change is ONLY adding the `monsterMacro(vhsMacro, vhsTargets)` step, `peridot:`, and the jumper. E F2: the VHS sat unredeemed turns 17→108 because vhsMacro rode only abyssCombat().)

- [ ] **Step 2: Cyber Mom** — same VHS step ahead of the cyber-rock macro:

```ts
              combat: new CombatStrategy()
                .macro(monsterMacro(vhsMacro, vhsTargets))
                .macro(/* existing Throw Cyber Rock macro unchanged */)
                .kill(),
```

- [ ] **Step 3: Run `yarn check`.**

- [ ] **Step 4: Commit**

```bash
git add src/tasks/monkees/mom.ts
git commit -m "fix: cyber-lane Abyss tasks carry the peridot, VHS window and shark jumper (B F5, #4iii)"
```

---

### Task 13: Pull reservations — drop the init sea-lasso pull; digpick reservation — README #9, B F3

**Files:**

- Modify: `src/tasks/init.ts:51` (seaGearPulls) and the comment at :39-45
- Modify: `src/resources/pulls.ts` (digpick reservation)
- Modify: `src/tasks/sorceress/mine.ts` (export the need, use plain pullSequence path via budget)

- [ ] **Step 1: Drop the lasso** (init.ts):

```ts
// The sea lasso is NOT pulled (ash parity restored, UTS:600): the rift
// trains the throws in free fights (shadowRiftQuest is in the plan) and the
// F4 opener bundle supplies lassos — B F3: the 08-30 init lasso pull bought
// exactly +1 training and its slack blocked the digpick pull.
const seaGearPulls = $items`Mer-kin sneakmask, shark jumper, scale-mail underwear, Elf Guard SCUBA tank`;
```

Delete the stale :339-345 in-loop comment.

- [ ] **Step 2: Digpick reservation** (pulls.ts; condition mirrors mine.ts's Digpick task):

```ts
  {
    // B F3/D: gold pulled the digpick (G:4751); 08-30 farmed it at 2 paid
    // turns because idle reservations blocked the discretionary branch.
    // Needed while the teflon ore is unsecured and no digpick is held.
    name: "Mer-kin digpick",
    item: $item`Mer-kin digpick`,
    needed: () =>
      availableAmount($item`Mer-kin digpick`) === 0 &&
      itemAmount($item`teflon ore`) === 0 &&
      availableAmount($item`teflon swim fins`) === 0 &&
      !have($item`crappy Mer-kin tailpiece`) &&
      !pulledToday($item`Mer-kin digpick`),
  },
```

Check mine.ts for the exact ore/fins/tailpiece item names (`oreSecured()` at mine.ts:60-70) and mirror them precisely; if the tailpiece test there is a helper (`tailpieceOwned()`), inline its item test rather than importing (pulls.ts must stay dependency-light).

- [ ] **Step 3: Run `yarn check`.**

- [ ] **Step 4: Commit**

```bash
git add src/tasks/init.ts src/resources/pulls.ts
git commit -m "fix: pull budget — drop the init sea-lasso pull, reserve the digpick (gold-trace #9)"
```

---

### Task 14: Final gates + docs

- [ ] **Step 1:** `yarn lint` — fix any complaints (`yarn lint:fix` for format).
- [ ] **Step 2:** `yarn build` — must succeed (rollup → rhino target).
- [ ] **Step 3:** Update `docs/superpowers/research/2026-08-31-gold-trace/README.md` "Changes landed" section: list what landed today, and shrink the "Not yet touched" line to what remains (scale-mail pull, Macrometeorite re-rolls, X-Ray reorder, SCUBA review).
- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/research/2026-08-31-gold-trace/README.md
git commit -m "docs: gold-trace ledger — mark ranked fixes 1,3,4,5,7,8,9 and #2 leftovers landed"
```

## Self-Review notes

- Spec coverage: #1 → T10; #2 leftovers → T4, T5, T6; #3 → T9; #4(i) → T2, (ii) → T3, (iii) → T12, (iv) → T11; #5 → T1; #6 already landed (fdc2edc); #7 → T7, T8; #8 → T12 (Banish Constructs gate already landed; scale-mail skipped, UNVERIFIED); #9 → T13. B F6 screech: covered by existing screechTurn() once T1 makes it reachable.
- Deliberate skips are listed in Global Constraints; each is either UNVERIFIED in the reports or marked "review" rather than "change".
- Verification is compile/lint/build only — no test harness exists; the live gold-guarded run is the acceptance test, per the established workflow.
