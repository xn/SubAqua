# UTS Parity Ports (G1–G10) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the ten plan-level gaps between SubAqua and UnderTheSea found in the 2026-08-28 step-by-step diff, so a mid-tier SubAqua run lands on the ash's turn counts.

**Architecture:** All changes land on the `worktree-phase4-sorceress` branch (worktree `.claude/worktrees/phase4-sorceress`). Resource-ladder rules go in `src/resources/*` and `src/engine/engine.ts` (customize hooks); route changes are new/edited grimoire tasks under `src/tasks/`; the choice script gains the Rufus/Loded-Stone handlers. The ash (deployed `~/Library/Application Support/KoLmafia/scripts/UnderTheSea*.ash`, cited as `UTS:`/`G:`/`CCS:`) is the behavioural authority for every port.

**Tech Stack:** TypeScript, grimoire-kolmafia 0.3.x, libram 0.11.23, kolmafia JS runtime (Rhino). No unit-test harness exists (`yarn test` is a stub); verification per task is `yarn check` (tsc) + `yarn lint` (eslint + prettier), and the plan ends with `yarn build` + a live checklist.

**Spec:** `docs/superpowers/research/2026-08-28-uts-parity-gap.md` (§2 "New gaps", items G1–G10) with appendices in `docs/superpowers/research/2026-08-28-parity/`.

## Global Constraints

- Every command runs from the worktree root: `/Users/xn/sites/KOL/SubAqua/.claude/worktrees/phase4-sorceress`.
- `yarn check` and `yarn lint` must be green before every commit (`yarn format` fixes prettier/eslint autofixables).
- Never spend real turns on mining, paid uneffects, or healing skills other than Cannelloni Cocoon / Tongue of the Walrus (user rules in memory) — none of these tasks touch those, keep it that way.
- `%fn`-prefixed familiar skills and `Sea *dent:` skills are rendered by libram by id; keep the existing eslint-disable pattern only where the plugin's data snapshot lacks an entry (Sword of S Words). Every skill/item named below exists in mafia's data files (checked 2026-08-28 against `../kolmafia/src/data`).
- Commit messages: `<type>: <summary>` + the trailer lines the repo already uses (see `git log -3`).
- Do not touch `src/tasks/runplans.ts` ordering except where Task 10 says.

---

### Task 1: G1 — bang potions: pull, craft, use, identify in combat

**Files:**

- Create: `src/resources/bangpotions.ts`
- Modify: `src/tasks/init.ts` (new task after "Sea Gear Pulls", ~line 325-353)
- Modify: `src/engine/engine.ts` (customize(), after the lasso block ending ~line 280)
- Modify: `src/lib/dreadscroll.ts` (`candidateSeeds()` memo key, ~line 386-395)
- Modify: `src/sim.ts` (`routePulls`, line 22)

**Interfaces:**

- Produces: `bangPotions: Item[]`, `bangPotionIdentified(potion: Item): boolean`, `unidentifiedBangPotions(): Item[]`, `bangPotionMacro(): Macro` (round-guarded throws), `bangPotionCriteriaKey(): string`.
- Consumes: `openerOnce` from `src/engine/combat.ts`, `discretionaryPull` from `src/resources/pulls.ts`.

Why (spec G1): the seedfinder criteria include the nine bang-potion identities (`SeedCriteria.ash:80-143`; our `playerCriteria()` already reads `lastBangPotion819..827`). The ash pulls a ten-leaf clover + large box, crafts a blessed large box, uses it (UTS:594-619), and its CCS preamble throws every unidentified potion during rounds 1-4 of any fight but a sea cowboy's (CCS:485-495). On 08-21 all nine prefs were set on turn 2 and the seahorse name then left 2 seed candidates; on 08-28 we had 23.

- [ ] **Step 1: Create the resource module**

```ts
// src/resources/bangpotions.ts
import { Item, toInt } from "kolmafia";
import { $items, $monster, $skill, get, have, Macro } from "libram";

/**
 * The nine bang potions (items.txt ids 819-827, one of each from a blessed
 * large box). Their identities are a dreadscroll-seed criterion
 * (seedfinder SeedCriteria.ash:80-143; lib/dreadscroll.ts playerCriteria()),
 * which is why the ash pulls a ten-leaf clover + large box at init
 * (UTS:594-619) and throws every unidentified potion in its first ordinary
 * fights (CCS:485-495). Same seahorse name, 08-21 vs 08-28: 2 candidates
 * with the potions known, 23 without.
 */
export const bangPotions = $items`milky potion, swirly potion, bubbly potion, smoky potion, cloudy potion, effervescent potion, fizzy potion, dark potion, murky potion`;

/** mafia records a thrown/used potion's effect in lastBangPotion<id>. */
export function bangPotionIdentified(potion: Item): boolean {
  return get(`lastBangPotion${toInt(potion)}`, "") !== "";
}

/** Potions in inventory whose identity mafia has not recorded yet. */
export function unidentifiedBangPotions(): Item[] {
  return bangPotions.filter((potion) => have(potion) && !bangPotionIdentified(potion));
}

/** The nine identities as one string ("?" = unknown) — the seed scan's memo
 * key needs it so a newly identified potion re-filters the candidate list. */
export function bangPotionCriteriaKey(): string {
  return bangPotions
    .map((potion) => get(`lastBangPotion${toInt(potion)}`, "").charAt(0) || "?")
    .join("");
}

/** Fights that must never be spent identifying potions: the ash skips the
 * sea cowboy (CCS:485, its lasso drop wants the round-1 imprint/free kill)
 * and the wild seahorse is a boss the tamer must reach on round 1. */
export const bangPotionNever = [$monster`sea cowboy`, $monster`wild seahorse`];

/**
 * Throw every unidentified potion, funkslinging pairs when the skill is
 * known (ash bangA()/bangB(), CCS:379-395). Each throw is guarded on its
 * own round so the batch stops at round 5 like the ash's `current_round() < 5`
 * loop — a throw is a round, and a long potion volley on a hard fight is a
 * lost fight. Guard is `!pastround 6` because KoL's `pastround N` is already
 * true on round N (combat.ts openerOnce()).
 */
export function bangPotionMacro(): Macro {
  const potions = unidentifiedBangPotions();
  const macro = new Macro();
  const throws: (Item | [Item, Item])[] = [];
  if (have($skill`Ambidextrous Funkslinging`)) {
    for (let i = 0; i + 1 < potions.length; i += 2) throws.push([potions[i], potions[i + 1]]);
    if (potions.length % 2 === 1) throws.push(potions[potions.length - 1]);
  } else {
    throws.push(...potions);
  }
  for (const item of throws) macro.step(Macro.ifNot("pastround 6", Macro.tryItem(item)));
  return macro;
}
```

