# subaqua (phase4-sorceress worktree, HEAD edfb5ea) — mid-tier run plan, step by step

Source root for every cite below: `/Users/xn/sites/KOL/SubAqua/.claude/worktrees/phase4-sorceress/src/` (abbreviated `src/`). grimoire internals cited from `node_modules/grimoire-kolmafia/dist/`.

## 0. Entry, engine loop, and how ORDER works

- `main.ts:14-82`: `subaqua [run]` → `sinceKolmafiaRevision(29108)` → abort unless `myPath() === 11,037 Leagues Under the Sea` (`main.ts:36-41`) → abort unless `autoSatisfyWithNPCs` (`main.ts:42-44`) → `currentTier()` → `buildRunplan(tier)` → `new SubAquaEngine(tasks).run(args.actions)`; `finally engine.destruct()` (resets every managed property, `setAutoAttack(0)`). After the loop: prints turns spent + remaining count; runs `postloopCommand` only if `routeComplete()` (Seaceress dead AND sand pennies ≤ 10, `finale.ts:36-38`).
- `runplans.ts:55-101` calls grimoire `getTasks([...quests])` **without `implicitAfter`** and **no task in the repo declares `after`** (grep `after:` over `src/` returns nothing). So there are NO dependency edges at all: the plan is purely _list order × `ready()` × `completed()`_. A quest-level `completed` (only School and Library have one: `isMerkinHighPriest`) is OR-ed into every child task's `completed` (`route.js:31-35`). There is therefore no `after`-deadlock possible; every "blocking" is a `ready()` gate, called out per task below.
- Engine loop (`grimoire engine.js:35-49, 66-82, 88-118`): each iteration picks the FIRST task in list order with `ready()` true and `completed()` false, then runs: `acquireItems` → `acquireEffects` (subaqua override) → `createOutfit` → `customize` (subaqua: backup camera, peridot, lasso opener, resource provides, breathing) → `dress` → `setCombat` (writes `grimoire_macro` CCS) → `setChoices` → resource `prepare`s → `prepare` (subaqua: loss snapshot, fishy/waterproofly) → `do` (+ repeat on wandering NCs) → `post` (subaqua: beaten-up/loss check, poison, bad-effect shrug, autosell, whistle, emergency diet, dreadscroll seed) → `markAttempt` → `checkLimits` (`tries`/`soft` compare attempt COUNT per script run against the limit and THROW with the task message; `turns` compares `location.turnsSpent`). When no task is available `run()` returns silently.
- Tier detection `lib/tier.ts:15-20`: low if none of {2002 Mr. Store Catalog, cursed monkey's paw, august scepter} owned; else high if `garbo_valueOfFreeFight > valueOfAdventure`; else **mid**. `args.tier=low|mid|high` overrides (`tier.ts:26-33`); the result is written to `_subaqua_tier`. NOTE (memory): this account's `garbo_valueOfFreeFight=12000` detects HIGH; the mid plan documented here is what runs with `tier=mid`.
- Mid tier composition (`runplans.ts:57-69`): `high=false` → `guildTasks({phonelessSwordOnly:true, unlockGuild:true})`, `grandpaQuest({golem:true})`, `helmetQuest({summonLane:true})`, `momQuest({cyber:true})`, `corralQuest({opener:true, swordLane:false})`. Sorceress quests are tier-agnostic (policy only).
- Mid `ResourcePolicy` (`resources/policy.ts:74-87`): `freeKillMode:"full"`, `allowClubEmBackInTime:true`, `allowDiscretionaryPulls:true`, `leprecondoLayout:[22,24,12,11,10,4,5,6]`, `aprilingSecond:"piccolo"`, `catalogCredits:"skateboard+vhs2"`, `whistleOutpostDrops:false`, `fishyPullMeal:false`, `conserveFreeFights:false`, `usePyec:true`, `shubInsurancePulls:false`, `useBackupCamera:true`.
- `choiceAdventureScript` is forced to `subaqua_choice.js` (`engine.ts:1046`), built from `src/standalone/choice.ts` (`rollup.config.ts:48-51`); it runs as a separate Rhino process and shares state only through prefs (`_subaqua_peridot_target`, `_subaqua_stashbox_checked`).

---

## 1. Tier and resource ladders

### 1.1 Free-kill ladder (`resources/freekill.ts:85-196`, selector `:210-238`)

Order and `available()`:

1. **Darts: Bullseye** — `have(Everfull Dart Holster) && !have(Everything Looks Red)`; equip holster; `Darts: Aim for the Bullseye`; not colosseumSafe; dropSafe; not onceDaily (`:86-98`).
2. **Spit jurassic acid** — `have(Torso Awareness) && have(Jurassic Parka) && !have(Everything Looks Yellow)`; equip parka mode dilophosaur; dropSafe; `onceDaily:true` (`:99-113`).
3. **Assert your Authority** — `_assertYourAuthorityCast < 3 && all 3 Sheriff pieces owned`; equip the three; ONLY in `An Octopus's Garden, Mer-kin Gymnasium, The Caliginous Abyss` and only when a location is passed (`:114-123`, `:228-233`).
4. **Chest X-Ray** — `_chestXRayUsed < 3 && have(Lil' Doctor bag)`; equip bag (`:124-132`).
5. **BCZ: Sweat Bullets** — `have(blood cubic zirconia) && submoxie − 22500 > bczCost(_bczSweatBulletsCasts)`; equip BCZ (`:133-141`, cost table `:49-57`).
6. **Shattering Punch** — `have skill && _shatteringPunchUsed < 3` (`:142-150`).
7. **Gingerbread Mob Hit** — `have skill && !_gingerbreadMobHitUsed` (`:151-158`).
8. **shadow brick** — `itemAmount > 0 && _shadowBricksUsed < 13` (`:162-169`).
9. **groveling gravel** — `itemAmount > 0`; **dropSafe:false** (`:170-177`).
10. **Club 'Em Back in Time** — `policy.allowClubEmBackInTime (mid: true) && have(legendary seal-clubbing club) && _clubEmTimeUsed < 5`; `colosseumSafe:true, colosseumOnly:true, dropSafe:false` (`:178-195`).

Selector rules (`:210-238`): returns `undefined` if the target is the pending curveball monster; mid = "full" mode (high = only rungs 1-2); at the Colosseum only colosseumSafe (rung 10); outside it never rung 10; rung 3 zone-gated; `dropsMatter` drops rungs 9-10; `onceDaily:false` drops rung 2.

Who invokes it:

- **`killFree` action** (`engine.ts:327-343`, provide = `source.do` + `.abort()`): only **Openers/Sword Imprint** (`guild.ts:94`). Location undefined → rung 3 excluded. On mid this task is `ready` only when the pay phone is NOT owned (`guild.ts:68`), so on a pay-phone account it never runs.
- **Opportunistic upgrade** (`engine.ts:519-577`): for any task whose default action is `kill`, or per monster on `.kill(monster)` lists, when `freeKillTargetDropsMatter(location, monster)` (`:302-311`) is defined. Zone table `:249-263` (drop flag): Madness Bakery f, Octopus's Garden t, Wreck t, Trench t, Dive Bar t, Anemone Mine t, Outpost f, Corral t, Abyss f, School t, Library t, Gymnasium f, Colosseum f. Monster table `:271-281`: unholy diver, sea cowboy, Mer-kin healer, Neptune flytrap, giant squid, Mer-kin miner, Mer-kin tippler (all t). `freeKillNever = [wild seahorse]` (`:291`). The step is APPENDED as a general/monster macro guarded by `if !(monsterid …)` for every monster the task handles by a non-kill action, so it fires after the task's own macros but before any action. Reached from: Wreck Rescue (forced), Find Grandpa (per-monster squid/miner/tippler), Outpost Grandma / Outpost Lockkey (zone f → gravel allowed), Banish Constructs (Bakery f), Abyss Habitats / Abyss Mom / Abyss Finish (Abyss f → rung 3 possible), Corral Opener (general, reserved rustler+seahorse), Corral Leather (cowboy only), Corral Lassos (cowboy + cow), Tame Seahorse (reserved everything, effectively dead), Digpick (Anemone Mine t), School Unlocks / Farm School / Cowl and Rope (School t), Library Force / Library Farm (Library t). NOT reached from Garden Pellet (default action is `banish`, no `kill` list), Sand Dollars / Golem Recall / Sword Imprint / wanderers (function `do` and no monster key), Guild Test (surface zones), Cyber Mom.
- **Free-run fallthrough** (`freerun.ts:332`): `selectFreeKill({location, target, onceDaily:false})` when no run source lands — rung 2 excluded, gravel allowed.
- **Gladiator filter** (`fights.ts:290-299`): Club 'Em Back in Time once per colosseum fight when the page offers it and policy allows (mid yes).
- **Never reachable**: `yellowRay` action (no task calls `.yellowRay(`), `killHard` (no task; `killMacro(true)` therefore never built), `ignore*`/`killBanish`/`killItem` actions (never declared).

### 1.2 Yellow ray / saber Force (`engine.ts:457-494`, `resources/saber.ts`)

`forceItems` tasks: Garden Pellet (flytrap, purpose free), Diver Summon + Wreck Rivets (diver), Prayerbeads (healer), Corral Leather (seaCow), Library Force (researcher). Resolution: purpose diver/healer → saber first then parka ray; otherwise ray (`selectYellowRay()` = rung 2 above, `freekill.ts:314-317`) first then saber. Saber provide requires `forceGranted(purpose, location)` (`saber.ts:148-180`; the Outpost bans every purpose but healer, `:20-22, :153`), the saber equipping, and sets choice 1387→3 (also globally, `engine.ts:1004`). Reservation chain (`saber.ts:109-140`): 5 charges − diver×2 (while `diverHuntActive`) − healer×1 (beads<3) − seaCow×1 (`seaCowNeeded`) − researcher×1 (scroll clue 2/5 unknown & scroll not held, pre-High-Priest). Fallback when neither lands: `MyActionDefaults.forceItems → killItem → kill` (`combat.ts:101-109`).

### 1.3 Free-run ladder (`resources/freerun.ts:67-217`, selector `:281-335`)

Order / `available()` / banishes flag:

1. Spring Kick — spring shoes && !Everything Looks Green; **banishes** (`:68-75`).
2. Spring Away — same gate; run (`:76-83`).
3. GAP runaway — GAP && `_navelRunaways < 3`; underwater ONLY with Driving Waterproofly (`:297-305`) (`:84-95`).
4. navel ring runaway — same counter and Waterproofly rule (`:96-105`).
5. Bowl a Curveball — cosmic bowling ball in inventory; **banishes** (`:106-112`).
6. Creepy Grin — V for Vivala mask && !\_vmaskBanisherUsed; run (`:113-123`).
7. Throw Latte on Opponent — mug && !\_latteBanishUsed; **banishes** (`:124-131`).
8. Release the Boots — `floor(weight/5) − _banderRunaways > 0`, plus underwater needs a familiar breather or breathing effect (`bootsRunAvailable`, `:48-61`); takes the familiar slot (`:132-147`).
9. Feel Hatred — skill && `_feelHatredUsed < 3`; **banishes** (`:148-154`).
10. Snokebomb — skill && `_snokebombUsed < 3`; **banishes**; zone-excluded at the three guild test zones; skipped if its current banish still applies in the zone (`:155-161`, `:317-323`).
11. glob of Blank-Out (`:166-172`), 12. peppermint parasol (`parasolUsed < 3`, `:173-180`), 13. anchor bomb **banishes** (`:181-187`), 14. stuffed yam stinkbomb **banishes** (`:188-194`), 15. handful of split pea soup **banishes** (`:195-201`), 16. Mer-kin pinkslip (phylum guard only when a target is passed — the engine passes none, `:324-326`) (`:202-209`), 17. ink bladder (`:210-216`).
    Then the free-kill fallthrough (`:329-334`).

Who invokes it:

- **`freeRun` action** via `engine.ts:344-456`, always `selectFreeRun({location, exclude})` with `banish=false` → every "banishes:true" rung (1,5,7,9,10,13,14,15) is SKIPPED for task free-runs. Familiar rule (`:378-449`): in a +combat context (no `-combat` modifier, familiar unset or the sneak pick, no sneak effects) the boots take the slot first; in a −combat context the walk first excludes familiar-slot sources and drops the free-kill fallthrough, and only if nothing lands do the boots get the slot and the walk repeats unrestricted. Tasks: Guild Test (surface: `MyActionDefaults.freeRun` = plain kill when nothing provided), Wreck Rescue (sneak), Find Grandpa, Wreck Rivets (hatch closed), Outpost Stashbox, Prayerbeads. Fallback when no source lands underwater: `runMacro()` (taffy) + kill ladder (`combat.ts:64-73`).
- **Gym** (`fights.ts:133-158`, `gym.ts:80`): `selectFreeRun({banish:true, location: Gymnasium, target})` — the ONLY place banishing runs (Spring Kick, curveball, latte, Feel Hatred, Snokebomb, thrown banishes) are spent as runs; familiar-slot sources skipped; gear must already be worn (gymnasiumTurn wears the first non-familiar pick's gear).

### 1.4 Banish ladder (`resources/banish.ts:28-146`, picker `:193-205`)

Order / `available()`:

1. Bowl Curveball — `have(cosmic bowling ball) || cosmicBowlingBallReturnCombats === 0`.
2. Asdon Martin Spring-Loaded Front Bumper — installed && fuel ≥ 50 && (no bumper record or > 30 turns old).
3. Spring Kick — spring shoes && !ELG.
4. System Sweep — skill.
5. Feel Hatred — `_feelHatredUsed < 3 && have(Emotionally Chipped)`.
6. Latte — mug && (`!_latteBanishUsed` || refills < 2 && turncount < 1000).
7. Reflex Hammer — `_reflexHammerUsed < 3` && Lil' Doctor bag.
8. Snokebomb — `_snokebombUsed < 3`.
9. KGB dart — `_kgbTranquilizerDartUses < 3` && briefcase.
10. Yam Stinkbomb — item.
11. Middle Finger — ring && !used.
12. Banishing Shout — skill.
13. Batter Up — skill && Seal Clubber && fury ≥ 5.
14. Monkey Paw (Monkey Slap) — paw && `_monkeyPawWishesUsed === 0`.
15. Sea \*dent lightning bolt — Monodent && `_seadentLightningUsed < 11` (NOT turn-free; last on purpose).
    `pickBanishSource(location, exclude)` skips a source whose current banish target still appears in the zone. Invoked by the `banish` action (`engine.ts:312-326`, provide = trySkill/tryItem + kill ladder) from: Garden Pellet (default), Wreck Rivets (default), Corral Opener/Leather/Lassos (rustler), Tame Seahorse (rustler+cowboy+cow), Outpost Grandma/Lockkey (burglar+raider). `assertBanishHeld` (`:249-272`) is called in the prepare of Corral Leather/Lassos/Tame Seahorse and Outpost Grandma/Lockkey. Mom's school-of-many bolt (`mom.ts:54-60`) is a task macro, not this ladder. No banish source is used for Wreck Rescue, Grandpa, School, Library, gym (gym uses the free-run ladder with `banish:true`).

### 1.5 NC-force ladders (`resources/ncforce.ts`)

Out-of-combat (`:79-157`), cheapest first: Apriling tuba (`_aprilBandTubaUses < 3`) → Cincho Fiesta Exit (≥ 60 cinch incl. free rests) → Pillkeeper Sneakisol (`!_freePillKeeperUsed`, pill keeper anywhere) → pull-backed radio / Clara's bell / stench jelly (only when NO reusable forcer gear — duffel/parka/Allied Radio Backpack — is owned and pulls remain). `forceNextNoncombat()` (`:179-186`) returns true if one was already pending. Invoked from: **Big Brother/Wreck Rescue (forced)** prepare (`bigbrother.ts:29`), **skateParkTurn** (`skatepark.ts:83`). `ncForceEstimate()` (`:166-175`) gates Wreck Rescue (forced) `ready` (≥ 4).
In-combat (`:38-58`, Spikolodon Spikes / McHugeLarge Avalanche): the exported `combatNCForceSources` array is **imported by nothing** — dead code. The gym filter instead hard-codes the two casts by page text while the skate war is open (`fights.ts:227-234`, gear pinned by `gym.ts:64-71`). No other task banks an in-combat forcer.

### 1.6 Copies (`resources/backup.ts`, `summon.ts`, VHS, habitats)

- Backup camera (`backup.ts:43-55`, engine `engine.ts:250-254`): policy on (mid), `_backUpUses < cap` (11, or 7 at the outpost), `lastCopyableMonster` in the task's target list → camera equipped + round-1 `Back-Up to your Last Enemy` unless already fighting the target; peridot is skipped that turn. Sites: Corral Opener (eye in the darkness / slithering thing while momProgress < 40), Outpost Grandma & Lockkey (Black Crayon Golem once habitat fights are 0 and recalled ≥ 2; Mer-kin healer while beads < 2; cap 7), School Unlocks, Farm School, Library Force/Farm (`freeMonsters` list `backup.ts:28`).
- Summons (`summon.ts:75-110`): locket reminisce → fax (3 tries) → Chest Mimic egg (≥100 exp, `_mimicEggsObtained < 11`) → pocket wish/genie (AT farms the Overgrown Lot) → abort. Sites: Sword Imprint (sea cowboy), Golem Recall (Black Crayon Golem), Diver Summon (unholy diver). `summonsAvailable()` (`:37-45`) gates Sword Imprint (≥3) and Diver Summon (≥1).
- Spooky VHS Tape: bought with 2002 credits (Init/2002 Credits); thrown in the Abyss on eye/slithering/school while `!spookyVHSTapeMonster && momProgress < 36` (`mom.ts:133-137`; no lower bound is coded); redeemed by Wanderers/Redeem VHS.
- Club 'Em Into Next Week: Golem Recall opener (`grandpa.ts:85-86`); redeemed by Wanderers/Redeem Club 'Em.
- Recall Facts: Monster Habitats: Golem Recall (`grandpa.ts:85`), outpost golem re-recall when fights 0 and recalled < 2 (`outpost.ts:38-44`), Abyss Habitats (`mom.ts:246`).
- Peridot of Peril (`engine.ts:256-268, 847-858`, `peridot.ts`): one imperil per zone per day, equipped only if the zone currently offers the target. Targets: flytrap (Garden Pellet), unholy diver (Wreck Rivets), sea cow (Corral Leather), sea cowboy (Corral Lassos), eye in the darkness (Abyss Mom, Abyss Finish), Mer-kin monitor (Farm School).
- Duplicate (Source Terminal): Farm School monitor opener (`school.ts:177`); educated by Sorceress Dailies/Terminal Educate.

### 1.7 Fishy ladder (`resources/fishy.ts:336-390`), run from `engine.prepare` on every underwater, non-freeaction task

1. fishy pipe — `!_fishyPipeUsed`, owned or in storage (pulled via `pullSequence`).
2. `skate lutz` — `skateParkStatus === "ice" && !_skateBuff1`.
3. `cheapestFishySource()` (`:287-307`) — minimum `fishyOpportunityCost` over `FISHY_SOURCES` (`:85-251`: three nigiri via `make`, concentrated fish broth, cuppa Gill tea (tea tree), fish juice box, powdered candy sushi set, Aldebaran sardines, buñuelos, old chum, shoo-fish pie, Centauri fish wine, fishelada, Punchplanter family, Caipiranha family, Herring family, super-sweet fish goo (spoiled), fishy paste, sea jelly, fish sauce, fishy pipe); spleen rungs require room.
4. Pull-meal (cheapest pasta + Aldebaran sardines) — **policy off at mid** (`fishyPullMeal:false`).
5. fish sauce chew — spleen room; pulled if not owned.
6. `eatSushi()` off the rolling mat.
7. `abort("Could not acquire Fishy …")` (`:386-389`).
   `maintainWaterproofly()` (`:399-409`) runs first: Asdon installed && no Driving Waterproofly → pull/insert "pie man was not meant to eat" if fuel < 37 → soda-bread refuel (meat ≥ 15k, ascensions ≥ 10) → `asdonmartin drive Waterproofly` at ≥ 37 fuel.

### 1.8 Pulls (`resources/pulls.ts`)

`pullSequence` (`:31-45`): refuses at 0 pulls or already pulled today; mall-buys into storage if absent, aborting if price > `buyLimit()`. Reservations (`:67-164`): escape gear (parasol/navel ring/GAP), crayon shavings < 9, null-day exploit (Shub undefeated && `shubPrepShort(2)`), pinkslip, prayerbeads < 3, sea cowbell < 3, ink bladder, comb jelly, skate blade (war live), knucklebone (clue 4), worktea (clue 7, vocab < 90). `pullBudgetAllows` (`:175-182`): `>` reserved for discretionary, `>=` when the item is its own live reservation. `discretionaryPull` (`:188-192`) additionally needs `allowDiscretionaryPulls` (mid: yes). Monkey paw (`paw.ts`): `pawWish` used by Rivet Gap (rivets) and Prayerbeads.

---

## 2. The ordered run plan (mid tier, engine order)

82 tasks, in `getTasks` order (`runplans.ts:58-100`). Names are `Quest/Task` exactly as the log prints `Executing …`. Every task is re-eligible on every selection pass: an EARLIER task whose `ready()` flips true (wanderer windows, Rivet Gap, Grandma Note, Tame Seahorse, …) preempts whatever later task was running. "Runs when" = `ready()`; "Loop until" = `completed()` + `limit`. Engine-wide combat additions (round-1 lasso throw, backup camera, peridot, opportunistic free kill, kill ladder = dart chain/openers/Saucegeyser/attack;repeat, `combat.ts:133-229`) are described once in §3 and only noted per task where they differ. `freeaction: true` tasks skip the Fishy/Waterproofly upkeep and the lasso opener (`engine.ts:276, 689`) but still get an outfit dress and the whole `post()` sweep.

### Init quest (`tasks/init.ts:52-355`)

### S1. Init/Pearl Guard (init.ts:57-79)

- Runs when: always (no ready); completed once `_subaqua_pearls_checked`.
- Loop until: pref set; `tries: 1`.
- Location / activity: counts unblemished pearls in Eternity Codpiece gems + inventory.
- Outfit: none; Familiar: unchanged; Effects: none.
- Choices: none.
- Combat: none.
- Free resources: none.
- Expected turns: 0.
- Tier notes: none. ABORT if total < 5 AND `turnsPlayed() === 0` (`:68-74`); a mid-run start skips the check.

### S2. Init/Old Guy Quest (init.ts:80-86)

- Runs when: `questS01OldGuy === "unstarted"`.
- Loop until: pref changes; `tries: 1`.
- Activity: `visitUrl("place.php?whichplace=sea_oldman&action=oldman_oldman")`.
- Outfit/Familiar/Effects: none. Combat: none. Free resources: none. Turns: 0. Tier: none.

### S3. Init/Sea Jelly (init.ts:87-130)

- Runs when: `have(Space Jellyfish) && questS01OldGuy !== "unstarted"`; completed if no jellyfish, or `_seaJellyHarvested`, or `_subaqua_sea_jelly_visited`.
- Loop until: marker; `tries: 1`.
- Activity: `place.php?whichplace=thesea&action=thesea_left2`, `runChoice(1)` if pending; sets marker.
- Outfit: `{familiar: Space Jellyfish}` when owned. Choices: `1219: 1`. Combat: none. Turns: 0. Tier: none. (Stocks the `sea jelly` Fishy rung.)

### S4. Init/Toot (init.ts:131-167)

- Runs when: `questM05Toot === "started"` and not `_subaqua_toot_visited`.
- Activity: council.php → tutorial toot → council.php (each followed by `runChoice(1)` if a dialog is pending) → questlog; sets marker. `tries: 1`. 0 turns.

### S5. Init/Daily Items (init.ts:168-186)

- Runs when: letter from King Ralph XI / pork elf goodies sack owned, or sushi mat owned but `!hasSushiMat`, or 2002 Catalog owned but `!_2002MrStoreCreditsCollected`.
- Activity: `use` each. `tries: 1`. 0 turns.

### S6. Init/Photobooth (init.ts:187-206)

- Runs when: `_photoBoothEquipment < 3` and Sheriff kit incomplete.
- Activity: `photobooth item <piece>` for each missing Sheriff piece; ABORT if kit still incomplete with 3 pieces taken (`:197-202`). `tries: 2`. 0 turns.

### S7. Init/Saber Upgrade (init.ts:207-216)

- Runs when: saber owned and `_saberMod === 0`. Activity: `saber familiar` (+10 fam weight). `tries: 1`.

### S8. Init/Mayam (init.ts:217-233)

- Runs when: Mayam calendar owned and `_mayamSymbolsUsed === ""`. Activity: `mayam rings vessel yam cheese explosion` / `fur lightning eyepatch yam` / `eye meat yam clock`. Outfit: `{familiar: Chest Mimic}` if owned. `tries: 1`.

### S9. Init/Leprecondo (init.ts:234-249)

- Runs when: Leprecondo owned and `leprecondoInstalled === "0,0,0,0"`. Activity: install the first four DISCOVERED pieces from mid layout `[22,24,12,11,10,4,5,6]` (only if four are found). `tries: 1`.

### S10. Init/Apriling (init.ts:250-280)

- Runs when: helmet owned, `_aprilBandInstruments < 2`, and not (piccolo policy && no Chest Mimic && tuba owned). Activity: join tuba; mid = piccolo lane: join piccolo and play it 3× only when Chest Mimic is owned (else tuba only). Outfit: `{familiar: Chest Mimic}` when owned. `tries: 1`.

### S11. Init/Duffel and Shower (init.ts:281-296)

- Runs when: McHugeLarge duffel owned without left ski, or April Shower Thoughts shield owned and globs uncollected. Activity: the two inventory actions. `tries: 1`.

### S12. Init/2002 Credits (init.ts:297-310)

- Runs when: catalog owned and `availableMrStore2002Credits > 0`. Activity (mid `skateboard+vhs2`): buy pro skateboard if not owned, then Spooky VHS Tapes until credits are 0. `tries: 1`.

### S13. Init/Workshed (init.ts:311-324)

- Runs when: `!_workshedItemUsed && getWorkshed() === none`. Activity: use the first owned of Asdon keyfob (on ring) / portable Mayo Clinic / model train set / TakerSpace letter of Marque; with TakerSpace, `retrieveItem(anchor bomb)`. `tries: 1`.

### S14. Init/Sea Gear Pulls (init.ts:325-353)

- Runs when: `!_subaqua_gear_pulled`. Activity: `discretionaryPull` of Mer-kin sneakmask, sea lasso, shark jumper, scale-mail underwear (skipped with Kramco), Elf Guard SCUBA tank — each only if not owned; CMOI only if already in Hagnk's. Marker set. `tries: 1`.
- Tier notes: at low, `discretionaryPull` refuses everything (policy) — the task still completes via the marker.

### Wanderers (`tasks/monkees/mom.ts:332-349`) — highest priority after Init

### S15. Wanderers/Redeem VHS (mom.ts:333-346)

- Runs when: `spookyVHSTapeMonster` set AND `totalTurnsPlayed() >= spookyVHSTapeMonsterTurn + 8`; completed when the pref clears.
- Loop until: copy redeemed; `soft: 4`.
- Location: `grandpaZone()` (Anemone Mine / Marinara Trench / Dive Bar by mainstat, `lib/index.ts:146-148`); `underwater: true`.
- Outfit: `item, <pearlResModifier()>` (hot/sleaze/spooky res by mainstat, `mom.ts:120-129`); Familiar: unchanged; Effects: `itemDropEffects + resEffects`.
- Choices: none. Combat: `kill()` (kill ladder). Free resources: none (no zone/monster key). Turns: ~1 per window. Tier: none.

### S16. Wanderers/Redeem Club 'Em (mom.ts:347)

- Identical shape keyed on `clubEmNextWeekMonster` / `clubEmNextWeekMonsterTurn`.

### Openers quest (`tasks/monkees/guild.ts:55-165`)

### S17. Openers/Sword Imprint (guild.ts:64-99)

- Runs when: `have(Sword of S Words) && summonsAvailable() >= 3 && !have(closed-circuit pay phone)` (mid: `phonelessSwordOnly`) `&& selectFreeKill({dropsMatter:true}) !== undefined`; completed when `swordOfSWordsMonster` is set.
- Loop until: imprinted; `tries: 2`.
- Activity: `summon(sea cowboy)` (§1.6 ladder). Choices: `1589: "1&victim=776"`.
- Outfit: `item`, familiar Sword of S Words; Effects: none.
- Combat: cowboy macro `openerOnce(%fn, kill a lot of these guys)` then `killFree(sea cowboy)` (provided free-kill source + `abort`), default `kill()`.
- Free resources: one summon, one drop-safe free kill (darts/parka/X-Ray/BCZ/Punch/Mob Hit/brick in ladder order).
- Turns: 0-1. Tier notes: high runs it regardless of the pay phone. On a pay-phone account this task NEVER fires at mid.

### S18. Openers/Guild Start (guild.ts:100-111)

- Runs when: `have(pay phone)`; completed when the mainstat guild quest pref is started.
- Activity: `guild.php?place=challenge`; Outfit: `{pants: tearaway pants}` for Moxie classes. `tries: 1`. 0 turns.

### S19. Openers/Guild Test (guild.ts:112-140)

- Runs when: guild quest pref === started (`questStepOf === 0`); completed when it moves.
- Loop until: test done; `soft: 12` ("The guild test grind is unlucky…").
- Location: Outskirts of Cobb's Knob / Haunted Pantry / Sleazy Back Alley by mainstat (surface, not underwater).
- Outfit: `-combat`, familiar Artistic Goth Kid if owned else `sneakFamiliar()` (Peace Turkey → Disgeist); Effects: `sneakEffects`.
- Combat: `kill(crayonMonsters)` (22 Black Crayon names), default `freeRun()`. Surface, so GAP/navel need no Waterproofly; the boots rule is −combat context (Goth Kid named → familiar untouched). Surface fallback = plain kill.
- Free resources: run ladder (non-banish rungs), then free-kill fallthrough.
- Prepare: `recover()`, pull GAP if in storage and budget allows.
- Turns: until the NC; no coded bound beyond soft 12. Tier: high skips the whole guild (`unlockGuild:false`).

### S20. Openers/Guild Finish (guild.ts:141-162)

- Runs when: guild quest step > 0; completed when `finished && questG03Ego !== "unstarted"`. Activity: challenge visit if not finished; two `guild.php?place=ocg` visits. `tries: 2`. 0 turns.

### Pellet quest (`tasks/monkees/pellet.ts:12-54`)

### S21. Pellet/Garden Pellet (pellet.ts:16-35)

- Runs when: `monkeesStep() < 0 && !have(wriggling flytrap pellet)`.
- Loop until: pellet or quest started; `soft: 15` ("The flytrap would not die with its pellet…").
- Location: An Octopus's Garden (underwater).
- Outfit: `item`; peridot → Neptune flytrap (equipped if the zone offers it and not imperiled today); Familiar: unchanged (no sneak); Effects: `itemDropEffects`.
- Choices: `298: 2`.
- Combat: `forceItems(Neptune flytrap)` → parka acid spit if ELY down, else saber Force (purpose "free": `saberForcesFree() > 0`, i.e. only charges left after diver×2/healer/seaCow/researcher reservations); default `banish()` → first banish source (§1.4) + kill ladder on everything else. No opportunistic free kill (no `kill` action).
- Free resources: parka ray or a free saber charge; one banish; peridot imperil for the Garden.
- Prepare: `recover()`. Turns: 1-2 typical. Tier: none.

### S22. Pellet/Use Pellet (pellet.ts:36-43)

- Runs when: pellet owned, step < 0. Activity: `use(pellet)`. `tries: 1`.

### S23. Pellet/Little Brother (pellet.ts:44-51)

- Runs when: step < 1. Activity: `monkeycastle.php?who=1`; `underwater: true, freeaction`. `tries: 3`.

### Big Brother quest (`tasks/monkees/bigbrother.ts:13-67`)

### S24. Big Brother/Wreck Rescue (forced) (bigbrother.ts:23-36)

- Runs when: `monkeesStep() === 1 && (noncombatForcerActive || ncForceEstimate() >= 4)`; completed at step ≥ 2.
- Loop until: rescue; `soft: 10`.
- Location: The Wreck of the Edgar Fitzsimmons.
- Outfit: `item`; Familiar unchanged; Effects: none.
- Choices: `299: 1`.
- Combat: `kill()` → kill ladder; opportunistic free kill on any non-seahorse (Wreck = drop-safe).
- Free resources: one out-of-combat NC forcer (tuba → Cincho → Sneakisol → pull-backed) armed in prepare after `recover()`; darts/etc. on any fight that happens.
- Turns: 1 when the forcer lands. Tier: none.

### S25. Big Brother/Wreck Rescue (sneak) (bigbrother.ts:38-49)

- Runs when: step === 1 (fallback when S24 not ready); `soft: 12` ("Down at the Hatch is hiding…").
- Outfit: `-combat`, familiar `sneakFamiliar()`; Effects: `sneakEffects` (Sonata, Ultra-Soft Steps, Wild and Westy!, Hiding From Seekers, Life Goals, Smooth Movements, Apriling Patrol Beat, Silent Running, Feeling Lonely — trimmed to the song cap).
- Combat: `freeRun()` → −combat familiar rule (turkey keeps the slot; boots last resort); fallback taffy + kill.
- Choices: `299: 1`. Prepare: `recover()`. Turns: until the NC.

### S26. Big Brother/Bubblin' Stone (bigbrother.ts:53-64)

- Runs when: step ≥ 2, completed at step ≥ 4. Activity: `monkeycastle.php?who=2` then `who=1`. `underwater, freeaction`, `tries: 3`.

### Grandpa quest (`tasks/monkees/grandpa.ts:14-100`)

### S27. Grandpa/Find Grandpa (grandpa.ts:26-57)

- Runs when: step === 4; completed at step ≥ 5. `soft: 30` ("Grandpa's rescue NC is hiding…").
- Location: `grandpaZone()` (function `do`, `underwater: true`).
- Outfit: `item, -100 combat`, familiar `sneakFamiliar()`, equip Mer-kin sneakmask; Effects: `sneakEffects + resEffects`.
- Choices: `302:1, 303:1, 304:2, 305:2, 306:1, 307:1, 308:1, 309:2`.
- Combat: `kill(giant squid, Mer-kin miner, Mer-kin tippler)` with a drop-safe opportunistic free kill appended per monster; default `freeRun()` (−combat rule; location undefined so navel/GAP need Waterproofly and the boots need a familiar breather).
- Prepare: `recover()`; `discretionaryPull(Mer-kin hidepaint)` and `use 1 Mer-kin hidepaint` if Colorfully Concealed is down.
- Free resources: run ladder per non-dropper fight; free kills on the three droppers; one hidepaint pull. Turns: until the class NC. Tier: low skips the hidepaint pull.

### S28. Grandpa/Grandpa Story (grandpa.ts:60-67)

- Runs when: step === 5. Activity: `grandpa grandma`. `tries: 2`.

### S29. Grandpa/Golem Recall (grandpa.ts:76-95, mid only)

- Runs when: `have(Just the Facts) && _monsterHabitatsMonster === null`; completed when a habitat is set or crayon shavings ≥ 9. `tries: 2`.
- Activity: `summon(Black Crayon Golem)`.
- Outfit: `item`, equip legendary seal-clubbing club; Effects: none.
- Combat: golem macro `openerOnce(Recall Facts: Monster Habitats; Club 'Em Into Next Week)`, default `kill()`. No opportunistic free kill (function do, no monster key).
- Free resources: one summon, one habitat recall, the Club 'Em copy. Turns: 0 (free fight) if the summon is free. Tier: high omits this task.

### Outpost quest (`tasks/monkees/outpost.ts:62-179`)

### S30. Outpost/Grandma Note (outpost.ts:73-83)

- Runs when: Grandma's Note + Fuchsia Yarn + Chartreuse Yarn all owned; completed when Grandma's Map owned or step ≥ 8. Activity: `grandpa note`. `underwater, freeaction`, `tries: 2`. Preempts S31 the moment the three drops are in.

### S31. Outpost/Outpost Grandma (outpost.ts:89-102)

- Runs when: step ≥ 6; completed at step ≥ 9. `soft: 30` ("Grandma's rescue is stalling…").
- Location: The Mer-Kin Outpost.
- Outfit: `item`; backup camera (`farmBackup`, `:49-57`): Black Crayon Golem when `_monsterHabitatsFightsLeft === 0 && recalled >= 2`, Mer-kin healer while beads < 2, cap 7; Familiar unchanged; Effects: `itemDropEffects`.
- Combat: golem monster-macro `golemRecallMacro` (second Recall Facts when fights 0 and recalled < 2); `banish(Mer-kin burglar, Mer-kin raider)` (§1.4 + kill ladder); default `kill()` with opportunistic free kill guarded `if !(burglar || raider || seahorse)` — Outpost is drop-flag FALSE so groveling gravel is admitted here.
- Prepare: `assertBanishHeld([burglar, raider], outpost, …)` (aborts if the previous turn's banishable was not banished while a source was available), `recover()`.
- Free resources: one banish source, backup copies (≤7 outpost), free kills incl. gravel. Turns: until "Phew, that was a close one" (step 9). Tier: none.

### S32. Outpost/Outpost Lockkey (outpost.ts:109-122)

- Runs when: step ≥ 9; completed when `merkinLockkeyMonster` set or stashbox/trailmap/corral known. `soft: 25`. Same location/outfit/backup/combat/prepare as S31.

### S33. Outpost/Outpost Stashbox (outpost.ts:127-148)

- Runs when: `merkinLockkeyMonster !== null`; completed when stashbox/trailmap owned or `corralUnlocked`. `soft: 15`.
- Outfit: `-combat`, familiar `sneakFamiliar()`; Effects: `sneakEffects`.
- Combat: `freeRun()` (−combat rule).
- Choices (choice script): 312 → `choiceAdventure312` (lockkey monster's hut), 313/314/315 → `stashboxCheck` search orders `[1,3,2]` / `[1,2,3]` / `[3,1,2]` recorded in `_subaqua_stashbox_checked` (`choice.ts:123-149`).
- Prepare: `recover()`; THROW if all three hut options were searched without a stashbox (`:137-145`).
- Free resources: run ladder. Turns: until the hut NC.

### S34. Outpost/Prayerbeads (outpost.ts:154-176)

- Runs when: step ≥ 9 && `intenseCurrents`; completed at ≥ 3 prayerbeads (`availableAmount`). `soft: 12`.
- Outfit: `-combat, item`, familiar `sneakFamiliar()`; Effects: `sneakEffects`; `saberPurpose: "healer"`.
- Combat: `forceItems(Mer-kin healer)` → saber FIRST (healer purpose: `prayerbeadsShort() && forcesAfterDiver() > 0`, exempt from the outpost saber ban), else parka ray; default `freeRun()`.
- Choices (script): 312 → 3 (healer shop post-currents), 315 → beads while < 3, else killscroll/healscroll for unknown clues 5/2, else beads (`choice.ts:137-147`).
- Prepare: `recover()`; `pawWish(prayerbeads)` while < 3 and wishes remain; then one reserved pull if `pullBudgetAllows`.
- Free resources: paw wishes, one pull, one saber charge (or ray), run ladder. Turns: until 3 beads. Tier: none (bead pull is a reservation, not discretionary).

### Currents quest (`tasks/monkees/currents.ts:6-34`)

### S35. Currents/Open Corral (currents.ts:16-31)

- Runs when: stashbox or trailmap owned; completed when `corralUnlocked`. Activity: use stashbox, use trailmap, `grandpa currents`, `visitUrl("seafloor.php")`. `underwater, freeaction`, `tries: 2`. 0 turns.

### Helmet quest (`tasks/monkees/helmet.ts:118-310`)

### S36. Helmet/Sand Dollars (helmet.ts:128-140)

- Runs when: `bigBrotherRescued && questS01OldGuy === "started"`; completed at ≥ 63 sand dollars, or `dampOldBootPurchased`, or Old Guy finished. `soft: 8`.
- Activity (`gainSandDollars`, `:92-116`): use every Mer-kin thingpouch; buy sand dollars at Wet Crap For Sale while < 63 and ≥ 100 sand pennies; `pullSequence(damp old wallet)` + use; if still short: Aug 2nd clover skill, else 11-leaf clover (owned or pulled), and if Lucky! `adv1(outpost, -1, "")` (grimoire CCS = this task's `kill()`).
- Outfit: `item`; `underwater: true`; Combat: `kill()`. Prepare: `recover()`. Turns: 0-1. Tier: none.

### S37. Helmet/Old Guy Boot (helmet.ts:142-159)

- Runs when: `bigBrotherRescued && (sand dollars >= 63 || dampOldBootPurchased)`; completed when Old Guy finished. Activity: buy black glass from Big Brother if not owned and step < 12; buy damp old boot; pick reward 6313 (damp old wallet). `freeaction`, `tries: 2`.

### S38. Helmet/Rivet Gap (helmet.ts:168-181)

- Runs when: porthole + broken helmet owned and 5 < rivets < 8, and (paw wishes left or rivet not pulled today with pulls left). Activity: `pawWish(rusty rivet)` while the gap is open; `pullSequence(rusty rivet)` at exactly 7. `freeaction`, `tries: 3`.

### S39. Helmet/Diver Summon (helmet.ts:190-224, mid only)

- Runs when: `summonsAvailable() >= 1 && rivetHuntActive()` (parts missing and no hat breather); completed when `!rivetHuntActive() || rivetsDone()`. `tries: 5`.
- Activity: `summon(unholy diver)`. `saberPurpose: "diver"`.
- Outfit: `item`, familiar Chest Mimic when ≥ 100 exp (else unchanged); Effects: `superItemDropEffects + itemDropEffects`.
- Combat: diver macro `openerOnce(%fn, lay an egg)`; `forceItems(unholy diver)` → saber first (`rivetHuntActive() && (diverHuntActive() ? charges > 0 : saberForcesFree() > 0)`), else parka ray; no default action (a non-diver fight would compile to nothing but the appended macros — the summon always yields a diver).
- Prepare: `recover()`; `applyEffects(squintEffects())` only when `!forceGranted("diver")`.
- Free resources: one summon (locket/fax/mimic egg/pocket wish), one saber charge or ray, the mimic egg, once-a-day Squint. Turns: 0 (summon fights are free). Tier: high omits the summon lane.

### S40. Helmet/Wreck Rivets (hatch closed) (helmet.ts:240-254)

- Runs when: `rivetHuntActive() && !hatchOpen()` (`_lastFitzsimmonsHatch` unset or ≥ 20 turns old). `soft: 20`.
- Location: the Wreck; Outfit: `-combat`, familiar `sneakFamiliar()`; Effects: `sneakEffects`; Choices `299: 1`; Combat: `freeRun()`. Prepare: `recover()`. Turns: until Down at the Hatch reopens the window.

### S41. Helmet/Wreck Rivets (helmet.ts:262-284)

- Runs when: `rivetHuntActive() && hatchOpen()`. `soft: 30` ("Diver parts are not dropping…").
- Location: the Wreck; peridot → unholy diver; `saberPurpose: "diver"`.
- Outfit: `item`; Effects: `superItemDropEffects + itemDropEffects`; Choices `299: 1`.
- Combat: `forceItems(unholy diver)` (saber first, then ray); default `banish()` (first banish source + kill ladder on crabs/sailor/scavenger). No opportunistic free kill.
- Prepare: `recover()`; Squint if `!forceGranted("diver", wreck)`.
- Free resources: saber/ray, one banish, peridot imperil. Turns: until 8 rivets + porthole + broken helmet.

### S42. Helmet/Craft Helmet (helmet.ts:286-307)

- Runs when: `rivetsDone()`; completed when any hat breather (gladiator/scholar/crappy mask, aerated diving helmet) is owned. Activity: `retrieveItem(aerated diving helmet)`; ABORT if it fails (`:299-303`). `freeaction`, `tries: 1`.

### Mom quest (`tasks/monkees/mom.ts:149-325`)

### S43. Mom/Black Glass (mom.ts:166-193)

- Runs when: step ≥ 9 && sand dollars ≥ 13; completed when black glass owned or step ≥ 12. Activity: walk step 9 → who=1, step 10 → who=2 (ABORT if a visit does not advance), then buy black glass from Big Brother (ABORT if not received). `underwater, freeaction`, `tries: 3`.

### S44. Mom/Banish Constructs (mom.ts:200-225, mid `cyber` lane)

- Runs when: `have(Patriotic Eagle) && have(server room key)`; completed when Mom done, or `_cyberFreeFights >= 10`, or `banishedPhyla` contains "construct". `tries: 4`.
- Location: Madness Bakery (surface). Outfit: familiar Patriotic Eagle; Effects: none.
- Combat: general macro `openerOnce(%fn, Release the Patriotic Screech!)`, default `kill()` + opportunistic free kill (Bakery drop-flag false → gravel allowed).
- Prepare: `recover()`; if the Bakery is not adventurable, `shop.php?whichshop=armory&action=talk` + `runChoice(1)`.
- Turns: 1 paid Bakery turn. Tier: high has no cyber lane.

### S45. Mom/Abyss Habitats (mom.ts:234-260)

- Runs when: cyber kit && Just the Facts && black glass; completed when `_monsterHabitatsRecalled >= 3` or the habitat is slithering thing / eye in the darkness. `soft: 8`.
- Location: The Caliginous Abyss. Outfit: `item`, equip black glass, avoid miniature crystal ball; Effects: `itemDropEffects`.
- Combat: monster macro on slithering thing / eye `openerOnce(Recall Facts: Monster Habitats)`, default `kill()` + opportunistic free kill (Abyss flag false; Assert your Authority zone).
- Prepare: `recover()`, `combJellyPrep()` (reserved comb jelly pull + use for Jelly Combed).
- Turns: 1-8.

### S46. Mom/Cyber Mom (mom.ts:265-293)

- Runs when: cyber kit && `_monsterHabitatsFightsLeft > 0`; completed when Mom done or `_cyberFreeFights >= 10`. `soft: 12`.
- Location: Cyberzone 1. Outfit: `moxie`, equip shark jumper + Monodent of the Sea; Effects: none.
- Combat: habitat monsters `trySkillRepeat(Throw Cyber Rock)`, default `kill()`; no free-kill zone.
- Prepare: `recover()`; THROW if buffed Moxie < 500 (`:288-290`).
- Turns: 0 (free cyber fights). Ticks `momSeaMonkeeProgress`.

### S47. Mom/Abyss Mom (mom.ts:304-322)

- Runs when: black glass owned AND NOT (cyber kit owned) — mid with the kit never runs this; completed when Mom done or `momSeaMonkeeProgress >= initialMomProgress()` (24, +4 without backup camera, +12 without 2002 catalog). `soft: 30`.
- Location: Abyss; peridot → eye in the darkness; Outfit `abyssOutfit` (`item`, black glass, shark jumper, scale-mail underwear, Monodent until the school is banished, avoid crystal ball); Effects `itemDropEffects`.
- Combat (`abyssCombat`, `:77-81`): VHS throw on eye/slithering/school while unrecorded & progress < 36 & tape held; school of many: Sea \*dent bolt + 4× Garbage Nova; default `kill()` + opportunistic free kill (gravel/Assert allowed).
- Prepare: `recover()`, `combJellyPrep()`.

### Corral quest (`tasks/monkees/corral.ts:134-344`)

### S48. Corral/Corral Opener (corral.ts:197-231, mid `opener`)

- Runs when: `corralUnlocked`; completed once `corral.turnsSpent > 0` or sea leather owned or sea cowboy hat owned or seahorse tamed. `tries: 3`.
- Location: The Coral Corral. Backup: eye in the darkness / slithering thing while momProgress < 40 (camera on, round-1 Back-Up → a free Mom tick instead of a corral fight).
- Outfit: `item`, equip pro skateboard; Effects: `superItemDropEffects + itemDropEffects + survivalEffects`.
- Combat: sea cow macro `openerOnce(Do an epic McTwist!)`; `kill(sea cow, sea cowboy)`; `banish(rustler)`; seahorse macro (`seahorseMacro`, tame if training ≥ 20 & 3 cowbells & lasso, else `runaway.repeat` with an unguent heal below 25% HP through round 5); default `kill()` + opportunistic drop-safe free kill guarded on rustler/seahorse.
- Prepare: `recover()`, `applyEffects(squintEffects())` (once-a-day Squint spent here if unused).
- Free resources: backup copy, one banish, drop-safe free kill, Squint, McTwist. Turns: 1. Tier: high skips.

### S49. Corral/Corral Leather (corral.ts:239-268)

- Runs when: `corralUnlocked`; completed when `leatherDone()` (leather+chaps+hat ≥ 2 AND cowbells ≥ 3) or tamed. `soft: 15`.
- Location: Corral; peridot → sea cow; `saberPurpose: "seaCow"`.
- Outfit: `item`, pro skateboard, familiar Sword only on the high sword lane (mid: unchanged); Effects: `itemDropEffects + survivalEffects`.
- Combat: cow macro McTwist opener; `forceItems(sea cow)` → parka ray first, else saber (`seaCowNeeded() && forcesAfterHealer() − researcherReserve > 0`); `kill(sea cowboy)` + drop-safe free kill on the cowboy; `banish(rustler)`; seahorse macro.
- Prepare: `assertBanishHeld([rustler])`, `recover()`, reserved cowbell pull when < 3.
- Turns: until 2 leather-family items and 3 cowbells.

### S50. Corral/Craft Chaps (corral.ts:270-276)

- Runs when: sea leather owned and no chaps; completed when chaps owned or training ≥ 20. `retrieveItem(sea chaps)`. `freeaction`, `tries: 1`.

### S51. Corral/Craft Hat (corral.ts:278-284)

- Same for the sea cowboy hat.

### S52. Corral/Corral Lassos (corral.ts:290-303)

- Runs when: `corralUnlocked`; completed when `lassoTrainingCount + 3×lassos >= 23 && lassos >= 1`, or tamed. `soft: 15`.
- Location: Corral; peridot → sea cowboy. Outfit: `item` (sword only on the high lane); Effects: `itemDropEffects + survivalEffects`.
- Combat (`lassoCombat`, `:171-186`): (sword opener only when the high lane owns the sword); `kill(sea cowboy, sea cow)` with drop-safe free kills per monster; `banish(rustler)`; seahorse macro. The engine's round-1 `sea lasso` throw with hat+chaps pinned trains +3 per fight here and on every other underwater non-free task.
- Prepare: `assertBanishHeld([rustler])`, `recover()`.

### S53. Corral/Tame Seahorse (corral.ts:310-341)

- Runs when: `lassoTrainingCount >= 20 && cowbells >= 3 && lasso >= 1`; completed when `seahorseName !== ""`. `soft: 12` ("The wild seahorse is not spawning…").
- Location: Corral. Outfit: `initiative`; Effects: `survivalEffects`.
- Combat: seahorse macro `tamingMacro` (funksling cowbell,cowbell / cowbell,lasso, else four singles, then `abort`); `banish(rustler, sea cowboy, sea cow)`; default `kill()` (free-kill upgrade is fully guarded → effectively none).
- Prepare: `assertBanishHeld([rustler, cowboy, cow])`, `recover()`, reserved cowbell pull when < 3.
- Gate note: if S52 completes with training < 20 (banked lassos satisfy the 23-point formula) this task is NOT ready; training continues on later underwater fights (Digpick, School, …) and this task preempts them once it reaches 20. The seahorse name also triggers the dreadscroll seed scan (§3).

### Sorceress Dailies (`tasks/sorceress/daily.ts:20-58`)

### S54. Sorceress Dailies/PYEC (daily.ts:27-40)

- Runs when: `usePyec` (mid yes) && PYEC owned or in storage; completed when `expressCardUsed` (or policy/no card). Activity: `pullSequence(PYEC)` if needed, `use`. `freeaction`, `tries: 1`. Tier: high never uses it.

### S55. Sorceress Dailies/Terminal Educate (daily.ts:44-55)

- Runs when: Source Terminal owned; completed when `duplicate.edu` is slotted. `freeaction`, `tries: 1`.

### Teflon quest (`tasks/sorceress/mine.ts:329-561`)

### S56. Teflon/Digpick (mine.ts:336-351)

- Runs when: `!oreSecured()` (no ore, no fins, no tailpiece); completed when a digpick is owned or ore secured. `soft: 8`.
- Location: Anemone Mine (underwater). Outfit: `item`; Effects: `itemDropEffects`; Combat: `kill()` + drop-safe opportunistic free kill (Anemone Mine flag true).
- Prepare: `recover()`, `discretionaryPull(Mer-kin digpick)` when not owned — so on mid the pull normally lands and the zone is never adventured.
- Turns: 0 with the pull; else +item farm. Tier: low farms.

### S57. Teflon/Mine Teflon (mine.ts:365-454)

- Runs when: digpick owned && `!oreSecured()`; completed when `oreSecured()`. `tries: 3` (message = NO_FREE_DIG_MESSAGE).
- Activity: ABORT if the digpick is not equipped; if no free dig (5 Unaccompanied Miner picks / Loded) try the lodestone (pull+use) and ABORT if still none; loop: `healForDig()` (Walrus for Beaten Up, `recover(760)`), `mining.php?mine=3` refresh, `pickSquare` (column-3 shaft then row<4 promising chunks avoiding velcro/vinyl; ABORT when nothing), dig; ABORT if the dig made no progress; ABORT on the safety cap; after the loop ABORT if no ore and no free dig left.
- Outfit: `{equip: [digpick]}`; `underwater: true`; `freeaction: freeDigAvailable` (Fishy/lasso upkeep skipped while free picks remain).
- Turns: 0 by rule (no paid digs; user rule 2026-08-27). Tier: none.

### S58. Teflon/Crappy Mask (mine.ts:458-512)

- Runs when: no Mer-kin mask of any kind; completed when one is owned. `soft: 8`.
- Activity: at ≥ 3 pristine fish scales: unequip aerated diving helmet + sea chaps, `retrieveItem(crappy Mer-kin mask)` under `autoSatisfyWithCoinmasters` (ABORT with missing-part diagnosis on failure); else `scaleTrip()` (`:182-197`): `getLucky()` (Aug 2 skill → hermit clover via retrieveItem → use) then `adv1(Caliginous Abyss, killMacro)` for A University of Fish, or with ≥ 10 rough scales `adv1(Madness Reef, killMacro)` for the Economist (choice 311→1 pinned; 310 drained by the choice script, `choice.ts:209-220`); ABORT when neither rung is available.
- Outfit: equip black glass; `-combat` modifier only when the reef trip is next; familiar breather equipped in-do; `underwater: true`. Effects: none.
- Turns: 1 per scale trip (up to 3 Lucky trips + reef trades). Tier: none.

### S59. Teflon/Crappy Tailpiece (mine.ts:514-558)

- Runs when: no tailpiece of any kind and ore/fins owned; completed when a tailpiece is owned. `soft: 8`. Same shape as S58 for `crappy Mer-kin tailpiece` (ROW125: sea chaps + teflon swim fins + 3 scales; the sea chaps are CONSUMED, ending lasso-training pins).

### School quest (`tasks/sorceress/school.ts:79-250`) — quest `completed` = `isMerkinHighPriest`

### S60. School/Deep Dark Visions (school.ts:93-106)

- Runs when: skill known; completed when `dreadScroll3 !== 0`. Activity: `restoreHp(1000)`, cast. Outfit: `50 spooky res, hp`. `freeaction`, `tries: 12`.

### S61. School/School Unlocks (school.ts:111-137)

- Runs when: always (until) `merkinElementaryTeacherUnlock` or (`isKnucklebonesAndSushiEnough() && cowlAndRope()`). `soft: 15`.
- Location: Mer-kin Elementary School. Backup: free monsters. Outfit: `-combat`, crappy mask + tailpiece, familiar `sneakFamiliar()`; Effects: `sneakEffects`.
- Combat: `kill()` + drop-safe opportunistic free kill. Choices (script): 396→3, 397→2, 398→1, 399→1, 400→1, 401→2, 705→4.
- Prepare: closet all hallpasses, `recover()`.
- Turns: until the teacher's lounge unlock (3 NCs on the long route).

### S62. School/Use Wordquiz (school.ts:141-153)

- Runs when: `!isKnucklebonesAndSushiEnough()` && wordquiz held && (cheatsheet held or pullable today within budget); completed at vocabulary ≥ 90 or seed-pinned. Activity: pull cheatsheet if needed, `use(wordquiz)`. `freeaction`, `tries: 15`.

### S63. School/Farm School (school.ts:162-185)

- Runs when: `!isKnucklebonesAndSushiEnough()`; completed at vocab ≥ 90 / seed-pinned, or when a wordquiz is held with a cheatsheet held or pullable. `soft: 30`.
- Location: School; backup free monsters; peridot → Mer-kin monitor.
- Outfit: `item` (plus `hat drop` until a bunwig is owned), crappy pieces; Effects: `itemDropEffects`.
- Combat: monitor macro `openerOnce(Duplicate)`; `kill()` + drop-safe free kill.
- Prepare: un-closet hallpasses, shrug Sonata of Sneakiness, `sourceEnhanceItems()`, `recover()`.
- Turns: the long-route vocabulary grind (live 2026-08-28: 41 turns without the seed scan). Skipped entirely when the seed scan pins clue 4/7 uniqueness.

### S64. School/Cowl and Rope (school.ts:189-211)

- Runs when: `!cowlAndRope()` (facecowl-or-scholar-mask AND waistrope-or-scholar-tailpiece). `soft: 20`.
- Location: School; Outfit: `item`, crappy pieces; Effects: `combatEffects + itemDropEffects`; Combat: `kill()` + drop-safe free kill.
- Prepare: un-closet hallpasses, shrug Sonata, `sourceEnhanceItems()`, reserved hallpass pull when one piece is in and no hallpass, `recover()`.

### S65. School/Buy Scholar Gear (school.ts:215-247)

- Runs when: `cowlAndRope()`; completed when scholar mask + tailpiece owned. Activity: blank hat and pants, `buy` each from Grandma Sea Monkey. `freeaction`, `tries: 2`.

### Library quest (`tasks/sorceress/library.ts:186-289`) — quest `completed` = `isMerkinHighPriest`

### S66. Library/Library Force (library.ts:163-184, force=true)

- Runs when: scholar mask+tailpiece owned && (killscroll or healscroll not held); completed when the dreadscroll is held and clues 1/6/8 known. `soft: 30`.
- Location: Mer-kin Library; backup free monsters; `saberPurpose: "researcher"`.
- Outfit (`farmOutfit`, `:122-146`): no dreadscroll → `item`, scholar pieces, Monodent (only when no researcher Force is granted and scrolls are missing), blood cubic zirconia while scroll drops are wanted (else `avoid`); dreadscroll held → `-combat`, scholar pieces, BCZ rule, familiar `sneakFamiliar()`. Effects: `itemDropEffects` / `sneakEffects` correspondingly.
- Combat: general macro `clueThrows` (healscroll while clue 2 unknown, killscroll while clue 5 unknown, guarded `if !monsterid researcher` while the Force is wanted); `forceItems(Mer-kin researcher)` → parka ray first, else saber (`researcherNeeded() && forcesAfterSeaCow() > 0`); default `kill()` + drop-safe free kill guarded on the researcher.
- Choices (script): 704 → first catalog card with status unknown, else 1.
- Prepare: `sourceEnhanceItems()`, `recover()`.

### S67. Library/Library Farm (library.ts:163-184, force=false)

- Runs when: scholar gear owned && both combat scrolls held. Same as S66 without `forceItems`/saberPurpose; free kill guarded on seahorse only.

### S68. Library/Knucklebone (library.ts:204-223)

- Runs when: dreadscroll held && clue 4 unknown. Activity: reserved knucklebone pull if needed; ABORT if none; `use`. `freeaction`, `tries: 2`.

### S69. Library/Worktea Sushi (library.ts:230-262)

- Runs when: dreadscroll held && clue 7 unknown && vocab < 90. Activity: reserved worktea pull if needed; ABORT if none / < 2 fullness / no nigiri; `retrieveItem(white rice)`, `eatSushi()`. `freeaction`, `tries: 2`.

### S70. Library/High Priest (library.ts:266-286)

- Runs when: dreadscroll held && clues 1/6/8 known; completed when `isMerkinHighPriest`. `soft: 40`.
- Activity: if Deep-Tainted Mind is up → `burnTurnElsewhere()` (`burn.ts:24-47`: skate war turn → gymnasium turn (post-Yog it is `gladiatorGearStep`) unless an NC forcer is pending → colosseum round if gear ready and < 15 wins; ABORT "1-in-40" when nothing remains); else `godRunGuardCheck()` (arg-gated ABORT at ≤ 17 turns with clue 7 unknown), `use(dreadscroll)` → choice 703 answered by the script's Mastermind solver (`choice.ts:205-208, 313-398`).
- `underwater: true`; no outfit/combat of its own (the burn helpers self-dress). Turns: 0 on a correct guess; 1 burned turn per wrong guess.

### Yog-Urt quest (`tasks/sorceress/yogurt.ts:217-388`)

### S71. Yog-Urt/Gummiheart Burn (yogurt.ts:227-249)

- Runs when: Gummiheart up && High Priest && !yogUrtDefeated && adventures > 0; completed when the effect is gone, the burn ladder is dry, or 8 turnless passes. `soft: 40`.
- Activity: `burnTurnElsewhere()`; counts stalls when adventures did not drop. `underwater: true`.

### S72. Yog-Urt/Yog Prep (yogurt.ts:256-327)

- Runs when: High Priest && !defeated; completed when defeated or `yogPrepComplete()` (unguent + elixir held, ≥ 2 deleveler types or Null Afternoon, heal kit ≥ `healsNeeded()` distinct types: 21/5/3/1 by beads 0/1/2/3+). `freeaction`, `tries: 3`.
- Activity: antidote pull (Gummiheart up, `trueHPPercent() >= 1.4`, budget); healscroll pull; Wet Crap buys of waterlogged scroll + sea gel at ≥ 10 pennies; `retrieveItem` unguent + elixir; null-day pull+use when < 2 delevelers; ABORT if still < 2 delevelers and no Null Afternoon; prayerbeads pull when < 3; `pullHeal(crystal)`, `pullHeal(band-aid)`; ABORT if the kit is still short.

### S73. Yog-Urt/Yog-Urt (yogurt.ts:332-385)

- Runs when: `yogPrepComplete() && gummiheartWaitOver() && isMerkinHighPriest`; completed when `yogUrtDefeated`. `tries: 3`.
- Location: Mer-kin Temple (Right Door) via `adv1(…, -1, yogUrtFilter())` (`fights.ts:344-507`: two funkslinged deleveler+heal rounds, bead-count-conditional extra heals, elixir+unguent pair, HP-floor heals, item-only while More Like a Suckrament is up, then Saucegeyser/Saucestorm/attack; ABORT on a stuck round or an empty heal kit below 3 beads).
- Outfit: `moxie, hot/cold/spooky/sleaze/stench damage, -hp, -equip tiny yam cannon`, scholar mask + tailpiece, bat wings (mid: yes), acc1-3 = prayerbeads (up to 3, inventory+worn), familiar `expFamiliar()` (Chest Mimic → Cooler Yeti → Cookbookbat → none). Effects: `survivalEffects`.
- Prepare: Cannelloni Cocoon, `recover(myMaxhp())`, `yogHpCheck()` (antidote to strip Gummiheart if 0.8×predicted HP > smallest heal; ABORT if still too high).
- Free resources: bat wings free fight rider, the prep pulls. Turns: 1 (free with bat wings). Tier: high conserves bat wings.

### Gladiator Gear (`tasks/sorceress/gym.ts:161-193`)

### S74. Gladiator Gear/Guard Grind (gym.ts:166-190)

- Runs when: `yogUrtDefeated && (!noncombatForcerActive || !skateWarOpen())`; completed when gladiator mask AND tailpiece are owned. `soft: 18`.
- Activity `gladiatorGearStep()` (`:130-159`): `gymnasiumTurn()` (`:47-116`: ABORT if an NC forcer is pending; `applyEffects(combatEffects + survivalEffects)`; maximize `combat rate` + forcer gear (left ski, else parka spikolodon) while the war is open + familiar breather + first non-familiar free-run/banish source's gear + lasso hat/chaps + `sea`; `ensureHelperBreathing`; `recover(800)`; `adv1(Mer-kin Gymnasium, -1, gladiatorFilter({gym:true, warOpen}))`), then if both guards are held and Yog is dead: blank hat/pants, sell scholar mask (ROW131) and tailpiece (ROW1619) back via raw URLs, buy gladiator mask + tailpiece.
- Combat (gym filter, `fights.ts:160-330`): non-mer-kin → kill ladder; healscroll/killscroll throws while clues 2/5 unknown; one spikolodon/avalanche cast while the war is open; ONE free run/banish attempt per fight (`gymFreeRun`, banish:true); then nuke-first/openers/spell ladder.
- Choices (script): 701 → 1. `underwater: true`. Turns: until both guards drop.

### Skate Park (`tasks/sorceress/skatepark.ts:143-167`)

### S75. Skate Park/War Resolution (skatepark.ts:150-164)

- Runs when: `skateWarOpen()` (map purchased && page-refreshed `skateParkStatus === "war"`); completed when not. `soft: 8`.
- Activity `skateParkTurn()` (`:81-141`): reserved skate blade pull; `forceNextNoncombat()`; with a forcer pending: unequip peridot, equip blade; else maximize `-combat, -equip Peridot of Peril` + lasso pins + `sea`, equip blade; `ensureHelperBreathing`; familiar breather; `recover()`; `adv1(The Skate Park, -1, killMacro)`; `claimIceBuff()` (lutz Fishy once ice).
- Choices: `403: 1` (pinned; script also answers 1). `underwater: true`.

### Colosseum (`tasks/sorceress/colosseum.ts:167-191`)

### S76. Colosseum/Fifteen Rounds (colosseum.ts:172-188)

- Runs when: gladiator mask + tailpiece available or already champion; completed at `lastColosseumRoundWon >= 15` or champion. `soft: 25`.
- Activity `colosseumRoundTurn()` (`:78-165`): `colosseumRoundPrep()` (11 unguents, ≤5 sea gels at 10 pennies each, BCZ Dial it up to 11 from round 3, null-day at round ≥ 6 with < 8 shavings); familiar Patriotic Eagle (screech pending + CMOI) else Foul Ball; maximize `<coeff> spell damage percent, mys` + gladiator mask/tailpiece + CMOI + legendary club (mid) + bat wings (< 5 free fights) else retro cape `heck kill` + familiar breather + `sea`; `applyEffects(colosseumEffects + survivalEffects)`; `monorail buff`; `ensureHelperBreathing`; `recover(myMaxhp())`; `adv1(Mer-kin Colosseum, -1, gladiatorFilter())`; on "Been There, Won That" set the champion prefs.
- Combat: gladiator filter (reflect stall on the bladeswitcher, Club 'Em Back in Time once per fight, spell ladder; ABORT on a stuck round). `underwater: true`. Turns: 15 rounds, minus bat-wings/cape free fights. Tier: high conserves the free-fight riders and never clubs.

### Mom Finish (`tasks/monkees/mom.ts:96-117`)

### S77. Mom Finish/Abyss Finish (mom.ts:101-114)

- Runs when: black glass owned; completed when `questS02Monkees === "finished"` or progress ≥ 40. `soft: 20`. Same location/peridot/outfit/combat/prepare as S47 (Abyss Mom). Turns: (40 − progress) paid Abyss turns not covered by backups/wanderers.

### Shub (`tasks/sorceress/shub.ts:29-168`)

### S78. Shub/Shub Prep (shub.ts:42-71)

- Runs when: gladiator champion && !defeated; completed when defeated or `!shubPrepShort(0)` (delevel projection ≤ 0.25 or Null Afternoon). `freeaction`, `tries: 2`.
- Activity: reserved null-day pull when none held; use it if held; ABORT if still short.

### S79. Shub/Shub-Jigguwatt (shub.ts:81-165)

- Runs when: champion && `!shubPrepShort(0)`; completed when `shubJigguwattDefeated`. `tries: 4`.
- Location: Mer-kin Temple (Left Door) via `adv1(…, -1, shubFilter())` (`fights.ts:516-551`: funksling same-item deleveler pairs while the projection allows, then attack; ABORT on a stuck round).
- Outfit: `damage absorption, mus`, gladiator mask + tailpiece, familiar `expFamiliar()`; Effects: `survivalEffects({damageFree:true})`.
- Prepare: shrug passive-damage effects (item cure only from pack stock; warn otherwise); gremlin juice + hand chalk pulls only when `shubInsurancePulls` (mid: no) OR buffed Muscle < 1250; use them if held; `recover(myMaxhp(), 0)`; Ruthless Efficiency; `cast * empathy of the newt` (MP dump).
- Turns: 1 per attempt; a loss is a sanctioned retry (post() carve-out).

### Finale (`tasks/sorceress/finale.ts:48-143`)

### S80. Finale/Pry Pearls (finale.ts:57-68)

- Runs when: both gods dead; completed when no codpiece slot holds a pearl. Activity: `unequip` each pearl slot, `refresh inv`. `freeaction`, `tries: 2`.

### S81. Finale/Nautical Seaceress (finale.ts:73-117)

- Runs when: both gods dead && pearls pried; completed when `questL13Final` finished. `tries: 5`.
- Prepare: ABORT if fewer than 5 pearls in inventory; `recover()`.
- Location: Mer-kin Temple (Center Door) via `centerDoorFilter()` (`fights.ts:555-594`: two Raise Backup Dancer, Saucegeyser / Mortar+Saucestorm / attack).
- Outfit: `spell damage percent, mys`, gladiator mask + tailpiece, CMOI if owned, bat wings (mid, < 5 free fights), familiar `expFamiliar()`. `underwater: true`. Turns: 2 door adventures (ash), 1 fight.

### S82. Finale/Penny Dump (finale.ts:124-140)

- Runs when: Seaceress defeated; completed at ≤ 10 sand pennies. Activity: buy water-logged pills while > 30 pennies, waterlogged scrolls of healing while > 10, `council` ×2. `freeaction`, `tries: 2`. This completes `routeComplete()` → `postloopCommand`.

### Ordering / gate observations

- Because every gate is `ready()`, the effective phase sequence is enforced by quest prefs: Pellet (step<0) → Big Brother (1-3) → Grandpa (4-5) → Outpost Grandma (6-8) → Outpost Lockkey/Stashbox (9) → Open Corral → Prayerbeads (intenseCurrents) → Helmet (Sand Dollars fires only after bigBrotherRescued and once nothing before it is ready) → Mom cyber lanes → Corral → sorceress.
- `Helmet/Sand Dollars` sits AFTER Outpost/Currents in the list, so even though it is `ready` from step 2 it does not run until the outpost grind, stashbox, and prayerbeads have nothing to do.
- `Mom/Abyss Mom` never runs on mid with the cyber kit (`ready` excludes it); progress beyond the cyber fights waits for backups (Corral Opener) and wanderers, and the rest is `Mom Finish/Abyss Finish` right before Shub.
- Tasks that can go permanently not-ready without completing (harmless, logged as "○" by `subaqua list`): PYEC (no card), Terminal Educate, Skate Park/War Resolution (no map), Yog Prep / Shub Prep after their fights, Gummiheart Burn.
- Real blockers: `Corral/Tame Seahorse` waits on lasso training reaching 20 (see S53); `Gladiator Gear/Guard Grind` waits on `yogUrtDefeated`; `Colosseum` on the gladiator set; `Shub Prep` on the championship; `Finale` on both gods. `Library` lanes wait on `School/Buy Scholar Gear`. No cycle exists among these.

---

## 3. Per-turn duties (engine hooks, in execution order per task)

1. **acquireEffects** (`engine.ts:696-764`): `reserveMpFor(task.effects)` (`moods.ts:483-493`: restore MP to mood cost + one Saucegeyser, capped at max MP — only when the task lists effects); drop effects whose skill costs more than max MP; trim songs to `getSongLimit()`; `shrugForSongs` (uneffect unwanted active songs down to the cap); cast each with `ensureEffect`, skipping when current MP < cost, fail-soft on libram `EnsureError` only (anything else rethrows).
2. **createOutfit** (`:766-811`): strips unowned gear/familiar from the spec so `Outfit.from` never throws on aspirational items.
3. **customize** (`:228-677`), before dress: backup camera + round-1 Back-Up when the last copyable matches (`:250-254`); peridot equip + `_subaqua_peridot_target` only when the zone currently offers the target and is not imperiled today (`:256-268`); **lasso training**: when `!freeaction && isTrainingLasso()` (`lassoTraining !== "expertly" && lassoTrainingCount < 20 && have(sea lasso)`, `outfit.ts:97-101`) and the task is underwater → `openerOnce(tryItem(sea lasso), 1)` (= `if !pastround 2`) as a starting macro and sea cowboy hat + sea chaps pinned (`:276-280`); resource provides for banish/killFree/freeRun/forceItems (§1); opportunistic free kill (§1.1); **breathing enforcement** (`:579-676`): for underwater tasks without Driving Waterproofly / Wet Willied and no breather already in the outfit → THROW if no owned breather; release the pinned hat if every owned breather sits in a pinned slot; push the `sea` maximizer keyword (plus `-tie` when the outfit has no other objective) when a real familiar is fielded, else hard-equip `preferredBreathingGear()[0]` (SCUBA tanks first while lasso-training, else trunks first); then famslot `das boot`/`little bitty bathysphere` for any fielded non-aquatic familiar (THROW if none owned).
4. **dress** (`:813-840`): `super.dress`, then last-chance `equip(breather)` and famslot breather with verification THROWs.
5. **setCombat/setChoices**: grimoire CCS write + June cleaver choices 1467-1475 when the cleaver is worn (`:980-995`); global `1387: 3` (`:1004`).
6. **prepare** (`:679-694`): snapshot `_lastCombatLost`, `myTurncount`, `lastEncounter`; for underwater non-freeaction tasks `maintainWaterproofly()` then `maintainFishy()` (§1.7 — restore-at-zero, may eat/chew/pull, may ABORT); then the task's own `prepare` (almost every adventuring task calls `recover()` = `lib/index.ts:54-57`: `restoreHp(min(570, max))` / `restoreMp(min(250, max))` through mafia's restorer lists, which `initPropertiesManager` filters to Cannelloni Cocoon + Tongue of the Walrus for HP skills, no MP skills, no free rests/sofa/chateau/campground; gym uses 800, colosseum/Yog/Shub full HP, digs 760).
7. **do** (`:842-874`): writes `choiceAdventure1557 = 1&bandersnatch=<id>` when the peridot is worn and the zone offers the target; `adv1(location, -1, "")` (grimoire CCS) or the task function; repeats on wandering NCs; THROW if still stuck in choice 1557 afterwards.
8. **post** (`:876-978`): if Beaten Up → `uneffect` it, then THROW "Lost a combat during <task>" when `_lastCombatLost` and the loss is attributable to this task (flag clean at start, or a monster encounter happened during the task) — except a Shub loss; `uneffect(Really Quite Poisoned)`; `shrugBadEffects(Scarysauce, Scariersauce excluded)` — shrug-only sweep of passive-damage / page-altering / teleportitis / Blind / Always Fumble effects, red-line the rest; autosell dull + rough fish scales only when meat < 300; **dolphin whistle**: when a durable dolphin whistle is owned, `_durableDolphinWhistleUsed < seaPoints`, `dolphinItem` is set, `itemAmount(stolen) === 0`, and the item is in {sea lasso, sea leather, sea cowbell, Mer-kin knucklebone, killscroll, healscroll, worktea} (outpost prayerbeads/rusty rivet only when `whistleOutpostDrops` — mid: no) → use the whistle and fight under `killMacro(false)` via a temporary CCS; `emergencyDiet()` (`fishy.ts:455-471`: at 0 adventures crack the astral six-pack, shrug Donho's, Ode to Booze, drink one astral pilsner; ABORT when no pilsner or inebriety ≥ 14); `dreadSeedCheck()` whenever a seahorse name exists and not yet High Priest (`dreadscroll.ts:404-423`: one-time 9M-seed scan keyed on the seahorse name, cached per ascension, writes any clue on which all candidates agree).
9. **markAttempt / checkLimits** (grimoire): attempt counters per task per script run; `tries`/`soft` overrun → throw with the task message.
10. Property management (`:997-1065`): `autoSatisfyWithCloset=false`, `hpAutoRecovery=mpAutoRecovery=-0.05` (auto-restore off), `maximizerCombinationLimit=0`, filtered restorer lists, `choiceAdventureScript=subaqua_choice.js`, `currentMood=apathetic`; all restored by `destruct()`.
11. Mood lists (`moods.ts`): itdrop = Polka, Drunken Sailor, Fat Leon's, Lubricating Sauce, Ocelot, Leash, Empathy, Donho's, Richie (AT ≥ 15 only); superitdrop = Party Soundtrack (≥25 cinch), Best Pals; sneak = Sonata, Ultra-Soft Steps, Wild and Westy!, Hiding From Seekers, Life Goals, Smooth Movements, Apriling Patrol Beat, Silent Running, Feeling Lonely; combat = Cantata, Fresh Breath, Musk, Crunchy Steps, Apriling Battle Cadence, Towering Muscles (post-Yog), Attracting Snakes, Bloodbathed (not low); res = Astral Shell, Minor Invulnerability, Elemental Saucesphere, Scarysauce; survival = Ghostly Shell, Astral Shell, Elemental Saucesphere, Tenacity of the Snapper; colosseum = Ultraheart, Carol of the Hells, Elron's (AT), Big, Mojomuscular Melody. Squint is applied in specific `prepare`s only (Corral Opener, Diver Summon, Wreck Rivets when no Force covers the fight).

---

## 4. Aborts / throws reachable in the run flow (one line each)

Startup

- `main.ts:32` unknown command. `main.ts:37-40` not in the Sea path. `main.ts:43` `autoSatisfyWithNPCs` off.

Engine

- `engine.ts:592` / `:643` no owned player breather for an underwater task (customize). `engine.ts:672` no owned familiar breather for a fielded non-aquatic familiar. `engine.ts:818` / `:821` dress could not equip/establish player breathing. `engine.ts:834` / `:837` same for the familiar. `engine.ts:872` stuck in Peridot choice 1557 after `do`. `engine.ts:913` "Lost a combat during <task>; stopping." (not Shub). grimoire `checkLimits` (`engine.js:337-346`) tries/soft/turns overrun with the task's `limit.message`. grimoire `createOutfit`-style "Failed to build outfit for <task>" (`engine.ts:810`). `acquireEffects`: any non-EnsureError thrown by a cast (`engine.ts:760`).

Resources

- `fishy.ts:386-389` could not acquire Fishy. `fishy.ts:461-463` out of adventures, no astral pilsner. `fishy.ts:466` out of adventures, inebriety ≥ 14. `pulls.ts:37-40` mall price over `buyLimit()` for a pull. `banish.ts:265-271` banishable monster fought and not banished while a source was available (Corral Leather/Lassos/Tame Seahorse, Outpost Grandma/Lockkey). `summon.ts:90-92` mimic egg extraction failed. `summon.ts:107-109` no summon source left (Sword Imprint, Golem Recall, Diver Summon). `outfit.ts:82-84` `ensureHelperBreathing` failed (gym, colosseum, skate park, ice buff). `outfit.ts:139-141` `requiredFamiliarBreather` with no boot/bathysphere (gym, colosseum, skate park, scale trips). `dreadscroll.ts:454-457` godRunGuard (arg-gated, High Priest).

Tasks

- `init.ts:69-73` fewer than 5 pearls at turn 0. `init.ts:198-201` photobooth handed out a non-Sheriff item.
- `helmet.ts:300-302` aerated diving helmet craft failed.
- `mom.ts:177-179` castle visit did not advance the Monkees step. `mom.ts:185-187` black glass not received. `mom.ts:289` (throw) Cyber Mom with buffed Moxie < 500.
- `outpost.ts:141-144` (throw) all three stashbox huts searched, no stashbox.
- `mine.ts:272-274` no mining square left. `mine.ts:319-321` mineState3 did not parse. `mine.ts:384-386` digpick not equipped. `mine.ts:395` / `:442` free-dig budget exhausted without ore (+ lodestone detail). `mine.ts:414-416` dig safety cap. `mine.ts:430-438` KoL refused a dig. `mine.ts:489-493` ROW124 crappy mask trade failed. `mine.ts:497` / `:548` no scale source left (clovers out and < 10 rough scales). `mine.ts:540-544` ROW125 crappy tailpiece trade failed.
- `library.ts:216-218` no Mer-kin knucklebone. `library.ts:244-246` no worktea. `library.ts:249-251` no room for a 2-fullness nigiri. `library.ts:255-257` could not roll a nigiri. `library.ts:272-274` Deep-Tainted Mind with nothing left to burn ("1-in-40").
- `gym.ts:49-51` NC forcer pending on the way to the Gymnasium.
- `yogurt.ts:179-184` predicted post-debuff HP too high vs the smallest heal. `yogurt.ts:296-298` fewer than 2 deleveler types and no Null Afternoon. `yogurt.ts:314-322` healing kit short for the bead count.
- `fights.ts:185-187` gladiator fight not advancing rounds. `fights.ts:367` Yog-Urt fight not advancing. `fights.ts:399-401` out of Yog-Urt heals mid-fight (below 3 beads, or none thrown). `fights.ts:525` Shub fight not advancing. `fights.ts:565` Seaceress fight not advancing.
- `shub.ts:64-66` Shub prep short (delevelers / Null Afternoon).
- `finale.ts:83-89` fewer than 5 pearls in inventory at the Center Door.
- `combat.ts:98-100` the `killFree` default and every provided killFree macro end in a BALLS `abort` (fight-level abort → mafia stops the script) when the free kill did not end the fight; `corral.ts:69-70` taming macro ends in `abort` if the seahorse is still up after the throws.

Not in the run flow: `sim.ts` (separate `subaqua sim` command) and `relay.ts` have no aborts reachable from `run`.
