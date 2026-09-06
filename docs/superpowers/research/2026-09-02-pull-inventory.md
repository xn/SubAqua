# Pull inventory: every item UnderTheSea (and SubAqua) takes from Hagnk's

Sources: local UTS checkout `../UnderTheSea` at `a29c9dc` (call sites are `UnderTheSea.ash` unless
marked `G:` for `UnderTheSeaGlobals.ash`), SubAqua main, `docs/gold-star-run.txt` (gold, 20 pulls),
`docs/2026-09-02-run.txt` (ours, 17 pulls), mafia `data/modifiers.txt` + `StorageRequest.java`.

## 1. Three classes of "pull", and which one matters

1. **Auto-pulled at ascension (no slot, no log line).** Wiki, Ronin page: "Modern items from the
   Mr. Store (ones released in 2015 or later, and some older ones in their respective challenge
   paths) will be pulled automatically at the start of the run." This is why the parka, dart
   holster, spring shoes, Monodent, Peridot, toy Cupid bow, Möbius ring etc. are equipped on turn 1
   of both logs with no `pull:` line. Every item in `sim.ts` `supportedIotms` is in this class.
   These never touch the 20-pull budget and never appear in the tables below.
2. **"Free pull from Hagnk's" (mafia `Free Pull` modifier, parsed from the item description).**
   327 items: boxed/bagged IotM packages, familiar hatchlings, clan items, airplane charters, the
   Mayam Calendar. Pulled outside the 20 budget and not recorded in `_roninStoragePulls`
   (`StorageRequest.java:716`). **None of the run's pulls is in this class**; the only supported
   IotM flagged is the Mayam Calendar, which is auto-pulled anyway.
3. **Counted pulls (one of 20, unique per day).** Everything below. Includes the two pre-2015
   Mr. Store items (Platinum Yendorian Express Card, Greatest American Pants) and every limited
   item that is not sold through Mr. Store even when it has a `Last Available` date (Congressional
   Medal of Insanity 2024-12, Elf Guard SCUBA tank 2023-12, lodestone 2023-01, FLUDA 2023-06,
   null-day exploit 2025-12, stuffed yam stinkbomb 2024-05, pro skateboard 2023-06, anchor bomb
   2024-12): both logs show a `pull:` line for each one they took.

Both scripts' `pullSequence` returns false at `pulls_remaining() == 0` before checking anything
else, so a class-2 free pull would be refused when the budget is spent. Harmless today (class 2
is empty for this route) but wrong if a boxed item ever joins the list.

## 2. Counted pulls, by phase