- [ ] **Step 2: Add the Init task**

In `src/tasks/init.ts` add the imports `retrieveItem` is already imported; add `import { bangPotions } from "../resources/bangpotions";` and, directly after the "Sea Gear Pulls" task object, this task:

```ts
      {
        // Ash UTS:594-619: ten-leaf clover + large box pulls, crafted into a
        // blessed large box and used for nine bang potions. Their identities
        // (thrown in combat by the engine's opener, resources/bangpotions.ts)
        // are what pins the dreadscroll seed from the seahorse name alone.
        // Marker pref, not item state: at low shiny discretionaryPull refuses
        // and the task must still complete.
        name: "Bang Potions",
        completed: () => get("_subaqua_bang_pulled", false),
        do: (): void => {
          const box = $item`blessed large box`;
          if (!have(box) && !bangPotions.some((potion) => have(potion))) {
            if (!have($item`ten-leaf clover`)) discretionaryPull($item`ten-leaf clover`);
            if (!have($item`large box`)) discretionaryPull($item`large box`);
            if (have($item`ten-leaf clover`) && have($item`large box`)) retrieveItem(box);
          }
          if (have(box)) use(box);
          set("_subaqua_bang_pulled", true);
        },
        freeaction: true,
        limit: { tries: 1 },
      },
```

- [ ] **Step 3: Engine opener**

In `src/engine/engine.ts` add `import { bangPotionMacro, bangPotionNever, unidentifiedBangPotions } from "../resources/bangpotions";` and insert immediately after the lasso block (the `if (!undelay(task.freeaction) && isTrainingLasso() && isUnderwaterTask(task)) {...}` statement, before `super.customize(...)`):

```ts
// Bang-potion identification (ash CCS:485-495): throw the unidentified
// potions on ordinary fights. AFTER the lasso opener in registration
// order so the round-1 throw is never pushed out; never on a fight whose
// whole point is a round-1 Force or free kill (those tasks declare
// forceItems/killFree/yellowRay), and never on a free-action task.
if (
  !undelay(task.freeaction) &&
  !combat.can("forceItems") &&
  !combat.can("killFree") &&
  !combat.can("yellowRay") &&
  unidentifiedBangPotions().length > 0
) {
  combat.startingMacro(Macro.ifNot(bangPotionNever, bangPotionMacro()));
}
```

- [ ] **Step 4: Memo key**

In `src/lib/dreadscroll.ts` import `bangPotionCriteriaKey` from `../resources/bangpotions` and change the key line in `candidateSeeds()` to:

```ts
const key = `${turnsPlayed()}|${currentClues().join(",")}|${bangPotionCriteriaKey()}|${get("subaqua_seedCandidates", "")}`;
```

Check the import does not create a cycle: `bangpotions.ts` imports only kolmafia/libram — it must NOT import from `engine/` (keep `Macro.ifNot`, not `openerOnce`).

- [ ] **Step 5: sim checklist**

In `src/sim.ts` add `ten-leaf clover, large box` to `routePulls` (after `Mer-kin sneakmask, sea lasso`).

- [ ] **Step 6: Verify**

Run: `yarn check && yarn lint`
Expected: both exit 0. Then `grep -n "Bang Potions" src/tasks/init.ts` shows the task, and `grep -n "bangPotionMacro" src/engine/engine.ts` shows the opener.

- [ ] **Step 7: Commit**

```bash
git add src/resources/bangpotions.ts src/tasks/init.ts src/engine/engine.ts src/lib/dreadscroll.ts src/sim.ts
git commit -m "feat: identify the nine bang potions like the ash (large box pulls + combat opener) so the seahorse name pins the dreadscroll seed (G1)"
```

---

### Task 2: G6 + G10 — no free-kill or banish charges on already-free fights; Peanut is never free-killed

**Files:**

- Modify: `src/resources/freekill.ts` (`freeKillNever`, line ~291)
- Modify: `src/engine/engine.ts` (banish provide ~line 312-326; `reserved` list ~line 527-534)

**Interfaces:**

- Consumes: `freeMonsters` from `src/resources/backup.ts` (already exported).

Why (spec G6/G10): 08-28 spent Chest X-Ray #3 and four Sweat Bullets on habitat-copy golems and a curveball on a hipster Black Crayon Slime; the ash's `free_monster()` list (G:72-76) is exactly what it never `free_kill`s or runs from. Assert Your Authority on Peanut did not end the fight (D:84421) and the ash's own brick on Peanut was also a paid fight (B:114296).

- [ ] **Step 1: Peanut**

In `src/resources/freekill.ts` change the `freeKillNever` export to:

```ts
export const freeKillNever: Monster[] = [$monster`wild seahorse`, $monster`Peanut`];
```

and extend the doc comment above it with: `Peanut (Caliginous Abyss) shrugs off instakills: live 2026-08-28 Assert Your Authority landed and the fight ran ten more rounds (session log:84421); UTS 08-21's shadow brick on it was a paid fight too (:114296).`

