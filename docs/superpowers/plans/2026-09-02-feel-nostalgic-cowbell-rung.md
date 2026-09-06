# Feel Nostalgic: cowbell rung, pull as fallback (STASHED 2026-09-02, not started)

Status: design approved in principle by the user ("Design the cowbell rung, keep the pull as
fallback"), then stashed before implementation. No code exists. Resume by re-reading this file,
then building on a branch off main with the verification steps in §5.

## 1. Why this and nothing else

Feel Nostalgic (Emotionally Chipped, 3/day, ~7365) appends the last copyable monster's drop table
to the current fight; pays only on a win; wasted on the anchor monster itself.

Valued by marginal turns it buys **zero** in this route: every fight the skill could improve is
already free in both the gold run (`docs/gold-star-run.txt`, 41t) and ours (`docs/2026-09-02-run.txt`,
45t). Details, checked against the turn ledger (`docs/superpowers/research/2026-09-02-turn-ledger`):

- unholy diver rivets: two Forces from locket + mimic egg in both runs (8 rivets, 0 turns).
- sea cow cowbells/leather: backup-camera cow + one **pull** in both runs.
- Mer-kin monitor cheatsheets: already 1 per school fight via Sea \*dent: Talk to Some Fish
  ("some fish" carries the cheatsheet); `lastCopyableMonster` becomes "some fish" after it.
- No paid fight in either ledger is a drop hunt (pantry NCs, Colosseum immune, Peanut, school of
  many, temple bosses, Seaceress).

Valued by **pull slots** (the user's goal: open pulls to add other pull-based resources), the only
reliable target is the **sea cowbell pull** (cow, 10% base; pulled in both runs). Rejected targets:
prayerbeads 5% (gold pulled one, ours wished), comb jelly 40% / ink bladder 30% (a free-killed
belle/squid under item gear drops them without nostalgia; ours never met a belle), digpick 40%
(anchor needs a paid mine turn, which the pull exists to avoid), hidepaint/sneakmask/pinkslip/
skate blade (needed before the source is reachable, or 2–10% base).

## 2. Anchor semantics (empirical, from the 09-02 log)

mafia's `lastCopyableMonster` (FightRequest.java:3521, "only if the fight is completed"):

- updates on **kills and banishes** (rustler Curveball → rustler; cowboy Feel Hatred → cowboy);
- does **not** update on **Use the Force** (healer/diver Forces left it unchanged) or on **runaways**
  (seahorse runaway left "sea cow" in place);
- a Back-Up-copied fight ends as the copied monster (opener cow at :4905 stayed "eye in the
  darkness" even though cow drops landed).
  So a host must be the **very next won fight** after a cow kill; any banish in between loses the
  anchor. Free-kill wins both anchor and pay out (user confirmed: only Force/runaways forfeit).

## 3. Design (bounded, three files, no spec)

1. `src/resources/nostalgia.ts` (new, shaped like the other resource modules):
   - `nostalgiaCastsLeft()` = 3 − `_feelNostalgicUsed` when `have($skill\`Feel Nostalgic\`)`, else 0.
   - `nostalgiaAnchor()` = `get("lastCopyableMonster")`.
   - `nostalgiaMacro(anchor: Monster, wanted: () => boolean): Macro` →
     `Macro.ifNot(anchor, Macro.trySkill(Feel Nostalgic))` when the skill is known, casts are left,
     the anchor matches and `wanted()` holds; else an empty macro.
2. `src/tasks/monkees/corral.ts` hosts: `nostalgiaMacro(cow, () => availableAmount(cowbell) < 3 && !tamed())`
   attached via `.macro(fn, cowboy)` in **Corral Opener, Corral Leather, Corral Lassos** (cowboy
   action is `kill` under an `item` outfit; grimoire puts task macros before the engine's
   free-kill upgrade step, so the cast precedes Sweat Bullets/darts and the fight is a win either
   way). Not in Tame Seahorse (initiative outfit, regime banishes cowboys). Cows never host.
3. Pull becomes just-in-time: move **Pull Cowbell** after Corral Lassos and add `lassosDone()` to its
   `ready`. Change **Corral Leather** `completed` from `leatherDone() || tamed()` to
   "leather ≥ 2 && (cowbells ≥ 3 || cowbell pull still available: !pulledToday && pullBudgetAllows)"
   so deferring the pull never makes it farm cowbells with Forced/paid cow kills. Leave
   `seaCowNeeded()` / the seaCow Force reservation untouched (it covers the no-pull case).

Untouched: Yog-Urt deleveler stock, backup-camera opener, taming regime, Force ladder.

## 4. Yield caveat

In the 09-02 corral (5 fights: opener cow, rustler banish, cowboy banish, cow kill, seahorse run)
the rung would have fired **zero** times. It fires only when Corral Leather/Lassos actually run and
draw a cowboy right after a cow. Do not count the slot as freed until a live log shows the cast.
Possible follow-up (not designed, needs its own valuation): after a cow kill, free-kill the next
rustler/cowboy under item gear instead of banishing it (spends a free-kill charge for a ~50% roll
at +400% item).

## 5. Verification

No unit suite. `yarn check`, `yarn lint`, `yarn build`. Live log: "casts FEEL NOSTALGIC!" on a
cowboy fight; "You acquire an item: sea cowbell" in that fight; `_feelNostalgicUsed` ticks; Pull
Cowbell logged after Corral Lassos, not after the opener; no new paid corral turn.

## 6. Reference

Local UTS fork already has `feelNostalgic()` (`UnderTheSea/scripts/UnderTheSeaGlobals.ash:1448`,
targets diver/cow/monitor, gated on `contains_text(page_text, "Feel Nostalgic")` and no Force
overlap). loopstar gates on `get("lastCopyableMonster") === X` (`loopstar/src/tasks/level7.ts:329`).
