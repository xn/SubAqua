# SubAqua

A one-shot speedrun script for the **11,037 Leagues Under the Sea** challenge
path (path id 55), written in TypeScript on grimoire-kolmafia/libram. It runs
the path from initialization through the Nautical Seaceress with minimal
resource waste, then stops — no aftercore, no farming.

## Requirements

- KoLmafia r29108 or later.
- A Sauceror (or at least a Saucegeyser/Saucestorm caster) is the tested
  route; other classes fall back to plain attacks in boss fights.
- A clan photobooth with the Sheriff kit (e.g. BAFH). Init takes the kit at
  its first free action and aborts without it.
- A workshed installed (or an Asdon / model train set / Mayo Clinic /
  TakerSpace item to install).
- **Five unblemished pearls mounted in the Eternity Codpiece before you
  ascend** — the finale needs them, they cannot be acquired in-path, and
  loose pearls do not survive ascension. `subaqua sim` checks this and
  everything below.
- **Deep Dark Visions permed** (dreadscroll clue 3's only in-run source; the
  seed solver can often infer it, but don't bet a run on it).
- Permanent sea zone unlocks (Anemone Mine, plus the Marinara Trench or Dive
  Bar for Mysticality/Moxie classes; Skate Park and Madness Reef recommended)
  done; underwater maps purchased. The Old Man hands out the swimming trunks,
  bathysphere and sushi mat at init; a SCUBA tank is pulled if you own none.
- Something to summon the unholy diver and the Black Crayon Golem at
  low/mid tier: those monsters in your combat lover's locket, or a clan fax
  machine.

## Usage

    subaqua sim        # pre-ascension checklist + tier verdict; no server hits that spend anything
    subaqua            # run the route
    subaqua actions=10 # run 10 tasks and stop (incremental testing)
    subaqua list       # print the runplan with per-task completion

`subaqua sim` prints every IotM, familiar, skill, clan resource and pull the
route knows about, split into necessary (the run aborts without it at your
tier) / highly recommended / optional, with what each one buys you. Run it
before you ascend: pre-ascension it only counts skills that are permed, pearls
that are mounted, and items the run can reach (inventory, Hagnk's, equipped,
installed workshed; it flags the closet and display case). It never spends
anything or writes a preference.

The gold guard (`gold=true`) is on by default and aborts the first time a paid
turn lands more than `goldSlack` (3) turns past the reference 41-turn run's
checkpoint. If `sim` shows missing recommended rows, run with `gold=false` so
the route finishes at its own pace instead of stopping to ask.

Options: `tier=low|mid|high` (override detection), `buyLimit=N` (mall spend
ceiling per purchase; defaults to your autoBuyPriceLimit), `godRunGuard`
(abort at <= 17 turns played if dreadscroll clue 7 is unknown),
`seedScan=false` (disable the one-time dreadscroll seed-space scan),
`postloopCommand="..."` (CLI to run after the finale).

## Tiers

Detected at startup (override with `tier=`):

- **low**: owns none of 2002 Mr. Store Catalog / cursed monkey's paw /
  august scepter. Farms instead of pulling; conserves nothing.
- **high**: `garbo_valueOfFreeFight` > `valueOfAdventure`. Banks free
  fights and copies for aftercore; darts-only free kills.
- **mid**: everything else. Spends everything on speed.

## Safety

The script never opens confirmation dialogs; when it cannot proceed it
aborts with instructions. All state is re-derived from KoLmafia's own quest
tracking, so aborting anywhere and rerunning is always safe.

## Building from source

    yarn install && yarn build && yarn mafia   # deploys dist/ into your mafia folder
