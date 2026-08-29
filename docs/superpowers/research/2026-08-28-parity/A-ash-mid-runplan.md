# UnderTheSea (ash) — mid-tier run plan, in execution order

Sources are the DEPLOYED copies under `~/Library/Application Support/KoLmafia/scripts/`:
`UTS` = UnderTheSea.ash (3144 lines), `G` = UnderTheSeaGlobals.ash (2155), `CCS` = UnderTheSeaCCS.ash (1207), `Choice` = UnderTheSea_Choice.ash (327).

Entry: `void main(string... args)` UTS:3086. A bare `UnderTheSea` sets `choiceAdventureScript=UnderTheSea_Choice.ash` and `choiceAdventure1387=3` (UTS:3129-3133), then runs `initialization()` (UTS:411) → `seaMonkees()` (UTS:1515) → `sorceress()` (UTS:2368) inside a try/finally that restores the choice script, 1387 pref and CCS (UTS:3138-3142). `sim` prints checklists only (UTS:3088); `postloop` runs only the postloop prefs (UTS:3096); any other word aborts (UTS:3127).

Everything below assumes **path 55** (11,037 Leagues; `my_path().id == 55`). Path-0 branches are mentioned only when they gate a step.

---

## 1. Tier and globals

### Tier

- `highShiny()` G:79-81: `garbo_valueOfFreeFight > valueOfAdventure` (both prefs, ints).
- `lowShiny()` G:83-87: owns NONE of 2002 Mr. Store Catalog, cursed monkey's paw, august scepter (`have_item` = inventory, storage or familiar-equipped, G:61).
- **Mid** = both false: `valueOfFreeFight <= valueOfAdventure` AND at least one of catalog / paw / scepter owned. There is no `midShiny()` function; "mid" is simply the else-branch of every `highShiny()` / `lowShiny()` test.

### `use_familiar(string)` UTS:12-65

- `"-combat"`: peace turkey → disgeist, else falls to the itdrop/grouper default below.
- `"combat"`: Jumpsuited Hound Dog, else default.
- `"exp"` (bosses): chest mimic → cooler yeti → cookbookbat → none.
- `"itdrop"`: `chosenFamiliar` (UTS:9, none by default) → _(high only: Melodramedary while camelSpit<100 and helmet not in hat slot)_ → Red-Nosed Snapper → Jill-of-All-Trades (only under Driving Waterproofly) → Space Jellyfish (if owned) → **grouper groupie** default. Prints and keeps the current familiar if the pick is not owned. `mummery()` (G:1375, "mummery item" once/day) fires after every itdrop pick.

### `mood(string)` UTS:67-170

- `"itdrop"`: Drunken Sailor, Fat Leon's, Lubricating Sauce, Thoughtful Empathy, Singer's Faithful Ocelot, Leash of Linguini, Empathy, Donho's, Richie Thingfinder (each only if skill known / effect absent); then `sourceEnhance()` (items.enh, G:1522) and `briefcase()` (Items Are Forever, G:1550).
- `"superitdrop"`: Hustlin', Steely-Eyed Squint, Party Soundtrack (needs Cincho), Best Pals, then the itdrop list.
- `"-combat"`: sonata of sneakiness, ultra-soft steps (needs ferns), Wild and Westy!, hiding from seekers, life goals (needs pamphlet), Smooth Movements, Apriling Band Patrol Beat (helmet + cooldown), silent running, feeling lonely.
- `"combat"`: Carlweather's, Fresh Breath (skip if \_aug6Cast), Musk of the Moose, Crunchy Steps (needs brush), Apriling Band Battle Cadence, Towering Muscles (only after Yog-Urt and <3 photo booth effects), Attracting Snakes, Bloodbathed (skip if low).
- `"hotres"/"spookyres"/"stenchres"`: Astral Shell, Minor Invulnerability (needs scroll), Elemental Saucesphere. `"sleazeres"/"coldres"`: same + scarysauce.
- `"colosseum"`: Ultraheart (needs heartstoneBuffUnlocked), Carol of the Hells, Elron's, Big, Favored by Lyle, Mojomuscular Melody, Tubes of Universal Meat, Mariachi Moisture, Everybody Calls Him Gorgon (low only).

### Outfit helpers (G)

- `tempEquipment(max, items)` G:504-556: splits `items` on commas, assigns to slots (2nd weapon → off-hand if Double-Fisted; extra acc → acc2/acc3); on any `"item drop"` maximize with a free off-hand it auto-pins **Kramco Sausage-o-Matic** (G:540-543); aborts `Missing <item>` or `Maximizer failed`; then runs the global `modes` CLI string (parka/retrocape modes).
- `bathysphere(it)` G:324: `little bitty bathysphere,` if the current familiar can't go underwater and no Waterproofly; else `if_equip(it)` (usually toy cupid bow).
- `swimmingTrunks()` G:370: `""` under Waterproofly, else `really nice swimming trunks,` (path 55). `underwaterPants()` G:394: scale-mail underwear if owned else trunks. `divingHelmet()` G:349: first owned of gladiator mask, scholar mask, crappy mask, aerated diving helmet, Elf Guard SCUBA tank. `tailpiece()` G:358: gladiator/scholar/crappy tailpiece or teflon swim fins.
- `if_equip(it)` G:315: `"<it>,"` if `available_amount>0`; for baseball diamond / peridot / heartstone / BCZ it first empties the codpiece (`codpiece("none")`).
- `codpiece(str)` G:273: loads named items into Eternity Codpiece slots via choice 1588, or empties it.

### Free-kill ladder

**Equipment side — `freeKill()` G:459-476** (returns an equip term; mid branch):

