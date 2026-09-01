import { bufferToFile, myTurncount, print } from "kolmafia";
import { get } from "libram";

import { args } from "../args";
import { banishSources } from "../resources/banish";
import { freeKillSources } from "../resources/freekill";
import { freeRunSources } from "../resources/freerun";

/**
 * The gold-standard run is the spec. Every quest group carries the turncount
 * by which the reference run (UTS 2026-08-21, 41 turns, zero interventions;
 * verbatim log: docs/superpowers/research/runs/gold-uts-2026-08-21.log) had
 * finished it. A PAID turn spent on a group past its checkpoint + slack is a
 * deviation from the gold run and aborts the script, so a wrong task costs a
 * handful of turns instead of a hundred. Free actions never trip it: a task
 * that runs late but spends nothing is a scheduling difference, not a turn
 * sink, and the accounting table below still records it.
 *
 * WHAT A CHECKPOINT IS, exactly: gold's TRUE turncount when it left the group,
 * re-derived from the per-zone paid-turn spine of the gold log (which
 * reconciles to "Run End Adventures used: 41"):
 *
 *   Haunted Pantry 1-5 -> 5 | Wreck 6 -> 6 | Marinara 7-9 -> 9 |
 *   Outpost 10-15 -> 15 | Corral 0 -> 15 | School 16-19 -> 19 |
 *   Library 20 + dreadscroll 21 -> 21 | Skate Park 22-25 -> 25 |
 *   Right Door 26 -> 26 | Gymnasium 27-30 -> 30 | Colosseum 31-37 -> 37 |
 *   Abyss 38-40 -> 40 | Left Door 41 -> 41 | Center Door 0 paid -> 41
 *
 * It used to be read off the `[N]` marker at each `UTS: phase:` banner. Mafia
 * logs `[getCurrentRun()+1]` and the marker does not advance on a free fight,
 * so entries silently mixed `gold_end` and `gold_end + 1` and no single offset
 * could correct them: Grandpa, School and Finale were one high; Helmet, Mom,
 * Shadow Rift, Corral, Sorceress Dailies and Teflon were one high the other
 * way (16 for a phase gold left at 15); Outpost, Library, Colosseum, Mom
 * Finish and Shub were already exact.
 *
 * TWO TABLES, because there are two consumers with different needs.
 * `goldTurncounts` is the SCOREBOARD: what gold actually did, one row per
 * group, printed as `gold@`. `goldCheckpoints` is the GUARD: the turncount a
 * paid turn may not pass. They differ for exactly three groups.
 *
 * THE REORDERED BLOCK. Gold runs Skate Park (22-25) -> Right Door (26) ->
 * Gymnasium (27-30); we run Yog-Urt -> Gladiator Gear -> Skate Park. No
 * per-group checkpoint is valid for both orderings — but the three are
 * CONTIGUOUS in both, bounded by the Library below and the Colosseum above, so
 * the BLOCK bound (gold left all three by turn 30) guards all three under
 * either order. That is what the guard uses. The scoreboard keeps the true
 * per-group numbers and marks the rows, since a Δ against a block bound would
 * be meaningless.
 *
 * (An earlier pass deleted these three outright, on the grounds that the
 * 2026-09-01 ledger showed an impossible `Skate Park -2` beside
 * `Gladiator Gear +1`. That pair was an artifact of the old table's wrong
 * Skate Park value of 30 — gold's is 25 — which the same pass was already
 * fixing. Deleting them removed two working block guards; only `Yog-Urt: 22`
 * was actually wrong, and in the dangerous direction: four turns too STRICT,
 * so an on-pace run spending its Yog-Urt turn at 26 would have false-aborted.)
 *
 * Resuming after an abort: the first paid turn of an invocation sets a
 * session drift = how far past its checkpoint the run already was, and every
 * later limit carries that drift. Without it a run that tripped once could
 * never spend another turn in that group, and the only way on would be
 * goldSlack big enough to blind every later checkpoint too. The accounting
 * table still shows the raw Δ against gold.
 */