- [ ] **Step 2: Free-monster guard on the opportunistic free kill**

In `engine.ts` import `freeMonsters` from `../resources/backup` (the file already imports `backupCamera, backupMacro, backupTarget` from there — extend that import). In the `reserved` array inside the opportunistic block replace the spread with:

```ts
const reserved = [
  ...new Set([
    ...combatActions
      .filter((action) => action !== "kill")
      .flatMap((action) => combat.where(action)),
    ...freeKillNever,
    // Fights that are already free — habitat/backup copies of the
    // golem, crayon wanderers, Kramco goblins, time cops (ash
    // free_monster(), G:72-76; backup.ts freeMonsters) — never earn a
    // free-kill charge: live 2026-08-28 five charges went to golems.
    ...freeMonsters,
  ]),
];
```

- [ ] **Step 3: Free-monster guard on the banish provide**

In the `combat.can("banish")` block change the provide to:

```ts
resources.provide("banish", {
  do: () => Macro.ifNot(freeMonsters, Macro.step(banish)).step(fallbackMacro()),
});
```

(A free wanderer under a default `.banish()` — the Garden Pellet's hipster slime, a Kramco goblin at the Wreck — then falls to the kill ladder instead of eating the day's curveball.)

- [ ] **Step 4: Verify**

Run: `yarn check && yarn lint` — exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/resources/freekill.ts src/engine/engine.ts
git commit -m "fix: never spend a free kill or banish on an already-free fight; Peanut is not instakillable (G6, G10)"
```

---

### Task 3: G7 — task free-runs may spend banishing rungs

**Files:**

- Modify: `src/engine/task.ts` (Task type)
- Modify: `src/engine/engine.ts` (freeRun provide, the three `selectFreeRun({...})` calls ~line 430-448)
- Modify: `src/tasks/monkees/grandpa.ts` ("Find Grandpa"), `src/tasks/monkees/outpost.ts` ("Outpost Stashbox", "Prayerbeads"), `src/tasks/monkees/bigbrother.ts` ("Wreck Rescue (sneak)"), `src/tasks/monkees/helmet.ts` ("Wreck Rivets (hatch closed)")

Why (spec G7): `selectFreeRun` is always called with `banish:false` from customize(), so Spring Kick / curveball / latte / Feel Hatred / Snokebomb never run a task's free-run walk. The ash's pearl-zone, Wreck and outpost handlers call `free_run(page_text, true)` on non-targets (CCS:583-613, 636-658, 720-728).

- [ ] **Step 1: Task flag**

In `src/engine/task.ts` add to the `Task` type, after `saberPurpose`:

```ts
  /** freeRun may spend BANISHING rungs (Spring Kick, curveball, latte, Feel
   * Hatred, Snokebomb, thrown banishes) — the ash's `free_run(page_text, true)`
   * sites: pearl zones, the Wreck, the outpost's non-droppers. Default false
   * = plain runs only (the guild tests, ash CCS:505-521). */
  freeRunBanishes?: boolean;
```

- [ ] **Step 2: Engine**

In the `combat.can("freeRun")` block define `const banish = task.freeRunBanishes === true;` right after `const sneak = sneakFamiliar();` and pass `banish` into all three `selectFreeRun({...})` calls in that block:

```ts
const candidate = selectFreeRun({
  banish,
  location,
  exclude: new Set([...exclude, ...familiarRunSources]),
});
```

```ts
        : firstEquippable(outfit, (exclude) => selectFreeRun({ banish, location, exclude }));
```

```ts
source = firstEquippable(outfit, (exclude) => selectFreeRun({ banish, location, exclude }));
```

- [ ] **Step 3: Flag the five tasks**

Add `freeRunBanishes: true,` (with a one-line comment `// ash free_run(page_text, true) here, CCS:<cite>`) to:

- `grandpa.ts` "Find Grandpa" (CCS:646-654)
- `outpost.ts` "Outpost Stashbox" and "Prayerbeads" (CCS:721-724 burglar/raider)
- `bigbrother.ts` "Wreck Rescue (sneak)" (CCS:586-598)
- `helmet.ts` "Wreck Rivets (hatch closed)" (same Wreck handler)

- [ ] **Step 4: Verify**

Run: `yarn check && yarn lint` — exit 0. `grep -rn "freeRunBanishes: true" src/tasks | wc -l` prints 5.

- [ ] **Step 5: Commit**

```bash
git add src/engine/task.ts src/engine/engine.ts src/tasks/monkees/grandpa.ts src/tasks/monkees/outpost.ts src/tasks/monkees/bigbrother.ts src/tasks/monkees/helmet.ts
git commit -m "feat: -combat walks may banish non-targets like the ash's free_run(banish=true) sites (G7)"
```

---

### Task 4: G5 — bat wings only where the ash wears them

**Files:**

- Modify: `src/engine/task.ts` (Task type), `src/engine/engine.ts` (customize, after `super.customize`)
- Modify: `src/tasks/sorceress/yogurt.ts` ("Yog-Urt" task), `src/tasks/sorceress/finale.ts` ("Nautical Seaceress" task)
- Modify: `src/tasks/sorceress/gym.ts` (`gymnasiumTurn` terms), `src/tasks/sorceress/skatepark.ts` (`skateParkTurn` terms)

Why (spec G5): Tame Seahorse's `initiative` maximize picked bat wings and four of the five free fights went to tumbleweeds (D:87666-88034); the ash pins them only in the rift, Yog-Urt, the colosseum and the Seaceress (A S33/S50/S54/S57).

- [ ] **Step 1: Task flag**

In `task.ts` add:

```ts
  /** This task may wear bat wings. Everywhere else the engine avoids them so
   * the five daily free fights are banked for the colosseum and the
   * Seaceress (ash if_equip(bat wings) sites: rift, Yog-Urt, colosseum, NS). */
  batWings?: boolean;
```