1. Everfull Dart Holster if no _Everything Looks Red_ and holster owned.
2. _(high only: jurassic parka dilophosaur if no Everything Looks Yellow; then return "")_.
3. Sheriff moustache+badge+pistol if `_assertYourAuthorityCast<3` AND `my_location()` ∈ {Octopus's Garden, Gymnasium, Caliginous Abyss} — NB `my_location()` is the _previous_ zone at outfit time.
4. Lil' Doctor™ bag if `_chestXRayUsed<3`.
5. blood cubic zirconia if `(submoxie − 22500) > BCZcost("SweatBulletsCasts")` (G:442).
6. else "".

**Combat side — `free_kill(ptext, drop)` CCS:6-70** (mid branch; high returns after darts):

- Skip entirely if the fight is the curveball "some fish" (CCS:15).
- Skills in order, each only if present on the page: Spit jurassic acid, Assert your Authority, Club 'Em Back in Time (**colosseum only**, not low, not when `drop`, `<5` uses), Darts: Aim for the Bullseye, BCZ: Sweat Bullets (stat threshold), Chest X-Ray, Shattering Punch, Gingerbread Mob Hit. In the colosseum every skill but Club 'Em is skipped (CCS:33).
- Items: shadow brick (`_shadowBricksUsed<13`), groveling gravel (not when `drop`); both skipped in the colosseum (CCS:47-57).
- Last resort: **Use the Force** if `saberForcesFree()>0`, saber equipped and offered (CCS:63-69).

### Free-run ladder

**Equipment side — `freeRun()` G:478-496**: spring shoes (no Everything Looks Green) → greatest american pants (`_navelRunaways<3` AND Waterproofly) → V for Vivala mask (`_vmaskBanisherUsed` false) → latte lovers member's mug (`_latteBanishUsed` false) → **switches familiar** to Pair of Stomping Boots if `(weight+adj)/5 > _banderRunaways` → else `freeKill()`. `delay()` G:498 = latte mug + freeRun() when Kramco owned.

**Combat side — `free_run(ptext, banish)` CCS:74-107**: skip on curveball fish; `runaway()` if GAP equipped and `<3` navel runs; skills in order (only if on page): spring away (with `banish` → casts **spring kick** first), Bowl a Curveball*, creepy grin, Throw Latte on Opponent*, Release the Boots, Feel Hatred*, snokebomb* (_ = only when `banish`; snokebomb skipped if already used at this location, and **returns** without running in the three guild zones CCS:86-89). Items: glob of Blank-Out, peppermint parasol (`parasolUsed<3`), anchor bomb_, stuffed yam stinkbomb*, handful of split pea soup*, mer-kin pinkslip (mer-kin phylum only), ink bladder.

### Banish ladder

- `banMap` G:1666-1673: spring shoes → "Spring Kick"/`spring kick`; monodent → "Sea \*dent"/`Throw a Lightning Bolt`; Heartstone → "Heartstone"/`Heartstone: %banish`; none → snokebomb.
- `banishGear(loc)` G:1703-1720: first of spring shoes, monodent, Heartstone (heartstone needs `heartstoneBanishUnlocked`) whose current banished monster has 0 appearance rate at `loc`; sets `<slot>Override` pref as a side effect.
- `combatBan()` G:1724-1736: first _equipped_ of those three whose banished target no longer appears here → its skill.
- Zone-specific banish calls live in the CCS (Fitz scavenger/mine crab CCS:589-599; corral CCS:818-826, 864-899; school spring kick CCS:960-967; library alphabetizer CCS:1033; eagle screech at Madness Bakery CCS:526).

### NC-force ladder — `NCforce()` G:1569-1615

Only when `noncombatForcerActive != true`:

1. Apriling band tuba (`_aprilBandTubaUses<3`, helmet + tuba owned) → `aprilband play tuba`.
2. Cincho de Mayo if `_cinchUsed<=40` or free rests remain: free-rest (with Apriling helmet if owned) until cinch ≤40, equip cincho acc3, **Cincho: Fiesta Exit**.
3. Eight Days a Week Pill Keeper free pill → `pillkeeper free noncombat` (Sneakisol) if `_freePillKeeperUsed` false.
4. Only if NO duffel bag, NO jurassic parka, NO allied radio backpack: pull one of Handheld Allied radio (`alliedradio misc sniper`), Clara's bell (only if already in storage; `use`), stench jelly (`chew`).
   `NCForceEstimate()` G:1505-1517: 2 + tuba charges + left-ski avalanche charges (3−used) + Cincho `min(3, 1+freeRests/2)` + parka spikolodon charges (5−used). Deliberately excludes the pill keeper.
   Combat-side forcers: `Launch spikolodon spikes` / `MCHUGELARGE avalanche` in the gymnasium while skate war is on (CCS:1067-1070); `parka spikolodon` / `mchugelarge left ski` pinned by `gymnasium()` (UTS:651-659); `alliedradio sniper` in `skatePark()` (UTS:677).

### Saber Force budget — G:918-946

5 charges (`saberChargesLeft`). Claims in priority: **2 for unholy diver** while `diverHuntActive()` (rivets<8 and no helmet, G:892); **1 for Mer-kin healer** while prayerbeads<3; **1 for sea cow** while `seaCowNeeded()` (leather+chaps+hat<2 or cowbell<3, G:905); the remainder is `saberForcesFree()` (researcher scrolls, last-resort free-run). `saberZone()` G:872 excludes the Outpost. CCS entry points: `diverForce` G:951, `healerForce` G:995, `seaCowForce` G:972, `researcherForce` G:1019 — all fire at the top of every consult pass (CCS:455-465) before anything else can end the fight.

### Copies / summons

- `summon(mon)` UTS:936-974: Combat lover's locket (`reminisce`, if monster in locket, not fought today, <2 used) → fax (`faxbot` ×3 tries, `_photocopyUsed` false) → chest mimic egg (`c2t_megg extract/fight`, mimic exp>200; abort if extract fails) → pocket wish (`genie monster`; an AT with Just the Facts farms one from the Overgrown Lot first). Returns false if none available. `count_summons()` G:89: fax + (3−lockets used) + floor(mimic exp/200).
- backup camera: outpost golem chain (CCS:687-694, 705-708), corral first turn (CCS:760-767), school/library backup to a free monster (CCS:968-981, 1041-1045).
- RECALL FACTS: MONSTER HABITATS: on abyss monsters (CCS:934-937), on golem (CCS:673-675, 1166-1168). Blow the Purple Candle on golem (CCS:669-672).
- Duplicate (Source terminal) `duplicateMonster` G:1060: golem (<4 shavings), unForced sea cow, monitor during sheet grind, saberless diver.
- Feel Nostalgic G:1450: diver/sea cow/monitor tables, only when not about to Force.
- Lecture on Relativity G:1273: Pocket Professor chains diver / sea cow.
- Time-Spinner `timeSpinnerFight`/`timeSpinnerRefight` G:1186-1233: refight `zoneTarget` monster for 1 turn right after fighting it; only in Fitz, Garden, Corral, School.
- Map the Monsters `mapMonster` G:1162: 3/day, same 4 zones, only after the Peridot has been spent in that zone; answered in Choice:245 (1435) from `wantedMonster` G:831. Peridot answered in Choice:281 (1557) from the same table (`zoneTarget` G:851: school → monitor 852 while cheatsheets needed).
- Spooky VHS tape: thrown on slithering thing / eye / school of many while mom<36 (CCS:928-933); follow-up fought from `post_adv` (UTS:366-374) and recording window (UTS:377-386).
- Club 'Em Into Next Week on golem (CCS:1175); follow-up from `post_adv` UTS:389-397.
- Sword of S Words: `%fn, kill a lot of these guys` on flytrap / sea cow / sea cowboy (CCS:563, 757, 1192).

### Wishes / paw / pulls

- `monkeypaw(it)` UTS:836-845: `monkeypaw item <it>` if paw owned and <5 wishes; else loop `getMissingCorralItems()` + dolphin whistle until owned.
- `farmPrayerbeads()` UTS:1012-1031: paw wish for prayerbeads first; else -combat outpost trip with `healerSaber()`.
- Rivet paw wish: UTS:1460-1463 when 6-7 rivets.
- `pullSequence(it)` G:233-247: no-op if 0 pulls or already pulled today; mall-buys into storage (confirm if over autoBuyPriceLimit) then `take_storage`. `reservedPulls()` G:189-231 holds slots for: parasol/navel/GAP (1), crayon shavings<9 (1), pinkslip, prayerbeads<3, cowbell<3, ink bladder, comb jelly, skate blade (while war open), null-day exploit (while `shubPrepShort`).

### Fishy ladder — `post_adv()` UTS:304-331 (path 55)

When `Fishy` is 0: (1) **fishy pipe** if pipe owned AND pay phone in inventory AND monodent AND PYEC owned AND `_fishyPipeUsed` false AND not low → pull if needed, use. (2) `highShiny() || (lowShiny() && !pulledToday(sardines))` → pull cheapest pasta (G:30) + eat, pull Aldebaran sardines + eat (**never at mid**). (3) `!pulledToday(fish sauce)` → pull + chew. (4) else `retrieve_item(white rice)` + `eatSushi()` (G:635: beefy/glistening/slick nigiri). Abort `acquire fishy failed` if still 0. **Mid order: pipe → fish sauce → sushi.**

### Yellow ray

`yellowRayPrep()` G:433-440: if no Everything Looks Yellow: `parka dilophosaur` + equip parka, else craft a spitball from April Shower globs. Fired in combat by `Spit jurassic acid` (free_kill list) or spitball on the diver (CCS:1185). Eagle `fire a Red, White and Blue Blast` on the flytrap (CCS:560).

### Choice handling summary (Choice:37-326)

1 → 299,303,403,701,1468,1471-1473,1475,1556,1564-1566; 2 → 804,1469,1470,1474,1494,1497; 3 → 1340,1387,1467; 4 → 705; 5 → 1599; 1059 → 1 if unset; 1588 back out; 1596 spade (3 if skeleton offered else 4); 312 → 3 if intenseCurrents; 313 burglar 1→3→2, 314 raider 1→2→3, 315 healer 3→1→2 (or currents: beads<3 → 3, killscroll → 1, healscroll → 2, else 3); 396-401 school queue (399/400 → 1 + `NCtoC=true`, 401 → 2); 703 dreadscroll submit (guesses pro7 4→1); 704 dread card spading; 1435 Map → `zoneTarget`; 1483 → 1,3; 1500 rift (2, or 3 if forest unlooted with Shadow Waters); 1525 dart perks; 1557 peridot → `zoneTarget` (+ option 2 at corral); 1562 Möbius meat priority.

---

## 2. Ordered run plan

### S1. Preflight (UTS:412-462)

- Phase/quest: initialization
- Runs when: always
- Loop until: n/a
- Location / activity: revision ≥29057 check; `_utsPearlFarm=false`; chosen-familiar +item confirm (UTS:419-427); `autoSatisfyWithNPCs` must be true; `iotmChecklist()`/`skillChecklist()`/`pullChecklist()` (G:1949, 2097, 2115); write CCS `temp` = `consult UnderTheSeaCCS.ash`; `battleAction=custom combat script`; visit Old Guy if `questS01OldGuy` unstarted; `blackGlass()` (UTS:173) if no black glass and >13 sand dollars; **photo booth**: join clan 90485, borrow sheriff pistol/moustache/badge, rejoin home clan; abort if any missing.
- Outfit: none; Familiar: none; Effects/mood: none
- Choices: none
- Combat: none
- Free resources spent here: 3 photo-booth prop borrows
- Expected turns: 0
- Tier notes: none

### S2. Daily items, skills, IOTM setup (UTS:464-572)

- Phase/quest: initialization (path 55)
- Runs when: `my_path().id == 55`
- Loop until: n/a
- Location / activity: Toot (council → tutorial toot → council if `questM05Toot` started); use letter from King Ralph, pork elf goodies sack, sushi-rolling mat, 2002 Mr. Store Catalog (skip if credits collected); cast **Aug. 24th Waffle Day** (mid: yes) and Summon Kokomo Resort Pass; `sourceEnhance()`; `sourceEducate()` (duplicate.edu, G:1053); `cargoPocket()` 494 (G:1536); `garbageTote()` (G:1316, grabs broken champagne bottle); `censer()` (G:1931, Septapus charms); saber daily upgrade choice 1386 → 4 (familiar weight); autosell hamethyst/baconstone/porquoise(unless pantogram)/kokomo pass; tiny stillsuit on Tickle-Me Emilio; **Mayam rings** with chest mimic (`vessel yam cheese explosion; fur lightning eyepatch yam; eye meat yam clock`); **Leprecondo** mid `"22,24,12,11,10,4,5,6"` (G:1815); campground leaves; S.I.T. certificate; **Apriling band**: tuba, then (mid) piccolo with chest mimic played ×3; duffel bag; April Shower globs; **2002 credits** (mid): 1 pro skateboard + 2 Spooky VHS Tapes.
- Outfit: n/a; Familiar: chest mimic for Mayam/piccolo, Emilio for stillsuit
- Choices: 1386 → 4 (else 5)
- Combat: none
- Free resources spent: daily summons/casts above
- Expected turns: 0
- Tier notes: high skips Waffle Day, uses quad tom instead of piccolo, makes 3 VHS tapes, leprecondo `"10,11,12,24,4,5,6"`

### S3. Workshed (UTS:574-590)

- Runs when: `_workshedItemUsed` false and no workshed installed
- Activity: Asdon Martin keyfob → portable Mayo Clinic → model train set → TakerSpace letter of Marque (+ craft anchor bomb)
- Expected turns: 0; Tier notes: none

### S4. Storage pulls (sea gear) (UTS:592-619)

- Runs when: each item not owned and not pulled today
- Activity: pull mer-kin sneakmask, sea lasso (skip if low, or SWord owned with ≥3 summons), shark jumper, ten-leaf clover, large box, scale-mail underwear (skip if Kramco owned, G:144), Congressional Medal of Insanity (**abort if not in storage** — never mall-bought), Flash Liquidizer Ultra Dousing Accessory (only with pay phone). Mall-buy into storage if absent. Craft + use blessed large box.
- Free resources: up to 8 pulls
- Tier notes: low skips the lasso pull. (UTS:621-626 Asdon soda-bread refuel is path-0 only.)

### S5. SWord early lasso (UTS:1090-1098, called UTS:1517)

- Phase: seaMonkees start
- Runs when: SWord familiar owned, `count_summons()>=3`, `swordOfSWordsMonster<10`, AND (`highShiny()` OR no pay phone). **Mid with a pay phone: skipped.**
- Activity: `summon(sea cowboy)` with SWord out; `"item drop"` + baseball_equip + freeKill; mood itdrop; `recover hp`.
- Combat: sea cowboy monster case CCS:1191 → `%fn, kill a lot of these guys`, free_kill(drop), cleanUp.
- Tier notes: high runs it whenever summons allow.

### S6. Guild unlock (UTS:1101-1146)

- Phase: guild unlock (for shadow bricks)
- Runs when: `questG03Ego` unstarted, pay phone in inventory, path 55, `!highShiny()`
- Loop until: `questProp[ps]` (G07/G08/G09) != "started"
- Location: `questLoc[ps]` — Haunted Pantry (mys) / Sleazy Back Alley (mox) / Outskirts of Cobb's Knob (mus). Moxie with tearaway pants skips the grind (equip + `guild.php?place=challenge`).
- Outfit: `"item drop"` monodent + Möbius ring + everfull dart holster + toy cupid bow + (greatest american pants [pulled] | navel ring | designer sweatpants) + `delay()`; Familiar: SWord if `doSWord()` → Artistic Goth Kid → snapper (`snapper fish`) → -combat; mood itdrop; uses `adv1` (no post_adv).
- Choices: none specific
- Combat CCS:505-521: curveball fish → Talk to Some Fish + cleanUp; non-free monster → `free_run(false)` then `runaway()` if GAP/navel ring equipped; Talk to Some Fish; Prepare to reanimate your Foe; darts; cleanUp.
- Free resources: free runs (GAP navel runaways, spring shoes, etc.), darts
- Expected turns: until quest step completes (not inferable)
- Tier notes: high skips entirely. Then `guild.php?place=ocg` ×2 (UTS:1141-1144).

### S7. post_adv priming (UTS:1521)

- One `post_adv()` call (see §3) — restores fishy/Waterproofly/HP etc. before the first adventure.

### S8. Flytrap pellet — SWord → skeleton store (UTS:1151-1181)

- Phase: flytrap pellet (Sea Monkees start), quest `questS02Monkees` unstarted
- Runs when: `!highShiny()` AND SWord familiar AND archaeologist's spade available
- Loop until: (a) `swordOfSWordsMonster == "740"` (Neptune flytrap) — adventure in Octopus's Garden with SWord, `"item drop"` trunks + peridot + baseball + cupid bow + freeKill; (b) no pellet → Skeleton Store (talk to meatsmith, answer choice 1059) until pellet; (c) `_archSpadeDigs<11` → use spade (choice 1596 → 3 if skeleton offered); re-adventure store if the dig didn't count.
- Combat: garden CCS:556 (see S10); skeleton store CCS:502 → cleanUp.
- Tier notes: high skips.

### S9. Flytrap — Patriotic Eagle citizen/RWB (UTS:1183-1192)

- Runs when: eagle owned and no pellet
- Loop until: `Citizen of a Zone` or `Everything Looks Red, White and Blue` present
- Location: Octopus's Garden; Familiar: patriotic eagle; Outfit `"item drop"` trunks + baseball + cupid bow + freeKill + peridot (if garden not yet periled)
- Combat CCS:557-561: pledge allegiance if no Citizen; on flytrap: RWB Blast.

### S10. Flytrap main loop (UTS:1193-1217)

- Loop until: wriggling flytrap pellet in inventory; then `use` it
- Location: An Octopus's Garden
- Outfit: `"item drop"` trunks + cupid bow + freeKill + (McHugeLarge left pole if `rwbMonsterCount<=1` and flytrap untracked, else baseball_equip) + Sheriff trio if `_assertYourAuthorityCast<3` (+ monodent at high when rwbMonsterCount 0 and no map); Familiar itdrop
- Choices: 1557 peridot → 740; 1435 map → 740
- Combat CCS:556-582: flytrap → RWB blast, SWord kill-a-lot, darts, olfaction/Mating Call/McHugeLarge Slash if untracked, `free_kill(drop=true)`, cleanUp; other non-free → `free_run(banish=true)` (high: spring kick + Talk to Some Fish); cleanUp.
- Free resources: Peridot (via 1557), `mapMonster` when rwbMonsterCount==0, `timeSpinnerRefight` after each adv, Assert your Authority ×3, free kills, banishes/runs on non-flytraps, Kramco off-hand.
- Expected turns: until drop (not inferable)

### S11. Castle intro (UTS:1525-1528)

- while quest == "started": equip trunks, `monkeycastle.php?who=1`.

### S12. Wreck of the Edgar Fitzsimmons (Little Brother) (UTS:1220-1233)

- Phase: Wreck (step1); Loop until: `questS02Monkees != step1`
- Location: The Wreck of the Edgar Fitzsimmons
- If `NCForceEstimate()>=4`: `NCforce()` if none active; `"item drop, -equip peridot of peril"` trunks + bathysphere(none) + Möbius. Else: -combat familiar, `"-combat, -equip peridot of peril"` monodent + trunks + Möbius + cupid bow, mood -combat.
- Combat CCS:583-613: non-diver non-free → `free_run(banish)`; scavenger → spring kick / Lightning Bolt + Talk to Some Fish; Mine crab → Heartstone banish + Lightning Bolt; diver → camel spit, Use the Force if saber equipped; feelNostalgic; darts; `free_kill(drop)`; cleanUp. Preamble: `replaceEnemy` re-rolls non-diver non-free monsters while rivets<8 (G:1432).
- Free resources: one NC forcer (tuba/Cincho/Sneakisol/pull ladder), free runs, Macrometeorite/CHEAT CODE re-rolls
- Tier notes: none

### S13. Big Brother / step2 (UTS:1532-1536)

- If step2: trunks, `monkeycastle.php?who=2`, `who=1`.

### S14. Grandpa (step4 pearl-zone hunt) (UTS:1235-1268)

- Runs when: step4; Loop until: step != step4
- Location: `pearlLoc[ps]` — Marinara Trench (mys) / Dive Bar (mox) / Anemone Mine (mus)
- Setup: -combat familiar; pull + use mer-kin hidepaint if no Colorfully Concealed (mid). Per turn: SWord if `doSWord()` (mid: only without pay phone & lasso<4) else itdrop; baseball_equip if <9 players and diamond, else McHugeLarge left pole if squid/tippler untracked; `baseballD()` if 9 players and innings≤2; BCZ if sweat bullets<9; `mood(pearlRes[ps])`; `"item drop, -100 combat"` monodent + trunks + freeRun + Möbius + cupid bow + conditional; mood -combat.
- Combat CCS:614-658: lasso throw if hat+chaps worn; miner → steal + swoop like a bat; squid/tippler untracked & corral unstarted → olfaction/Mating Call/Slash; free monster → Refracted Gaze + cleanUp; curveball → Talk to Some Fish; non-target (or squid with comb jelly, or miner with digpick) → cosmic bowling ball run, Talk to Some Fish, darts, `free_run(banish)`, cleanUp; target → `free_kill(drop)`; cleanUp.
- Free resources: free runs/banishes on non-targets, olfaction, BCZ sweat bullets
- Tier notes: low skips hidepaint.

### S15. Grandma (step5) (UTS:1541)

- `grandpa grandma` CLI.

### S16. Golem recall (UTS:1270-1281)

- Runs when: step6, `_monsterHabitatsMonster == ""`, path 55, `!highShiny()`, Just the Facts
- Activity: itdrop fam (snapper → `snapper construct`) else -combat; `"item drop"` legendary seal-clubbing club + left pole + cupid bow; `summon(black crayon golem)` (locket → fax → egg → wish).
- Combat CCS:1165-1181: RECALL FACTS habitats (fightsLeft 0, recalled<3); Mating Call / McHugeLarge Slash + Club 'Em Into Next Week if not tracked; cleanUp. Duplicate fires if shavings<4 (G:1074).
- Free resources: 1 summon, 1 habitat recall (→ 5 golem fights at the Outpost), Duplicate, Club 'Em Into Next Week
- Tier notes: high skips.

### S17. Mer-kin Outpost (stashbox / lockkey / golem chain) (UTS:1283-1370)

- Phase: Outpost; Loop until: `(stashbox owned || corralUnlocked) && quest ∉ {step6,step7,step8}`
- Pre-loop: `pillKeeper("free familiar")` if `NCForceEstimate()>=5` and Waterproofly up.
- Per iteration: `baseballD()` if no Steely-Eyed Squint, estimate<4, 773 in lineup, 9 players. Inner `recallCaliginous()` loop (UTS:1298-1306) only when `!MomNCyber()` (eagle+key+Overclock+JtF), `lassoShadow()`, recalled==2, fightsLeft 0, mom<40, step9-12 — i.e. dumping abyss habitat fights into the outpost. `stashboxChecked` reset to "0" while turns_spent<5; abort if 1,2,3 all checked.
- Familiar: eagle if fightsLeft==1 & recalled==2; SWord if `doSWord()` & turns<26 & (fightsLeft 0 or shavings≥9); itdrop if (high‖low‖no pay phone) & pristine<6; **else -combat (mid with pay phone)**.
- Outfit: roman candelabra if fightsLeft 1 & no Everything Looks Purple & recalled 2, else baseball_equip; backup camera if lastCopyable=golem & backups<7 & (turns<26 or lockkey monster set), else BCZ (sweat<9), else CMOI; shark jumper+pants+elf guard scuba if habitat monster is eye/slithering with fights left, else trunks. If `merkinLockkeyMonster != ""`: mood -combat, `"-combat"` monodent + bathysphere(none) + freeRun + conditional; else `"item drop"` monodent + cupid bow + conditional + freeKill. `grandpa note` when note + both yarns held.
- Choices: 313/314/315 stashbox priority (Choice:116-134)
- Combat CCS:660-729: time cop → darts+cleanUp; golem → Purple Candle / RECALL habitats / eagle screech, darts, cleanUp; turns<24 or lockkey set: backup camera to golem when habitat fights are 0 and recalled≥2 (`Back-Up` + run_combat); Talk to Some Fish path for pristine scales at high/low/no-phone; **healer with <2 beads**: Talk to Some Fish (if diamond/curveball), `free_kill(drop)`, backup camera copy, `free_run(false)`, cleanUp; burglar/raider → Lightning Bolt (high/no-phone SWord) + `free_run(banish)`; non-free → `free_kill(false)`; cleanUp. turns≥24 & no lockkey: burglar/raider free_run(banish), free_kill (drop only for bead-short healer), cleanUp. Preamble `healerForce` Forces the healer while beads<3 and `forcesAfterDiver()>0` (G:995).
- Free resources (order): Sneakisol/Fidoxene pill, habitat golem fights, backup camera (≤7), Force on healer, free kills, free runs/banishes, baseball diamond
- Expected turns: code gates at 5 / 24 / 26 / 29 turns_spent
- Tier notes: low/high use itdrop familiar+mood instead of -combat.

### S18. Stashbox → trailmap → currents (UTS:1552-1557)

- If exactly 1 stashbox: use it, use trailmap, trunks, `grandpa currents`. Choice 312 → 3 when `intenseCurrents`.

### S19. Early prayerbeads (UTS:1560-1562, 1007, 1012)

- `pullPrayerbead()` (1 pull if beads<3); then `while NCForceEstimate()<4 && beads<2` → `farmPrayerbeads()`: paw wish if <5 used, else -combat outpost with `healerSaber()` + trunks + cupid bow, mood -combat.
- Free resources: 1 pull, paw wishes, healer Force.

### S20. Old Guy / black glass (UTS:744-753, called 1565)

- Runs when: `questS01OldGuy == started`
- Loop until: 50 sand dollars via `getSandDollar()` (UTS:731): thingpouches → water-logged pill for 100 sand pennies → damp old wallet pull → `getLucky()` + Outpost adventure. Then `blackGlass()`, buy damp old boot, claim reward 6313.
- Free resources: 1 pull (wallet), Lucky! (Aug 2nd / heartstone / 11-leaf clover, G:249)

### S21. Rivet hunt — summoned divers (UTS:1372-1466)

- Phase: diving helmet; Runs when: (rivets<8 OR no porthole OR no broken helmet) AND no helmet in hat slot AND `count_summons()>=1` AND `!highShiny()`
- Setup: mood itdrop; `shadowRift()` (UTS:847) if no Shadow Waters (first rift visit: use pay phone, `NCforce()`, adv1 rift, Sea \*dent wave, pay phone again, adv1).
- Diver #1 (no porthole): familiar chest mimic if `diverForceReady()` (else Jill if ≥8 ballplayers, else mimic); `"item drop"` `diverSaber()` + BCZ + cupid bow + baseball diamond; if not Force-ready → `yellowRayPrep()` + mood superitdrop; `summon(unholy diver)`.
- `baseballD()` if 9 players & 745 in lineup. Divers #2..n while short and `diverTries<4`: mimic egg fight (if egg holds 745) → `timeSpinnerFight(diver)` → another `summon()` → break.
- Paw wish rusty rivet while 6-7 rivets; `pullSequence(rusty rivet)` if <8 and not pulled.
- Combat: preamble `diverForce` (lay egg with mimic, Use the Force) G:951; monster case CCS:1182 → lay egg, spitball, `free_kill(drop)`, cleanUp; otoscope G:1483; Duplicate on saberless kits.
- Free resources (order): 2 saber Forces, summons (locket/fax/egg/wish), mimic egg, Time-Spinner, paw wish, 1 pull, Steely-Eyed Squint, yellow ray
- Expected turns: 0-4 (summons are free; Time-Spinner refight costs 1)
- Tier notes: high takes the Fitz branch below.

### S22. Rivet hunt — Fitzsimmons farming branch (UTS:1467-1511)

- Runs when: no summons (or high)
- Setup: itdrop; if `NCForceEstimate()>=7` → `NCforce()` + one `"-combat"` Fitz adventure. Loop until rivets≥8 & broken helmet & porthole: abyss-habitat gear or trunks; `saberEquip`/`cloakeEquip`/`champagneEquip`/`gloveEquip`(Fitz); `professorFamiliar()`; within 20 turns of `_lastFitzsimmonsHatch` → itdrop + spring shoes/heartstone + `"item drop"` monodent + CMOI + peridot; else `"-combat"` monodent, mood -combat. `mapMonster`, adv, `timeSpinnerRefight`.
- Combat: S12 handler. Finally `retrieve_item(aerated diving helmet)` (UTS:1510).

### S23. Mom rescue — construct banish (UTS:1614-1626)

- Runs when: `momSeaMonkeeProgress<24` AND eagle AND server room key AND construct not in `banishedPhyla`
- Location: Madness Bakery (unlock via armory talk) while turns_spent<3; eagle; `"item drop"` monodent
- Combat CCS:523-530: abort without eagle skill; Release the Patriotic Screech; Talk to Some Fish; free_kill; cleanUp.
- Free resources: eagle screech (phylum banish)

### S24. Mom rescue — habitat recall + Cyberzone (UTS:1627-1639)

- `recallCaliginous()` (UTS:702) while habitat monster ∉ {eye, slithering} & recalled<3 & JtF: black glass, -combat fam, `"item drop"` helmet + shark jumper + pants + black glass + peridot + monodent + freeKill; comb jelly pull/use; adv Abyss.
- Cyberzone 1 while fightsLeft>0 & `_cyberFreeFights<10` & mom<40: Glover, `"moxie"` shark jumper + pants + monodent; **abort if moxie<500**.
- Combat CCS:737-744: eye/slithering → Throw Cyber Rock until dead; else Lightning Bolt. Abyss CCS:916-946: VHS tape on eye/slithering/school while mom<36; RECALL habitats on eye/slithering; school of many → Lightning Bolt + garbage nova ×4; `free_kill(false)`; cleanUp.
- Free resources: habitat recalls (≤3), 10 free cyber fights, VHS tape
- Tier notes: high uses SWord/Corral route (UTS:1583-1613) instead.

### S25. Mom rescue — finishCaliginous fallback (UTS:1641-1643, 721)

- Runs when: mom < `initialMomProgress` (24, +4 without backup camera, +12 without catalog) AND (no eagle OR no key)
- Location: Caliginous Abyss; itdrop; `"mys"` shark jumper + pants + black glass + CMOI + helmet + bathysphere(none) + BCZ + monodent (unless school banished).

### S26. One-turn Coral Corral (seahorse scout) (UTS:1647-1679)

- Runs when: corralUnlocked, corral turns_spent==0 (or last monster wild seahorse), no seahorseName, path 55, `!highShiny()`
- Setup: `shadowRift()` if no Shadow Waters (mid); itdrop (`snapper mer-kin`); unequip peridot; `codpiece("blood cubic zirconia, heartstone")`; superitdrop if squint unused; pull pro skateboard. Branch: backup camera + lastCopyable ∈ {eye, slithering} → `"item drop, sea, -equip peridot"` shark jumper + pants + helmet + skateboard + codpiece + backup camera; else squint+paw → pull software glitch, `"item drop, sea, -equip peridot"` helmet + skateboard + codpiece; else pull yellow taffy + software glitch (+ stinkbomb if no spring shoes/heartstone), `"item drop"` helmet + skateboard + codpiece + monodent + baseball.
- Combat CCS:754-791 (first-turn branch): backup camera → rustler spring kick, Back-Up, Refracted Gaze, epic McTwist, free_kill(drop); else rustler → spring kick/Talk to Some Fish/Gaze/McTwist/yellow taffy; seahorse → runaway; software glitch → Bugged bugbear (Gaze, McTwist, taffy) else abort; free_kill(drop); cleanUp.
- Free resources: backup camera copy, McTwist, Refracted Gaze, pulls (skateboard, glitch, taffy)
- Expected turns: 1

### S27. Lasso stock (no paw) (UTS:1680-1687)

- Runs when: lasso<5 and training<20; loop `while !paw && lasso<6` → `getMissingCorralItems()` + dolphin whistle. **Mid with a paw: loop body never runs**; `codpiece("none")`.

### S28. Corral: leather → sea chaps / cowboy hat (UTS:1692-1713, 794-834)

- Phase: corral (leather / cowbell); Loop until: chaps (or a tailpiece) and cowboy hat exist; each needs 1 sea leather → `create`.
- `getMissingCorralItems()` per turn: itdrop; `pillKeeper("free familiar")` if estimate≥4; `professorFamiliar()`; `banishGear(corral)` while rustler unbanished (or a done cowboy/cow unbanished); saber/cloake/champagne equip; `"item drop"` really nice swimming trunks + legendary seal-clubbing club + cupid bow + conditional; `choiceAdventure1589 = 1&victim=775` (sea cow) while cow needed else `776`; `yellowRayPrep()` once `forcesAfterHealer()<=0`; mood itdrop; `mapMonster`; adv; `timeSpinnerRefight`; `baseballD()` if 775 in lineup, 9 players, cowbell<3.
- Choices: 1557 → 775 (+2), 1435 → 775, 1589 victim
- Combat CCS:860-913 (grind branch): seahorse → runaway; rustler → `combatBan()` or `free_run(banish)` then `rerollEnemy`; done cow / done cowboy → same; feelNostalgic; Club 'Em Across the Battlefield (club equipped, <5, !NCtoC); cleanUp. Preamble: `seaCowForce` (needs cow, forcesAfterHealer>0, McTwist spent or skateboard off, not first turn), Duplicate on cow, Lecture on Relativity.
- Free resources: sea-cow Force (1), Duplicate, professor lectures, champagne, banishes (spring kick / lightning bolt / heartstone / snokebomb…), re-rolls, Map, Time-Spinner, yellow ray, baseball

---

`sorceress()` begins (UTS:2368).

### S29. Shadow rift prep (Rufus quest) (UTS:2371-2384)

- Runs when: `encountersUntilSRChoice>9` & `questRufus` unstarted & pay phone in inventory
- Activity: retrieve oversized sparkler; use lump of loyal latite; `"item drop"` FLUDA + monodent + bat wings + dart holster + cupid bow; mood itdrop; use pay phone (mid).

### S30. Curveball burn (UTS:2386-2391, 902-932)

- Runs when: `_curveballFightsLeft>0` and monster "some fish" and no digpick → one `curveballBurn()`; then loop while curveball & no PYEC.
- `curveballBurn()`: first un-periled of Anemone Mine (spookyres) / Marinara Trench (hotres) / Dive Bar (sleazeres) with codpiece BCZ+peridot, `"<elem> res"` trunks + codpiece + monodent; else Outskirts with monodent. `adv1` (no post_adv); `codpiece("none")` after.

### S31. Teflon ore — digpick + Unaccompanied Miner (UTS:2395-2421)

- Phase: teflon ore; Runs when: no teflon ore AND `tailpiece()==none`
- Digpick: pull if `pulls_remaining()>reservedPulls()` (mid); else Anemone Mine with peridot (miner 765) under `"item drop"` really nice swimming trunks + peridot (only if item drop>250 or with bat wings), then pull.
- `teflon()` (UTS:630) ×5 while `_unaccompaniedMinerUsed<5`: equip digpick + trunks, itdrop, `mining.php?mine=3&which=mineNum()` (G:578 spot picker; aborts if none), restore HP, liftBeatenUp, post_adv.
- If still none: pull + use lodestone.
- Combat (mine): S14 handler; miner → steal.
- Free resources: 5 free mining trips, 2 pulls (digpick, lodestone), peridot

### S32. Platinum Yendorian Express Card (UTS:2424-2429)

- `expressCardUsed` false, owned, `!highShiny()` → take from storage if needed, use.

### S33. Lasso training via shadow rift (UTS:2432-2439, 847-898)

- Phase: lasso training; Loop until: `lassoTrainingCount>=20` (while affinity up or not yet triggered today, pay phone owned, `!highShiny()`); then a second loop drains affinity when `my_turncount()>25` or no crystal ball.
- `shadowRift()`: with Shadow Waters: re-use pay phone for Rufus when `encountersUntilSRChoice>9`; `monkeypaw(sea lasso)` if none; Jill else itdrop; `"item drop"` FLUDA + monodent + **sea cowboy hat + sea chaps** (while training<20) + bat wings + dart holster + cupid bow + baseball; mood itdrop; `adv1` rift; extra adv1 + Sea \*dent wave if unused; adv1 at `encountersUntilSRChoice==0`.
- Choices: 1500 (2 / 3 forest)
- Combat CCS:532-554: moxie → steal; lasso throw when wave used & training<20; shadow slab → Septapus charm, swoop like a bat, Perpetrate Mild Evil, douse foe ×3; tumbleweed → abort; Talk to Some Fish when can't steal or pristine<6; darts; cleanUp.
- Free resources: shadow affinity (free rift fights), FLUDA douse, Septapus charms, paw wish for lasso
- Tier notes: high skips (SWord lasso instead).

### S34. Teflon second attempt (Loded) (UTS:2442-2452)

- While `Loded` and no ore → `teflon()`; if still none: prints "can pull mining dynamite" then **`while (ore==0) teflon()` — unbounded real-turn digs**.

### S35. Backup lasso training (UTS:2456-2459, 988-1001)

- While training<20: `backupLasso()` — pull elf guard scuba; `monkeypaw(sea lasso)`; itdrop; `pearlRes[ps]` maximize with scuba + monodent + hat + chaps; adv `pearlLoc[ps]` (CCS throws lasso when hat+chaps worn, CCS:618).

### S36. Cowbell / lasso top-up (UTS:2461-2479)

- `wantCowbell` = 2 if no paw (or high); if `_monkeyPawWishesUsed>3` → `2-(5-used)`; loops `getMissingCorralItems()` + whistle while cowbell<want or lasso==0 (no seahorse yet).

### S37. Seahorse taming (UTS:2482-2532)

- Phase: seahorse taming; Loop until: `seahorseName != ""`
- Per turn: pull sea cowbell if <3 and not pulled; itdrop; peridot if corral (199) not periled; no august scepter → pull waffle, monodent, heartstone; else crystal ball if owned; monodent if curveball; **tearaway pants + helmet** once rustler, cowboy and cow are all banished, else trunks; `"initiative, sea"`. `monkeypaw(sea lasso)` until 1; `monkeypaw(sea cowbell)` until 3 (abort `need more cowbells`). adv corral. Crystal-ball non-seahorse prediction → `shadowRift()` to burn affinity.
- Combat CCS:747-753: wild seahorse with 3 cowbells + lasso + training 20 → `cowbell,cowbell` then `cowbell,lasso`; abort if fight continues. Taming branch CCS:792-859: plant → Tear Away your Pants; banish block (skip un-done cowboy/cow): curveball fish, `free_run(banish)`, rustler → heartstone, cowboy/cow → Lightning Bolt; waffle throw summons seahorse; `free_run(false)` unless cowboy-without-lasso / undone cow; `free_kill(false)`; cleanUp.
- Free resources: paw wishes (lasso, cowbell), 1 cowbell pull, waffle pull, banishes, crystal ball, shadow affinity burn
- Expected turns: 1 per corral visit until seahorse

### S38. Drain shadow affinity (UTS:2536-2547)

- While affinity>0: curveballBurn while curveball fish; `shadowRift()`. adv rift at `encountersUntilSRChoice==0`; Rufus step1 → use pay phone + adv rift.

### S39. Crappy Mer-kin disguise (UTS:2550-2577)

- Runs when: `tailpiece()==none`
- Trunks; 10 sand dollars via `getSandDollar()`; unequip chaps/helmet; for mask then tailpiece: while pristine fish scale<3 → `getLucky()` (abort when `_cloversPurchased>=3`), black glass acc3, adv Caliginous Abyss (Lucky!); `retrieve_item`.
- Free resources: clovers (Aug 2nd / heartstone / 11-leaf), hermit clovers ≤3

### S40. Dreadscroll 3 via Deep Dark Visions (UTS:2585-2591)

- `maximize("50 spooky res, hp")`; while `dreadScroll3=="0"`: restore 1000 HP, cast Deep Dark Visions.

### S41. Elementary school — cheatsheets (UTS:2602-2605, 1033-1063)

- Phase: Yog-Urt prep / elementary school; Runs when: `yogUrtDefeated` false, not High Priest, `isKBandSushiEnough()` false (G:116, seedfinder)
- Loop until: 9 cheatsheets or `merkinVocabularyMastery != 0`
- `getCheatsheet()`: closet hallpasses; itdrop; backup camera (<11) else monodent (Double-Fisted); `", hat drop"` if no bunwig; saber/cloake equip; `"item drop"` helmet + tailpiece + BCZ + seal-clubbing club + Möbius + cupid bow; `choiceAdventure1589=1&victim=852`; mood -combat if teacher not unlocked; mood itdrop; `useMapIfAvailable()` (G:1634: candy-rich block + ToT fight with backup camera); `mapMonster`; adv; `timeSpinnerRefight`; closet hallpasses.
- Choices: 396-401 school queue (Choice:137-162), 1557/1435 → 852 monitor
- Combat CCS:948-1006: free monster → Refracted Gaze, Club 'Em Across the Battlefield or cleanUp; teacher/punisher/monitor → spring kick (teacher with bunwig, punisher with mouthsoap), backup camera to a free monster (Gaze, Club 'Em); non-monitor re-roll while cheatsheets needed; feelNostalgic; Talk to Some Fish + Refracted Gaze if `bcz_gaze_ready`; `free_kill(drop)`; cleanUp.
- Free resources: Peridot/Map on monitor, backup camera, Duplicate on monitor, Feel Nostalgic, re-rolls, Club 'Em Across the Battlefield, Time-Spinner