export const GOLD_RUN = "UTS 2026-08-21 (41 turns)";

/** SCOREBOARD: gold's true turncount when it left each group. */
export const goldTurncounts: Record<string, number> = {
  Openers: 5,
  Pellet: 5,
  "Big Brother": 6,
  Grandpa: 9,
  Outpost: 15,
  Currents: 15,
  Helmet: 15,
  Mom: 15,
  "Shadow Rift": 15,
  Corral: 15,
  "Sorceress Dailies": 15,
  Teflon: 15,
  School: 19,
  Library: 21,
  "Yog-Urt": 26,
  "Skate Park": 25,
  "Gladiator Gear": 30,
  Colosseum: 37,
  "Mom Finish": 40,
  Shub: 41,
  Finale: 41,
};

/** Groups our route runs in a different ORDER from gold. Guarded as one block
 * (see the header); their scoreboard Δ is annotated rather than trusted. */
const REORDERED_BLOCK = new Set(["Yog-Urt", "Gladiator Gear", "Skate Park"]);
const REORDERED_BLOCK_END = 30;

/** GUARD: the turncount a paid turn on this group may not pass (before
 * tolerance and drift). Identical to goldTurncounts except that the reordered
 * block members all carry the block bound. */
export const goldCheckpoints: Record<string, number> = Object.fromEntries(
  Object.entries(goldTurncounts).map(([group, turncount]) => [
    group,
    REORDERED_BLOCK.has(group) ? REORDERED_BLOCK_END : turncount,
  ]),
);

/** Deliberate tolerance on every guard limit, so a checkpoint is never strict.
 * Named for what it is: this is policy, not an accounting correction. The
 * previous name (GUARD_TOLERANCE) described a log-marker artifact that no longer
 * exists now the checkpoints are exact turncounts. */
const GUARD_TOLERANCE = 1;
/** Tasks the route re-runs late by design; never checked against their group. */
const FLOATING = new Set(["Mom/Banish Constructs"]);

export function groupOf(taskName: string): string {
  const slash = taskName.indexOf("/");
  return slash === -1 ? taskName : taskName.slice(0, slash);
}

type GroupLedger = {
  tasks: number;
  turns: number;
  combats: number;
  free: number;
  lastTurn: number;
};
const ledger = new Map<string, GroupLedger>();
const order: string[] = [];

/** Record one task execution in the per-group ledger (call from post()). */
export function recordTask(taskName: string, turnsSpent: number, fought: boolean): void {
  const group = groupOf(taskName);
  let row = ledger.get(group);
  if (!row) {
    row = { tasks: 0, turns: 0, combats: 0, free: 0, lastTurn: 0 };
    ledger.set(group, row);
    order.push(group);
  }
  row.tasks += 1;
  row.turns += turnsSpent;
  if (fought) {
    row.combats += 1;
    if (turnsSpent === 0) row.free += 1;
  }
  // FLOATING tasks are maintenance the route legitimately re-runs late
  // (assertOnGoldPace exempts them for the same reason). Letting one bump
  // lastTurn stamps a permanent false Δ on its group: `Mom/Banish Constructs`
  // re-firing at turn 100 would report Mom as finishing there. Their turns and
  // combats still count; only the position marker is theirs to skip.
  if (!FLOATING.has(taskName)) row.lastTurn = myTurncount();
}

/** True when a combat (free or paid) started since the snapshot: mafia stamps
 * `_lastCombatStarted` (yyyyMMddHHmmss) at every fight start, so it moves on a
 * repeat of the same monster where `lastEncounter` would not. */
export function fightHappened(preCombatStarted: string): boolean {
  return get("_lastCombatStarted") !== preCombatStarted;
}

/** Turns the run was already behind gold when this invocation spent its
 * first paid turn; undefined until then. */
let sessionDrift: number | undefined;