- [ ] **Step 2: Engine avoid**

In `engine.ts` customize(), immediately after `super.customize(task, outfit, combat, resources);`:

```ts
// Bat wings are banked (task.batWings): live 2026-08-28 an `initiative`
// maximize wore them at the corral and burned four free fights on
// tumbleweeds, costing two paid colosseum rounds and a paid Seaceress.
if (!task.batWings && have($item`bat wings`)) outfit.equip({ avoid: [$item`bat wings`] });
```

- [ ] **Step 3: Flag the two grimoire tasks that equip them**

Add `batWings: true,` to the "Yog-Urt" task in `yogurt.ts` (the one whose outfit lists `$item\`bat wings\``) and to the "Nautical Seaceress" task in `finale.ts`.

- [ ] **Step 4: Self-dressing helpers**

In `gym.ts` `gymnasiumTurn()` change `const terms = ["combat rate", ...pieces];` to `const terms = ["combat rate", "-equip bat wings", ...pieces];`. In `skatepark.ts` `skateParkTurn()` change `const terms = ["-combat", "-equip Peridot of Peril"];` to `const terms = ["-combat", "-equip Peridot of Peril", "-equip bat wings"];`. (`colosseum.ts` already pins them deliberately; leave it.)

- [ ] **Step 5: Verify**

Run: `yarn check && yarn lint` — exit 0. `grep -rn "batWings: true" src/tasks | wc -l` prints 2.

- [ ] **Step 6: Commit**

```bash
git add src/engine/task.ts src/engine/engine.ts src/tasks/sorceress/yogurt.ts src/tasks/sorceress/finale.ts src/tasks/sorceress/gym.ts src/tasks/sorceress/skatepark.ts
git commit -m "fix: bat wings only at Yog-Urt, the colosseum and the Seaceress — free fights are banked everywhere else (G5)"
```

---

### Task 5: G9 — Digpick never adventures once the pull lands

**Files:**

- Modify: `src/tasks/sorceress/mine.ts` ("Digpick" task, ~line 336-351)

- [ ] **Step 1: Function `do`**

Replace `do: $location\`Anemone Mine\`,` in the "Digpick" task with:

```ts
        // Function do: grimoire only adventures on a returned Location, so the
        // pull in prepare() (which runs after ready/completed) ends the task
        // without a fight. Live 2026-08-28: the pull landed and the task still
        // fought a Mer-kin miner, which dropped a second digpick (log:87539-87593).
        do: () => (availableAmount(digpick) > 0 ? undefined : $location`Anemone Mine`),
        underwater: true,
```

- [ ] **Step 2: Verify**