### S42. Elementary school — teacher unlock NC (UTS:2608-2627)

- While `merkinElementaryTeacherUnlock` false and `!libraryReady()` (UTS:713): `"-combat"` crappy tailpiece + crappy mask + BCZ + cupid bow + Möbius + (backup camera | monodent) + (seal-clubbing club if `_clubEmBattlefieldUsed<5` else baseball diamond); mood -combat; adv school.

### S43. Elementary school — bunwig (UTS:2630-2643)

- While no bunwig and `!libraryReady()`: `baseballD()` if 773 lineup; `"item drop, hat drop"` crappy set + club + BCZ + Möbius + cupid bow; mood itdrop (+ -combat if teacher locked); adv.

### S44. Vocabulary mastery + Squint library (UTS:2645-2679)

- Uncloset hallpasses. While mastery<90: wordquiz in hand → pull cheatsheet (if pulls) or `getCheatsheet()` loop, then use wordquiz; else `"item drop"` helmet + tailpiece + Möbius + cupid bow, adv school. When facecowl + waistrope + Steely-Eyed Squint: `buyScholarGear()` and library while turns_spent<4 with `"item drop"` scholar set + monodent + BCZ + backup camera, `useMapIfAvailable()`.

### S45. Alt branch: seed already pinned (UTS:2680-2711)