export function ledgerLines(): string[] {
  const lines = [
    `Run accounting vs ${GOLD_RUN} (this session only; turncount now ${myTurncount()}` +
      `${sessionDrift ? `; resumed ${sessionDrift} behind` : ""})`,
    "group | tasks | turns | combats | free | done@ | gold@ | Δ",
  ];
  let turns = 0;
  for (const group of order) {
    const row = ledger.get(group);
    if (!row) continue;
    turns += row.turns;
    const gold = goldTurncounts[group];
    const delta =
      gold === undefined ? "" : `${row.lastTurn - gold >= 0 ? "+" : ""}${row.lastTurn - gold}`;
    // The reordered block's Δ compares positions our route reaches in a
    // different sequence from gold's, so it is reported but flagged.
    const note = REORDERED_BLOCK.has(group) ? " (reordered)" : "";
    lines.push(
      `${group} | ${row.tasks} | ${row.turns} | ${row.combats} | ${row.free} | ${row.lastTurn} | ${gold ?? "-"} | ${delta}${note}`,
    );
  }
  lines.push(`total turns this session: ${turns}`);
  return lines;
}

/** Print the ledger and persist it to data/subaqua_lastrun.txt for post-run review. */
export function reportLedger(): void {
  if (order.length === 0) return;
  const lines = ledgerLines();
  for (const line of lines) print(line, "blue");
  bufferToFile(`${lines.join("\n")}\n`, "subaqua_lastrun.txt");
}

function ladderState(): string[] {
  const names = (sources: { name: string; available: () => boolean }[]) =>
    sources
      .filter((source) => {
        try {
          return source.available();
        } catch {
          return false;
        }
      })
      .map((source) => source.name)
      .join(", ") || "(none)";
  return [
    `free kills available: ${names(freeKillSources)}`,
    `free runs available: ${names(freeRunSources)}`,
    `banishes available: ${names(banishSources)}`,
  ];
}

/**
 * Gold guard, called from post() after the ledger is updated. Throws (abort)
 * when this task just spent a paid turn on a group the gold run had already
 * finished more than `goldSlack` turns ago. `gold=false` disables it.
 */
export function assertOnGoldPace(taskName: string, turnsSpent: number): void {
  if (!args.gold || turnsSpent <= 0 || FLOATING.has(taskName)) return;
  const checkpoint = goldCheckpoints[groupOf(taskName)];
  if (checkpoint === undefined) return;
  const now = myTurncount();
  if (sessionDrift === undefined) {
    // NOT `- GUARD_TOLERANCE`: subtracting it here and adding it to `limit`
    // below cancels exactly, and the whole check collapses to
    // `turnsSpent <= goldSlack` — the checkpoint drops out and the tolerance
    // buys nothing. With goldSlack=0 a resumed run then aborts on its first
    // paid turn, which is precisely what drift exists to prevent.
    sessionDrift = Math.max(0, now - turnsSpent - checkpoint);
    if (sessionDrift > 0) {
      print(
        `Gold guard: resuming ${sessionDrift} turns behind ${GOLD_RUN} (turncount ${now - turnsSpent}, ` +
          `${groupOf(taskName)} checkpoint ${checkpoint}); later limits carry that drift.`,
        "yellow",
      );
    }
  }
  const limit = checkpoint + GUARD_TOLERANCE + sessionDrift + args.goldSlack;
  if (now <= limit) return;

  for (const line of ledgerLines()) print(line, "red");
  for (const line of ladderState()) print(line, "red");
  throw (
    `GOLD DEVIATION: ${taskName} spent a turn at turncount ${now}; ${GOLD_RUN} had ${groupOf(taskName)} ` +
    `done by turn ${checkpoint} (tolerance ${GUARD_TOLERANCE} + slack ${args.goldSlack}` +
    `${sessionDrift ? ` + ${sessionDrift} resumed drift` : ""}, ` +
    `limit ${limit}). Stopping before more turns go. ` +
    `Compare against docs/superpowers/research/runs/gold-uts-2026-08-21.log; rerun with goldSlack=N ` +
    `to loosen or gold=false to disable.`
  );
}
