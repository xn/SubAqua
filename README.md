# SubAqua

A one-shot speedrun script for the **11,037 Leagues Under the Sea** challenge
path (path id 55), written in TypeScript on grimoire-kolmafia/libram. It runs
the path from initialization through the Nautical Seaceress with minimal
resource waste, then stops — no aftercore, no farming.

## Requirements

- KoLmafia r29108 or later.
- A Sauceror (or at least a Saucegeyser/Saucestorm caster) is the tested
  route; other classes fall back to plain attacks in boss fights.
- **Five unblemished pearls loaded into the Eternity Codpiece before you
  ascend** — the finale needs them and they cannot be acquired in-path.
  `subaqua sim` checks this and everything below.
- **Deep Dark Visions permed** (dreadscroll clue 3's only in-run source; the
  seed solver can often infer it, but don't bet a run on it).
- Sushi-rolling mat installed; permanent sea zone unlocks (Dive Bar,
  Marinara Trench, Anemone Mine, Skate Park, Madness Reef) done; underwater
  maps purchased.
- A clan photobooth with the Sheriff kit (e.g. BAFH).

## Usage

    subaqua sim        # pre-ascension checklist + tier verdict; no server hits that spend anything
    subaqua            # run the route
    subaqua actions=10 # run 10 tasks and stop (incremental testing)
    subaqua list       # print the runplan with per-task completion

`subaqua sim` also prints a permable-skill checklist — the skills the route
leans on, split into required / big turn saver / optional, with what each one
buys you — alongside the supported-IOTM and stocked-pull lists.

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