- Runs when `isKBandSushiEnough()` true, no dreadscroll, no scholar tailpiece: -combat school loop until teacher unlocked (`"-combat"` monodent + crappy set + BCZ + cupid bow + Möbius + diamond); break when facecowl+waistrope; `pullPrayerbead()`; `farmPrayerbeads()` while Yog healings short of pulls; uneffect sonata; itdrop school loop (`mood combat` + itdrop) until facecowl and waistrope (pull hallpass if one piece owned and pulls>reserved).

### S46. Library — dreadscroll + scrolls (UTS:2713-2739, 755-792)

- Phase: library (dreadscroll); `buyScholarGear()`; `dreadSeedCheck()` if scroll owned. Loop until dreadscroll owned AND dreadScroll1/6/8 known.
- `merkinLib()`: itdrop; (low: CMOI); backup camera if <11 (`!highShiny()`); `saberForResearcher` = scrolls missing & `saberForcesFree()>0` — then monodent stays OUT, else monodent while any of killscroll/healscroll/worktea/knucklebone missing; saber/cloake equip; BCZ while scroll drops needed; no dreadscroll → `"item drop"` scholar set + conditional, else mood -combat + `"-combat"`; mood itdrop; `useMapIfAvailable()`; adv library. After: knucklebone (pull if needed) → `use` for dreadScroll4; worktea (pull) + white rice + `eatSushi()` for scroll 7 while mastery<90; `dreadSeedCheck()`.
- Choices: 704 dread card spading (Choice:198-238), 1435 → researcher 840
- Combat CCS:1008-1056: free monster → Gaze, cleanUp; mastery≥90 → throw healscroll (scroll 2) / killscroll on mer-kin (scroll 5); knucklebone missing → Talk to Some Fish + Gaze; alphabetizer → spring kick; drifter → free_run(banish); else backup camera to free monster + Gaze, or Talk to Some Fish + Gaze while scroll items missing; `free_kill(drop)`; cleanUp. Preamble `researcherForce` (scrolls missing, `saberForcesFree()>0`).
- Free resources: researcher Force, backup camera, Gaze, banishes, pulls (knucklebone, worktea)
- Expected turns: not inferable (library turns_spent<4 Squint window)