Columns: **ash** = UTS call site; **SubAqua** = our call site (`—` = no consumer); **gold / ours** =
pulled in that log. Mall-bought-into-storage on demand unless the ash aborts (CMOI) or requires
stock (Clara's bell, GAP).

### Run start (sea gear, bang potions)

| item                                     | ash                             | SubAqua                            | gold | ours | note                                   |
| ---------------------------------------- | ------------------------------- | ---------------------------------- | ---- | ---- | -------------------------------------- |
| Mer-kin sneakmask                        | init gear loop :595             | init.ts seaGearPulls               | Y    | Y    |                                        |
| shark jumper                             | :595                            | init.ts                            | Y    | Y    |                                        |
| ten-leaf clover                          | :595                            | init.ts Bang Potions               | Y    | Y    | → blessed large box                    |
| large box                                | :595                            | init.ts Bang Potions               | Y    | Y    |                                        |
| scale-mail underwear                     | :595 unless Kramco              | init.ts / mom.ts:197 unless Kramco | –    | –    | Kramco trunks cover it on this account |
| Congressional Medal of Insanity          | :595 (aborts if not stocked)    | init.ts:280 if stocked             | Y    | Y    | Crimbo 2024, counted                   |
| Flash Liquidizer Ultra Dousing Accessory | :595 if pay phone owned         | init.ts                            | Y    | Y    | pay-phone shop item, counted           |
| sea lasso                                | :595 unless lowShiny/Sword lane | shadow.ts:83 training pull         | –    | –    | ours took the lasso as a drop          |
| Elf Guard SCUBA tank                     | :990 cli, :1304, G:1601         | init.ts seaGearPulls               | –    | Y    | breathing; gold used the diving helmet |
| fishy pipe                               | :307 cli                        | fishy.ts:282                       | Y    | Y    | Fishy                                  |
| pie man was not meant to eat             | :295                            | fishy.ts:327                       | Y    | Y    | Asdon fuel → Driving Waterproofly      |
| fish sauce                               | :323                            | fishy.ts:308                       | Y    | Y    | Fishy (spleen)                         |
| Aldebaran sardines                       | :320                            | fishy.ts:301                       | –    | –    | Fishy fallback                         |
| cheapest fishy pasta                     | :318                            | fishy.ts:300                       | –    | –    | Fishy fallback                         |
| Platinum Yendorian Express Card          | :2422 take_storage              | daily.ts:31                        | Y    | Y    | Mr. Store 2005 → counted               |

### Sea Monkees phase

| item                    | ash                          | SubAqua                               | gold | ours | note                                                       |
| ----------------------- | ---------------------------- | ------------------------------------- | ---- | ---- | ---------------------------------------------------------- |
| Mer-kin hidepaint       | :1239                        | grandpa.ts:38                         | Y    | Y    | used immediately, before the Outpost                       |
| damp old wallet         | :736                         | helmet.ts:82                          | Y    | Y    | sand dollars for the Old Guy boot                          |
| 11-leaf clover          | —                            | helmet.ts:92                          | –    | –    | sand dollars fallback (ash uses Aug 2nd / Heartstone luck) |
| rusty rivet             | :1464                        | helmet.ts:143                         | –    | –    | rivet gap only (7 → 8)                                     |
| Mer-kin prayerbeads     | :1009, :2864                 | outpost.ts:169, yogurt.ts:228         | Y    | –    | ours wished instead                                        |
| comb jelly              | :708, :1590                  | mom.ts:187                            | Y    | Y    | Jelly Combed                                               |
| Greatest American Pants | :1125                        | guild.ts:103 if stocked               | –    | –    | Mr. Store 2010 → counted                                   |
| sea cowbell             | :2484                        | corral.ts:216                         | Y    | Y    | the one Feel Nostalgic could replace                       |
| waffle                  | :2491 when no August scepter | —                                     | –    | –    | seahorse re-roll; we own the scepter                       |
| pro skateboard          | :1653 when no catalog        | init.ts:228 buys with catalog credits | –    | –    |                                                            |
| software glitch         | :1661, :1667                 | —                                     | –    | –    | corral bugbear lane, not ported                            |
| pulled yellow taffy     | :1666                        | —                                     | –    | –    | ash's yellow ray for the corral; parka takes our YR        |
| stuffed yam stinkbomb   | :1669                        | skatepark.ts late pulls               | –    | –    | banish                                                     |
| Mer-kin digpick         | :2394, :2405                 | mine.ts:243                           | Y    | Y    | avoids paid mine turns                                     |
| lodestone               | :2413                        | mine.ts:83                            | –    | Y    | Loded free mining                                          |

### Sorceress phase

| item                             | ash                                 | SubAqua                   | gold | ours | note                                               |
| -------------------------------- | ----------------------------------- | ------------------------- | ---- | ---- | -------------------------------------------------- |
| Mer-kin cheatsheet               | :2645                               | school.ts:132             | –    | –    | Talk to Some Fish covers it                        |
| Mer-kin hallpass                 | :2696                               | school.ts:172             | –    | –    |                                                    |
| Mer-kin knucklebone              | :2720                               | library.ts:148            | –    | –    | dreadscroll clue 4                                 |
| Mer-kin worktea                  | :2726                               | library.ts:169            | –    | –    | dreadscroll clue 7                                 |
| Mer-kin killscroll               | :1071                               | —                         | –    | –    | ours relies on the researcher Force / drop         |
| Mer-kin healscroll               | :1079, :2835                        | yogurt.ts:205             | –    | –    | Yog heal                                           |
| soft green echo eyedrop antidote | G:745, :2831                        | yogurt.ts:120/198         | –    | –    | Yog                                                |
| New Age healing crystal          | :2887, :2892                        | yogurt.ts pullHeal        | –    | –    | Yog heal                                           |
| soggy used band-aid              | :2889, :2894                        | yogurt.ts pullHeal        | –    | –    | Yog heal                                           |
| skate blade                      | :685                                | skatepark.ts:76           | Y    | –    | ours: pull-queue deadlock, fixed post-run          |
| null-day exploit                 | :2857, :2919, :2972                 | yogurt.ts:220, shub.ts:43 | –    | –    | Shub deleveler                                     |
| gremlin juice                    | :3008                               | shub.ts:89                | –    | –    | Shub muscle floor                                  |
| handful of hand chalk            | :3010                               | shub.ts:96                | –    | –    | Shub muscle floor                                  |
| handheld Allied radio            | G:1604 loop                         | ncforce.ts:99             | –    | –    | NC-force fallback without duffel/parka/backpack    |
| Clara's bell                     | G:1604 (stock only)                 | ncforce.ts:120            | –    | –    |                                                    |
| stench jelly                     | G:1604                              | ncforce.ts:128            | –    | –    |                                                    |
| peppermint parasol               | :2924 loop (post-Yog)               | skatepark.ts late pulls   | Y    | –    | escape gear                                        |
| ink bladder                      | :2924 loop                          | late pulls                | Y    | –    | gold had already looted two                        |
| Mer-kin pinkslip                 | :2924 loop                          | late pulls                | Y    | –    |                                                    |
| Louder Than Bomb                 | checklist only                      | —                         | –    | –    | no consumer either side                            |
| anchor bomb                      | checklist (crafted from TakerSpace) | late pulls                | –    | –    |                                                    |
| crayon shavings                  | —                                   | pulls.ts reservation (<9) | –    | –    | Yog deleveler; no pull call site, reservation only |

## 3. Totals and what they mean

- Counted-pull universe: **50 items** in the ash (42 in `pullChecklist()` + init clover/box + GAP,
  gremlin juice, hand chalk, fishy pipe, cheap pasta, PYEC); SubAqua consumes 45 of them and adds
  the 11-leaf clover and a crayon-shavings reservation. Not consumed by SubAqua: waffle, software
  glitch, pulled yellow taffy, Louder Than Bomb, Mer-kin killscroll (all covered another way).
- Gold spent 20/20; ours 17 (18 with the blade fix). Every one was a counted pull; **no IotM in
  either list**, because modern IotMs never enter the budget.
- Slots that drop-farming could give back (see the nostalgia / snapper / bow memories): sea cowbell
  (both runs), prayerbeads (gold), skate blade (2% base, no). Slots that a free-killed source
  monster under item gear gives back: comb jelly (belle 40%), ink bladder (squid 30%).
- The only counted pulls that are Mr. Store items are PYEC and GAP (pre-2015); nothing to gain
  from "free pull" handling in code.