Run: `yarn check && yarn lint` — exit 0 (if tsc rejects `undefined` from `do`, return `void 0` typed as `Location | void` per grimoire's `Task.do` signature — check `node_modules/grimoire-kolmafia/dist/task.d.ts`).

- [ ] **Step 3: Commit**

```bash
git add src/tasks/sorceress/mine.ts
git commit -m "fix: Digpick stops after a successful pull instead of adventuring (G9)"
```

---

### Task 6: G8 — banish constructs on the last habitat golem at the Outpost

**Files:**

- Modify: `src/tasks/monkees/outpost.ts` (`golemRecallMacro`, `farmCombat`, the two farm tasks' outfits)

Why (spec G8): the ash screeches on the last habitat golem with the eagle out (CCS:676-678, familiar swap UTS:1319-1322) at zero turns; we paid a Madness Bakery turn. "Banish Constructs" (mom.ts) already completes when `banishedPhyla` contains "construct", so it becomes the fallback automatically.

- [ ] **Step 1: Eagle turn predicate + macro**

In `outpost.ts` add `const eagle = $familiar\`Patriotic Eagle\`;`(import`$familiar`) and:

```ts
/** The last habitat golem fight (fights left 1 BEFORE the fight; mafia
 * decrements on encounter) once both outpost recalls are spent, on an
 * account with the cyber kit and no construct banish yet: the ash fields the
 * eagle for exactly that fight and screeches in it (UTS:1319-1322,
 * CCS:676-678) — the construct banish costs no turn there, where the Madness
 * Bakery lane costs one. */
function screechTurn(): boolean {
  return (
    have(eagle) &&
    have($item`server room key`) &&
    !get("banishedPhyla").includes("construct") &&
    get("_monsterHabitatsFightsLeft", 0) === 1 &&
    get("_monsterHabitatsRecalled", 0) >= 2
  );
}

function golemRecallMacro(): Macro {
  const macro = new Macro();
  if (
    have($skill`Just the Facts`) &&
    get("_monsterHabitatsFightsLeft", 0) === 0 &&
    get("_monsterHabitatsRecalled", 0) < 2
  ) {
    macro.trySkill($skill`Recall Facts: Monster Habitats`);
  }
  if (screechTurn()) macro.trySkill($skill`%fn, Release the Patriotic Screech!`);
  return macro.components.length > 0 ? openerOnce(macro) : macro;
}
```

(delete the old `golemRecallMacro` body). `%fn, Release the Patriotic Screech!` is already used in `mom.ts` without an eslint disable.

- [ ] **Step 2: Field the eagle for that fight**

Change both farm tasks' `outfit: { modifier: "item" },` ("Outpost Grandma", "Outpost Lockkey") to:

```ts
        outfit: () => ({ modifier: "item", familiar: screechTurn() ? eagle : undefined }),
```

- [ ] **Step 3: Verify**

Run: `yarn check && yarn lint` — exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/tasks/monkees/outpost.ts
git commit -m "feat: the eagle screeches on the last outpost habitat golem; the Bakery is the fallback (G8)"
```

---

### Task 7: G3 — Sea \*dent: Talk to Some Fish on non-target fights

**Files:**

- Modify: `src/engine/combat.ts` (new `fishMacro()`, `MyActionDefaults.freeRun/banish`)
- Modify: `src/engine/engine.ts` (`fallbackMacro`, banish + freeRun provides)
- Modify: `src/tasks/monkees/guild.ts` ("Guild Test" outfit), `grandpa.ts` ("Find Grandpa"), `bigbrother.ts` ("Wreck Rescue (sneak)"), `outpost.ts` ("Outpost Stashbox", "Prayerbeads"), `helmet.ts` ("Wreck Rivets (hatch closed)")

Why (spec G3): UTS never spent a turn on scales — non-target monsters it was going to kill anyway were turned into _some fish_ (monsters.txt: pristine 10% / rough 20% / dull 30%) and it had 6 pristine banked by turn 16 (B:111236-111250). The 08-21 rows show the original monster's drops still landing after the conversion (slab bricks at B:110093, monitor cheatsheet at B:111402). Sites at mid tier with a pay phone: guild tests (CCS:517), Bakery (CCS:527), Wreck scavenger (CCS:594), pearl-zone non-targets (CCS:650), the rift (CCS:551). The skill is granted by the equipped Monodent (classskills.txt:1150, combat, 1 MP) so those outfits pin it.

- [ ] **Step 1: `fishMacro()`**

In `combat.ts` add (imports: `availableAmount` from kolmafia; `$skill` already):

```ts
/**
 * Sea *dent: Talk to Some Fish (Monodent, CCS:551 and the sites listed in the
 * 2026-08-28 parity report G3): turns a non-target monster into "some fish"
 * (monsters.txt: pristine fish scale 10%, rough 20%, dull 30%; the original
 * drops still land, session log 08-21:110093, :111402). Only while the crappy
 * disguise still needs scales (6 = mask 3 + tailpiece 3, ash `< 6`), and only
 * when the skill is castable — libram's have(Skill) is true for a
 * Monodent-granted skill only while the Monodent is worn, which is why this is
 * built after dress() like killMacro().
 */
export function fishMacro(): Macro {
  if (!have($skill`Sea *dent: Talk to Some Fish`)) return new Macro();
  if (availableAmount($item`pristine fish scale`) >= 6) return new Macro();
  return Macro.trySkill($skill`Sea *dent: Talk to Some Fish`);
}
```

- [ ] **Step 2: Defaults**

In `MyActionDefaults`:

```ts
  freeRun(target?: Monster | Location) {
    if (target instanceof Location && target.environment !== "underwater") {
      return fishMacro().step(killMacro(false));
    }
    return runMacro().step(fishMacro()).step(killMacro(false));
  }
  ...
  banish(target?: Monster | Location) {
    // No banish source left: the fight is unwanted anyway, so a fish is the
    // best thing it can become before the kill ladder (ash CCS:650).
    return fishMacro().step(this.kill(target));
  }
```

- [ ] **Step 3: Engine fallbacks**

In `engine.ts` change `fallbackMacro` to take an option:

```ts
function fallbackMacro(options: { fish?: boolean } = {}): Macro {
  return options.fish ? fishMacro().step(killMacro(false)) : killMacro(false);
}
```

(import `fishMacro` from `./combat`). Pass `{ fish: true }` in the **banish** provide and the **freeRun** provide only — the `forceItems`/`yellowRay` provides keep the plain fallback (a failed Force still wants the diver's drops, not a fish).

- [ ] **Step 4: Pin the Monodent on the -combat walks and the guild test**

Add `$item\`Monodent of the Sea\``to the outfit`equip`list of: "Guild Test" (guild.ts — the outfit is a function returning`{ modifier: "-combat", familiar }`; add `equip: $items\`Monodent of the Sea\``), "Find Grandpa" (grandpa.ts, alongside the sneakmask), "Wreck Rescue (sneak)" (bigbrother.ts), "Outpost Stashbox" and "Prayerbeads" (outpost.ts), "Wreck Rivets (hatch closed)" (helmet.ts). createOutfit() strips unowned gear, so no `have()` gates.

- [ ] **Step 5: Verify**

Run: `yarn check && yarn lint` — exit 0. `grep -rn "Monodent of the Sea" src/tasks/monkees | wc -l` ≥ 6.

- [ ] **Step 6: Commit**

```bash
git add src/engine/combat.ts src/engine/engine.ts src/tasks/monkees/guild.ts src/tasks/monkees/grandpa.ts src/tasks/monkees/bigbrother.ts src/tasks/monkees/outpost.ts src/tasks/monkees/helmet.ts
git commit -m "feat: Talk to Some Fish on non-target fights while the crappy disguise needs scales (G3)"
```

---

### Task 8: G4 — Waffle Day and the corral waffle re-roll

**Files:**

- Modify: `src/resources/policy.ts` (new field `castWaffleDay`)
- Modify: `src/tasks/init.ts` (new task after "Bang Potions")
- Modify: `src/tasks/monkees/corral.ts` ("Tame Seahorse" combat)

Why (spec G4): the ash casts _Aug. 24th: Waffle Day!_ at init (UTS:481-482, not at high) and in the taming regime throws a waffle at whatever is not the seahorse (CCS:829-843) — a waffle re-rolls the monster; on 08-21 rustler → cowboy → wild seahorse, tamed on the same free visit.

- [ ] **Step 1: Policy**

In `policy.ts` add to `ResourcePolicy`:

```ts
/** Cast Aug. 24th: Waffle Day! at init — the waffle throw is the corral's
 * seahorse summon (ash UTS:481-482 skips it at high shiny). */
castWaffleDay: boolean;
```

and set `castWaffleDay: true` in `low` and `mid`, `false` in `high`.

- [ ] **Step 2: Init task**

In `init.ts` (imports: `useSkill` from kolmafia, `$skill` from libram) add after "Bang Potions":

```ts
      {
        // Ash UTS:481-482: three waffles for the corral re-roll (CCS:829-843).
        name: "Waffle Day",
        ready: () =>
          policy.castWaffleDay &&
          have($skill`Aug. 24th: Waffle Day!`) &&
          !get("_aug24Cast", false) &&
          get("_augSkillsCast", 0) < 5,
        // Complete OR not applicable (same shape as daily.ts's PYEC task).
        completed: () =>
          get("_aug24Cast", false) ||
          !policy.castWaffleDay ||
          !have($skill`Aug. 24th: Waffle Day!`) ||
          get("_augSkillsCast", 0) >= 5,
        do: () => void useSkill($skill`Aug. 24th: Waffle Day!`),
        freeaction: true,
        limit: { tries: 1 },
      },
```

- [ ] **Step 3: Corral re-roll**

In `corral.ts` add `const waffle = $item\`waffle\`;`and (import`itemAmount` from kolmafia):

```ts
/**
 * The waffle re-rolls the monster in front of us (ash CCS:829-843): in the
 * taming regime every rustler/cowboy/cow is a waffle away from being the wild
 * seahorse. The re-rolled fight keeps running through THIS macro, and the
 * seahorse's own monster macro (compiled ahead of general macros) will not
 * re-run, so the tamer is inlined right behind the throw. One throw per
 * fight (three waffles a day), like the ash's `it11311` guard.
 */
function waffleMacro(): Macro {
  if (itemAmount(waffle) === 0) return new Macro();
  return Macro.ifNot(seahorse, Macro.tryItem(waffle)).if_(seahorse, tamingMacro());
}
```

and in the "Tame Seahorse" task change the combat to:

```ts
        combat: new CombatStrategy()
          .macro(tamingMacro, seahorse)
          .macro(waffleMacro)
          .banish($monsters`Mer-kin rustler, sea cowboy, sea cow`)
          .kill(),
```

Also extend the task's doc comment: `Waffle first (general macro), banish second (action): after a re-roll the compiled monster actions re-evaluate against the new monster, so a cow that came out of the waffle is still banished.`

- [ ] **Step 4: Verify**

Run: `yarn check && yarn lint` — exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/resources/policy.ts src/tasks/init.ts src/tasks/monkees/corral.ts
git commit -m "feat: Waffle Day at init and the corral waffle re-roll for the seahorse (G4)"
```

---

### Task 9: G2 — the Shadow Rift lane (Rufus quests, Shadow Waters, free lasso training, shadow bricks)

**Files:**

- Create: `src/tasks/monkees/shadow.ts`
- Modify: `src/standalone/choice.ts` (choices 1497, 1498, 1500)
- Modify: `src/tasks/runplans.ts` (insert the quest before `corralQuest`, mid/low only)
- Modify: `src/tasks/init.ts` (delete the FLUDA comment paragraph in the `seaGearPulls` doc that says the subsystem was dropped; do NOT add the FLUDA pull)
- Modify: `src/sim.ts` (remove the "No FLUDA … dropped" comment sentence; add `Shadow Rift` note to `routeSkills`? no — leave skills)

**Interfaces:**

- Produces: `shadowRiftQuest(): Quest` with tasks "Rufus Quest", "Rufus Labyrinth", "Rufus Turn-in", "Loded Stone", "Rift Fights".
- Consumes: `forceNextNoncombat` (resources/ncforce.ts), `pawWish` (resources/paw.ts), `fishMacro`, `killMacro`, `openerOnce` (engine/combat.ts), `recover` (lib), `itemDropEffects` (lib/moods).

Why (spec G2): the ash trains the lasso on free Shadow Affinity fights (7 throws → 20, B:109690-110093, zero turns) and drains the affinity for 11 shadow bricks (11 free kills), a candy-block map and Fishy on every rift fight; two Rufus artifact quests bracket it (Shadow Waters first, forest loot second). Ash: `shadowRift()` UTS:847-898, rift prep UTS:2371-2384, training UTS:2432-2439, drain UTS:2536-2547, CCS:532-554, choice 1500 (Choice:257-265). mafia auto-navigates choice 1499 for an artifact quest (`RufusManager.shadowLabyrinthChoiceDecision`), so no handler is needed for it.

Mechanics that shape the tasks (verified in `../kolmafia/src`): `encountersUntilSRChoice` (default 11) counts rift FIGHTS down to the Labyrinth NC and resets on it; `Rufus's shadow lodestone` (from the turn-in) makes the next rift adventure the "Like a Loded Stone" NC (choice 1500: 2 = Shadow Waters, 3 = forest loot once/day); `_shadowAffinityToday` + the `Shadow Affinity` effect (11 turns, only rift fights consume it) are the free fights; `Sea *dent: Summon a Wave` is a non-combat self skill (`_seadentWaveUsed`) that the ash casts right after a rift adventure and the CCS gates the lasso throw on it.

The whole quest is gated on the sea cowboy hat + sea chaps existing (the +3/throw training gear) and sits before `corralQuest` in list order, so it preempts "Corral Lassos" the moment the crafts land and runs as one contiguous block — the effects above only tick on paid turns, and nothing in this block is paid.

- [ ] **Step 1: Create `src/tasks/monkees/shadow.ts`**

```ts
import { adv1, availableAmount, haveEffect, itemAmount, use, useSkill } from "kolmafia";
import { $effect, $item, $items, $location, $monster, $skill, get, have, Macro } from "libram";

import { CombatStrategy, fishMacro, openerOnce } from "../../engine/combat";
import { Quest } from "../../engine/task";
import { recover } from "../../lib";
import { itemDropEffects } from "../../lib/moods";
import { forceNextNoncombat } from "../../resources/ncforce";
import { pawWish } from "../../resources/paw";

const rift = $location`Shadow Rift (The Misspelled Cemetary)`;
const phone = $item`closed-circuit pay phone`;
const lodestone = $item`Rufus's shadow lodestone`;
const lasso = $item`sea lasso`;
const affinity = $effect`Shadow Affinity`;
const waters = $effect`Shadow Waters`;
const monodent = $item`Monodent of the Sea`;

/** Free rift fights remain today: the affinity is up, or not yet claimed
 * (ash shadowRift() gate UTS:849-850). */
function riftFightsFree(): boolean {
  return haveEffect(affinity) > 0 || !get("_shadowAffinityToday", false);
}

function training(): number {
  return get("lassoTrainingCount", 0);
}

/** The +3/throw training gear (ash pins both while training < 20, UTS:876). */
function trainingGearReady(): boolean {
  return have($item`sea cowboy hat`) && have($item`sea chaps`);
}

/** Rift fight (ash CCS:532-554, mid tier): lasso on round 1 once the wave is
 * up, Talk to Some Fish while scales are short, then the kill ladder (darts
 * included). Septapus charms, bat-wing swoops, Mild Evil and FLUDA dousing
 * are deliberately not ported (no censer/cloake support; bat wings are
 * banked, plan Task 4; the FLUDA pull slot went to the bang potions). */
function riftCombat(): CombatStrategy {
  const strategy = new CombatStrategy();
  strategy.startingMacro(() =>
    get("_seadentWaveUsed", false) && training() < 20 && itemAmount(lasso) > 0
      ? openerOnce(Macro.tryItem(lasso), 1)
      : new Macro(),
  );
  strategy.macro(fishMacro);
  return strategy.kill();
}

function riftOutfit() {
  return {
    modifier: "item",
    equip: [monodent, ...(training() < 20 ? $items`sea cowboy hat, sea chaps` : [])],
  };
}

export function shadowRiftQuest(): Quest {
  return {
    name: "Shadow Rift",
    tasks: [
      {
        // Ash UTS:851-853, 862-869: an artifact quest from Rufus (choice
        // 1497 -> 2, standalone/choice.ts). Twice a day: before Shadow
        // Waters (its lodestone unlocks the waters) and again once the waters
        // are up but the affinity is unclaimed (its lodestone is the forest
        // loot). Never a third: with the affinity spent and the waters up the
        // second disjunct is false.
        name: "Rufus Quest",
        ready: () =>
          have(phone) &&
          trainingGearReady() &&
          get("questRufus") === "unstarted" &&
          !have(lodestone) &&
          get("encountersUntilSRChoice", 11) > 9 &&
          (!have(waters) || riftFightsFree()),
        completed: () => get("questRufus") !== "unstarted" || have(lodestone),
        do: () => void use(phone),
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // Ash UTS:853-855: force the Labyrinth NC (mafia picks the artifact's
        // theme, RufusManager.shadowLabyrinthChoiceDecision). The second
        // quest's Labyrinth arrives naturally at encountersUntilSRChoice 0,
        // so the forcer is only armed while fights are still owed. A fight
        // that lands instead is a normal rift fight (same combat/outfit).
        name: "Rufus Labyrinth",
        ready: () =>
          have(phone) && get("questRufus") === "started" && get("rufusQuestType") === "artifact",
        completed: () => get("questRufus") !== "started",
        prepare: (): void => {
          recover();
          if (get("encountersUntilSRChoice", 11) > 0) forceNextNoncombat();
        },
        do: rift,
        combat: riftCombat(),
        outfit: riftOutfit,
        effects: itemDropEffects,
        limit: { soft: 12, message: "The Labyrinth of Shadows is not producing the artifact." },
      },
      {
        // Ash UTS:856, 2545: hand the artifact in (choice 1498 -> 1) for the
        // lodestone.
        name: "Rufus Turn-in",
        ready: () => have(phone) && get("questRufus") === "step1",
        completed: () => get("questRufus") !== "step1",
        do: () => void use(phone),
        freeaction: true,
        limit: { tries: 2 },
      },
      {
        // The lodestone makes the next rift adventure "Like a Loded Stone"
        // (choice 1500: Shadow Waters first, forest loot second — the
        // choice script decides). Ash UTS:857, 2546. Cast the wave here, right
        // after a rift adventure, the way the ash does (UTS:853-855): the
        // lasso throw in the rift is gated on it (CCS:534).
        name: "Loded Stone",
        ready: () => have(lodestone),
        completed: () => !have(lodestone),
        do: (): void => {
          adv1(rift, -1, "");
          if (!get("_seadentWaveUsed", false) && have($skill`Sea *dent: Summon a Wave`)) {
            useSkill($skill`Sea *dent: Summon a Wave`);
          }
        },
        combat: riftCombat(),
        outfit: riftOutfit,
        limit: { tries: 2 },
      },
      {
        // Ash UTS:858-897 + 2432-2439 + 2536-2547: spend the day's free rift
        // fights — seven lasso throws train to 20, the rest are shadow bricks
        // (13 free kills' worth over the day) and Fishy. Runs only under
        // Shadow Waters like the ash. A lasso is wished for when the stock is
        // dry mid-training (UTS:864-868).
        name: "Rift Fights",
        ready: () => have(phone) && trainingGearReady() && have(waters) && riftFightsFree(),
        completed: () => !riftFightsFree(),
        prepare: (): void => {
          recover();
          if (training() < 20 && itemAmount(lasso) === 0) pawWish(lasso);
        },
        do: rift,
        combat: riftCombat(),
        outfit: riftOutfit,
        effects: itemDropEffects,
        limit: { soft: 14, message: "Shadow Affinity is not draining; check the rift fights." },
      },
    ],
  };
}
```

Notes for the implementer: `CombatStrategy.startingMacro` and `.macro` accept a delayed `() => Macro` (grimoire `Delayed<Macro>`; `corral.ts` passes functions to `.macro`). If `startingMacro` rejects a function in this grimoire version, build the lasso opener inside `riftCombat()` as a general `.macro(() => …)` placed before `fishMacro` — round 1 is still the first action on these fights. `availableAmount` is imported for the possible `have(lodestone)` → `availableAmount(lodestone) > 0` swap if `have()` is false for a quest item (it is not; keep `have`).

- [ ] **Step 2: Choice handlers**

In `src/standalone/choice.ts`, inside the "Sea stuff" chain (e.g. right after the `choice === 1565` branch), add:

```ts
  } else if (choice === 1497) {
    // Calling Rufus: option 2 = the artifact quest (ash CH:37-41 simple list).
    runChoice(2);
  } else if (choice === 1498) {
    // Calling Rufus Back: hand the artifact in, else hang up (mafia's own
    // RufusManager decision, mirrored so the script always answers).
    runChoice(get("questRufus") === "step1" ? 1 : 6);
  } else if (choice === 1500) {
    // Like a Loded Stone (ash CH:257-265): the fountain's Shadow Waters
    // first; the forest loot once the waters are up and it is unlooted.
    if (!have($effect`Shadow Waters`)) runChoice(2);
    else if (!get("_shadowForestLooted", false)) runChoice(3);
    else runChoice(2);
```

(import `$effect` from libram). Choice 1499 is intentionally unhandled: the script leaves it up and mafia's artifact-quest automation answers it (ChoiceManager.java:777 → RufusManager.specialChoiceDecision).

- [ ] **Step 3: Runplan**

In `runplans.ts` import `shadowRiftQuest` from `./monkees/shadow` and insert `...(high ? [] : [shadowRiftQuest()]),` immediately before `corralQuest({ opener: !high, swordLane: high }),`. Extend the header comment: `Shadow Rift sits before the corral so it preempts Corral Lassos the moment the hat and chaps exist (ash trains the lasso in the rift, UTS:2432-2439; high skips it, !highShiny()).`

- [ ] **Step 4: Stale comments**

In `init.ts` delete the four-line "The FLUDA is deliberately absent … dead pull slot." comment above `seaGearPulls` and replace with `// The FLUDA is not pulled: its only site is the rift's Douse Foe rider, which the shadow-rift port (tasks/monkees/shadow.ts) does not carry.` In `sim.ts` change the "No FLUDA: it only serves the shadow-rift subsystem SubAqua dropped" sentence to "No FLUDA: the shadow-rift lane (tasks/monkees/shadow.ts) does not port the Douse Foe rider."

- [ ] **Step 5: Verify**

Run: `yarn check && yarn lint` — exit 0. Then `node -e` is not available for mafia types; instead run `yarn build` and confirm `dist/KoLmafia/scripts/subaqua/subaqua.js` contains `Shadow Rift (The Misspelled Cemetary)` (`grep -c "Misspelled Cemetary" dist/KoLmafia/scripts/subaqua/subaqua.js` ≥ 1) and `subaqua_choice.js` contains `1500`.

- [ ] **Step 6: Commit**

```bash
git add src/tasks/monkees/shadow.ts src/standalone/choice.ts src/tasks/runplans.ts src/tasks/init.ts src/sim.ts
git commit -m "feat: shadow-rift lane — two Rufus artifact quests, Shadow Waters, free lasso training and shadow bricks (G2, reverses the Phase 4 drop)"
```

---

### Task 10: Build, deploy, and record

**Files:**

- Modify: `docs/superpowers/research/2026-08-28-uts-parity-gap.md` (append a "Status" section)

- [ ] **Step 1: Full verification**

Run: `yarn check && yarn lint && yarn build`
Expected: all exit 0.

- [ ] **Step 2: Deploy to mafia**

Run: `yarn mafia` (copies `dist/KoLmafia/scripts/subaqua/*.js` into `~/Library/Application Support/KoLmafia/scripts/`). Confirm with `ls -la "$HOME/Library/Application Support/KoLmafia/scripts/subaqua.js"` (timestamp now).

- [ ] **Step 3: Record status**

Append to the parity report:

```markdown
## Status 2026-08-28 (evening)

G1–G10 ported on `worktree-phase4-sorceress` (plan
`docs/superpowers/plans/2026-08-28-uts-parity-ports.md`), built and deployed with `yarn mafia`.
None live-verified. First checkpoints on the next run: turn ~2 fight throws bang potions and
`lastBangPotion819..827` fill; on taming, the seed scan prints ≤ 2 candidates and
`dreadScroll1..8` are written before the school; the Shadow Rift quest runs after Craft Hat with
`lassoTrainingCount` reaching 20 on free fights and shadow bricks in inventory; Tame Seahorse's
first corral visit throws a waffle; no bat wings before the colosseum; the outpost's last habitat
golem gets the eagle screech; no free-kill line on a Black Crayon Golem.
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/research/2026-08-28-uts-parity-gap.md
git commit -m "docs: parity-gap report status after the G1-G10 ports"
```

---

## Self-review

- Spec coverage: G1 → Task 1; G2 → Task 9; G3 → Task 7; G4 → Task 8; G5 → Task 4; G6 → Task 2; G7 → Task 3; G8 → Task 6; G9 → Task 5; G10 → Task 2. Reliability items in the report are out of scope (separate ticket).
- Placeholder scan: none of the banned phrases; every code step is concrete.
- Type consistency: `fishMacro()` (Task 7) is consumed by Task 9's `riftCombat()`; `bangPotionNever`/`bangPotionMacro`/`unidentifiedBangPotions`/`bangPotionCriteriaKey` names match between Task 1's module and its engine/dreadscroll edits; `freeRunBanishes` and `batWings` are the exact `Task` field names used in Tasks 3/4; `screechTurn`/`golemRecallMacro` in Task 6 keep the existing `farmCombat()` call site (`monsterMacro(golemRecallMacro, golem)`) unchanged.
- Task ordering: Task 7 must precede Task 9 (import); Tasks 1-6 and 8 are independent of each other.