### S47. Prayerbeads + clue verification (UTS:2741-2773)

- If beads<3 and (low or 0 pulls): `farmPrayerbeads()` to 3. Verify dreadScroll1-8 (skip 7): 2 → `combatScrollHint()` (UTS:1065: healscroll via thingpouch/pull/farm, then `gymnasium()`); 5 → same for killscroll; any other missing → **abort**. `farmPrayerbeads()` while `YogHealingsNeeded[beads] − YogHealingsOwned() > pulls_remaining()` (G:707). uneffect sonata; Leprecondo re-furnish mid `"22,24,12,8,13,15,10,4,5,6"`.

### S48. Becoming High Priest (UTS:2775-2815)

- Loop until `isMerkinHighPriest`: god-run guard (`uts_godRunGuard`, turns≤17, scroll7 unknown → sushi or abort); no Deep-Tainted Mind → `use(dreadscroll)` (choice 703 submits pro1-8, guessing pro7 4→3→2→1, Choice:165-195) + `post_adv()`; else while Deep-Tainted Mind: `skatePark()` if war → `gymnasium()` if thigh/headguard missing (+ `state2buff1`) → `finishCaliginous()` if step12 → **abort "1-in-40"**.
- `skatePark()` (UTS:668): refresh status; `NCforce()`; `gymnasium()` if no forcer active and parka/left-ski available; else `alliedradio sniper`; pull skate blade (pulls≥reserved); forcer active → trunks, unequip peridot, blade; else -combat fam, blade in weapon, `"-combat, -weapon"` trunks + cupid bow, mood -combat; adv Skate Park (CCS:731: attack, attack, cleanUp).
- `gymnasium()` (UTS:645): combat fam; left ski / parka spikolodon while war needs Holey Rollers; `baseball_equip`; `"combat"` helmet + tailpiece + freeRun + freeKill + conditional; mood combat; **abort if `noncombatForcerActive`**; adv Gymnasium (CCS:1058: scroll throws, spikes/avalanche during war, free monster Gaze, else `free_run(banish)` + `free_kill(false)`, cleanUp).
- Free resources: NC forcers (tuba/Cincho/pill/spikolodon/avalanche/allied radio), skate blade pull, free runs/kills in gym

### S49. Skate park cleanup + Yog pre-pulls (UTS:2819-2842)

- `skatePark()` while war; `state2buff1`; farmPrayerbeads if beads<3 and (low or 0 pulls); pull soft green echo eyedrop antidote if Gummiheart and `trueHPPercent()>=1.4`; pull healscroll if none.

### S50. Yog-Urt fight (UTS:2845-2906)

- Runs when: `yogUrtDefeated` false
- Gummiheart wait: `burnTurnElsewhere()` (UTS:2338: skate park → gladiator gear step → colosseum round → finishCaliginous) until it lapses, `stalled<8`, adventures>0. `acquire waterlogged scroll of healing, sea gel, Pungent Unguent, Homeopathic Elixir; cast cannel`. `delevelers()<2` (G:627: mouthsoap/shavings/table tennis ball/cowbell) → pull+use null-day exploit, else `getMissingCorralItems()` loop. Prayerbeads pull if <3. farmPrayerbeads while healings short. `"exp"` familiar; `"moxie, hot/cold/spooky/sleaze/stench damage, -hp, -equip tiny yam cannon"` scholar mask + scholar tailpiece + cupid bow + bat wings; prayerbeads in acc1(/2/3); pull New Age healing crystal / soggy used band-aid for gaps; `YogHpCheck()` (G:723; antidote on Gummiheart; abort if predicted HP×0.9 > smallest heal).
- Combat CCS:1091-1112: abort if maxhp>311; 2× (`yogDeleveler` + `yogHealing` funksling); extra heals per missing prayerbead; Elixir + Unguent; cleanUp; attackCleanUp.
- Free resources: pulls (antidote, healscroll, exploit, crystal, band-aid), bat wings

### S51. Post-Yog gate + skate park + late pulls (UTS:2909-2934)

- Abort if Yog not defeated. `skatePark()` while war; `state2buff1`. Pulls: null-day exploit (shavings<8), then peppermint parasol (skip with navel/GAP), ink bladder, Mer-kin pinkslip, stuffed yam stinkbomb, Louder Than Bomb, anchor bomb until pulls run out.

### S52. Finish Caliginous (step12, pre-colosseum) (UTS:2937-2940)

- While step12 and no VHS monster pending → `finishCaliginous()` (S25 outfit). Abyss CCS: peanut → waffle throw (scepter+catalog+JtF+eagle and spare waffle) else cleanUp.

### S53. Gladiator gear (gymnasium) (UTS:2944-2950, 2258-2276)

- Phase: gymnasium; Loop until gladiator mask AND tailpiece: `gladiatorGearStep()` = `gymnasium()` then, with thighguard + headguard, strip hat/pants, trunks, sell scholar mask (row 131) / tailpiece (row 1619) to Grandma, buy gladiator pieces.
- Combat: gym handler (S48).

### S54. Colosseum (UTS:2955-2961, 2281-2331)

- Phase: colosseum; Loop until `lastColosseumRoundWon>=15`
- `colosseumRound()`: acquire 11 Pungent Unguent; buy sea gel to 5 (10 sand pennies each); `freeFight` = legendary seal-clubbing club (`_clubEmTimeUsed<5`, mid) + bat wings (`_batWingsFreeFights<5`) else retro cape `heck kill`; Up To 11 from round 3; null-day exploit from round 6 if shavings<8; familiar eagle (screech recharging, CMOI owned) else Foul Ball; mood colosseum; `"<coeff> spell damage percent, mys"` gladiator set + CMOI + freeFight + bathysphere(none); adv; "Been There, Won That" → set 15.
- Combat CCS:1081-1089: `free_kill(false)` (colosseum → only Club 'Em Back in Time), cleanUp with bladeswitcher reflect-stall logic (CCS:120-355, sea gel / unguent stalls).
- Free resources: Club 'Em Back in Time ×5, bat wings ×5, eagle screech recharge
- Expected turns: 15 rounds minus free fights
- Tier notes: high/low skip Club 'Em; high skips bat wings.

### S55. Finish Caliginous (step12, post-colosseum) (UTS:2963-2966)

- While step12 → `finishCaliginous()`.

### S56. Shub-Jigguwatt (UTS:2969-3034)

- Phase: Shub; Runs when `shubJigguwattDefeated` false
- `shubPrepShort()` (G:181, projection >0.25 and no Null Afternoon) → pull+use null-day exploit; `summon(golem)` up to 6 times for shavings (itdrop, `"item drop"` BCZ + cupid bow); abort if still short. uneffect scarysauce; `"exp"` familiar; `"damage absorption, mus"` gladiator set + cupid bow; `hpAutoRecoveryTarget=1`, mp recovery off; gremlin juice + hand chalk pulls if low or muscle<1250; use both if held; `recover hp`; Ruthless Efficiency; `cast * empathy` (MP dump); adv Temple (Left Door).
- Combat CCS:1114-1119: `shubDelevel()` (bootleg 0.5 / shavings 0.7 / rattle,kit 0.75, funksling pairs) unless Null Afternoon; attack until dead.

### S57. Naughty Sorceress (UTS:3039-3053)

- Runs when `questL13Final` unstarted: `"spell damage percent, mys"` gladiator set + CMOI + cupid bow + bat wings (if <5 free fights, mid) else retro cape heck kill; adv Temple (center Door) ×2.
- Combat CCS:1121-1129: Raise Backup Dancer ×2 if known; cleanUp.

### S58. Post-quest cleanup / postloop (UTS:3062-3078)

- Runs when `questL13Final` finished: water-logged pills while sand pennies>30, waterlogged scrolls of healing while >10; council ×2; `pearlPostloop()` (UTS:1975, prefs `uts_postLoopRunOutEagleBanish` / `uts_postLoopFarmPearls`); `prepCodpiece()` (UTS:2236); `usePilsners()` (UTS:2186); `uts_postloopCommand`.

---

## 3. Invariants / per-turn duties

`adv(loc)` UTS:405 = `adv1(loc)` + `post_adv()`. Loops that call `adv1` directly (guild S6, shadowRift S33, curveballBurn S30, VHS/Club-Em follow-ups, pearl walker) skip post_adv.

`post_adv()` UTS:246-403, every call:

1. `_lastCombatLost` → `liftBeatenUp()` (UTS:208: topUpMp, Tongue of the Walrus, else `rest`), clear, **abort**.
2. uneffect _really quite poisoned_; disco nap if _Marked by the Don_; `modes=""`; clear `NCtoC`.
3. `dreadSeedCheck()` (G:672) while not High Priest and seahorse named.
4. `useAutumnaton()` (G:783: anemone mine while no digpick → shadow rift → upgrade zones → noob cave) when idle.
5. `numberology 69` while `_universeCalculated < min(2, skillLevel144)`.
6. `trainset()` (G:1773) reconfigure every 42 positions.
7. distilled resin if >50 leaves; split pea soup from 2 whirled peas; Summon Taffy if affordable and no yellow summons.
8. Path 55 diet: at 0 adventures → astral six-pack, shrug Donho's, Ode to Booze, drink astral pilsner, else **abort "no more easy diet"**.
9. Asdon: if no _Driving Waterproofly_ and workshed is Asdon: fuel 0 → pull + fuel "pie man was not meant to eat"; fuel ≥37 → drive Waterproofly; else **abort**.
10. Fishy ladder (§1).
11. bat wings `rest upside down` when MP < max−1000 or <150.
12. durable dolphin whistle when `dolphinItem` is prayerbeads or rusty rivet (**low only**).
13. meat <300 → autosell dull/rough fish scales.
14. VHS-tape monster follow-up (8 turns later, `pearlLoc[ps]`), VHS recording trip to the Abyss while mom 23-32, Club 'Em Next Week follow-up.
15. `setRecoveryTargets()` (UTS:227: HP floor 570 / 800 gym / full colosseum; MP 250).

Also per fight (CCS preamble, CCS:432-499): pearl-farm short-circuit; Duplicate; the four Force handlers; Become a Bat; Otoscope; Extract Jelly; Fitz re-roll; Lecture on Relativity; murky potion identification (rounds<5, not cowboy); lasso throw at high/no-phone.

Lasso training counter: thrown in pearl zones with hat+chaps (CCS:618), in the rift after the wave (CCS:534), at the Outpost on path 0 (CCS:661), in the Abyss at high/no-phone (CCS:917); target `lassoTrainingCount==20`.

---

## 4. Known aborts (main flow, UTS)

- UTS:252 lost the last combat (post_adv).
- UTS:289 "no more easy diet" (0 adventures, no pilsner).
- UTS:301 Asdon fuel <37 and no pie pull.
- UTS:330 "acquire fishy failed".
- UTS:336 / 345 path-0 out of adventures / "get fishy".
- UTS:413 mafia revision <29057.
- UTS:425 chosen familiar not +item and user declined.
- UTS:429 `autoSatisfyWithNPCs` false.
- UTS:460 photo-booth sheriff prop missing.
- UTS:610 CMOI not in storage.
- UTS:664 NC forcer active while entering the gymnasium.
- UTS:949 mimic egg extract failed.
- UTS:1314 all three stashbox spots checked, no stashbox.
- UTS:1637 moxie <500 before Cyberzone.
- UTS:1809 / 1816 / 1837 / 1866 / 2004 / 2006 / 2049 / 2063 / 2068 / 2100 / 2107 / 2133 / 2143 / 2146 / 2160 / 2241 / 2247 postloop pearl/eagle/codpiece aborts (prefs-gated).
- UTS:2521 "need more cowbells" (paw exhausted, <3).
- UTS:2561 / 2572 pristine fish scales short and hermit clovers exhausted.
- UTS:2582 path-0 boss prompt cancelled.
- UTS:2759 dreadscroll hint x (≠2,5,7) missing.
- UTS:2782 god-run guard: eat sushi for scroll 7.
- UTS:2810 Deep-Tainted Mind with nowhere to burn a turn ("1-in-40").
- UTS:2910 Yog-Urt not defeated after the prep block.
- UTS:2961 colosseum not finished.
- UTS:2993 Shub prep short (delevelers).
- UTS:3127 unknown CLI command.

Helper/CCS aborts reachable from the main flow: G:240 pull over autoBuyPriceLimit (declined); G:308 codpiece slot wrong; G:546 `Missing <item>`; G:553 `Maximizer failed`; G:623 no teflon mining spot; G:757 Yog HP too high; G:1850 baseball prereq slots; CCS:206/277/352 stuck attack/geyser loop; CCS:366/375 Yog deleveler/heal missing; CCS:525 no eagle at Bakery; CCS:549 tumbleweed in rift; CCS:751 seahorse not tamed; CCS:786 software glitch failed; CCS:979 backed up to a non-free monster; CCS:1093/1134 maxhp>311 vs Yog-Urt; CCS:1158 Dad manual spell order.
