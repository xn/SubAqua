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
 * WHAT A CHECKPOINT IS, exactly: gold's TRUE turncount when it left the group.
 * Nothing else. The table was previously read off the `[N]` marker at each
 * `UTS: phase:` banner, which mafia logs as `[getCurrentRun()+1]`
 * (KoLAdventure.java:4603-4607) and which does NOT advance on a free fight —
 * so entries silently mixed `gold_end` and `gold_end + 1`, and the ledger
 * subtracted them as if they were uniform. Measured against the per-zone paid
 * -turn ledger rebuilt from the gold log (which sums to exactly 41): Grandpa,
 * School, Library and Finale were one high while Outpost, Colosseum, Mom
 * Finish and Shub were exact, so no single offset could fix the table. It is
 * re-derived here from that ledger, cumulatively:
 *
 *   Haunted Pantry 5 -> 5 | Wreck 1 -> 6 | Marinara 3 -> 9 | Outpost 6 -> 15 |
 *   Corral 0 -> 15 | School 4 -> 19 | Library 1 + dreadscroll 1 -> 21 |
 *   Skate Park 4 -> 25 | Right Door 1 -> 26 | Gymnasium 4 -> 30 |
 *   Colosseum 7 -> 37 | Abyss 3 -> 40 | Left Door 1 -> 41 | Center Door 0 -> 41
 *
 * The one-turn generosity the old marker convention gave by accident is now
 * explicit and applies uniformly: the GUARD adds MARKER_SLACK, the ledger
 * prints the checkpoint raw. A guard should never abort a run that is actually
 * on pace; a scoreboard should never flatter one.
 *
 * UNCHECKED GROUPS. Init and Wanderers have no gold analogue. Yog-Urt,
 * Gladiator Gear and Skate Park are unchecked for a different reason: our route
 * runs them in a DIFFERENT ORDER from gold, which does Skate Park (22-25) then
 * the Right Door (26) then the Gymnasium (27-30) while we do Yog-Urt then the
 * gym then the park. A positional checkpoint cannot be valid for both
 * orderings, and pretending otherwise is what produced the 2026-09-01 ledger's
 * impossible pair — `Skate Park -2` sitting next to `Gladiator Gear +1`. Their
 * turns are still counted in the total; only the per-group Δ is withheld.
 * Tasks listed in FLOATING are maintenance steps the route legitimately
 * re-runs late.
 *
 * Resuming after an abort: the first paid turn of an invocation sets a
 * session drift = how far past its checkpoint the run already was, and every
 * later limit carries that drift. Without it a run that tripped once could
 * never spend another turn in that group, and the only way on would be
 * goldSlack big enough to blind every later checkpoint too. The accounting
 * table still shows the raw Δ against gold.
 */
export const GOLD_RUN = "UTS 2026-08-21 (41 turns)";

export const goldCheckpoints: Record<string, number> = {
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
  // "Yog-Urt", "Gladiator Gear" and "Skate Park": deliberately absent — see
  // UNCHECKED GROUPS above. Gold's are 26 / 30 / 25, in that order; ours is
  // Yog-Urt, gym, park, so the numbers do not transfer.
  Colosseum: 37,
  "Mom Finish": 40,
  Shub: 41,
  Finale: 41,
};

/** The turn of slack every guard limit carries, so a checkpoint is never
 * strict. Explicit now that the checkpoints themselves are exact; it used to
 * be an accident of the `[N]` marker convention, applied unevenly. */
const MARKER_SLACK = 1;
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
  row.lastTurn = myTurncount();
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
    const gold = goldCheckpoints[group];
    const delta =
      gold === undefined ? "" : `${row.lastTurn - gold >= 0 ? "+" : ""}${row.lastTurn - gold}`;
    lines.push(
      `${group} | ${row.tasks} | ${row.turns} | ${row.combats} | ${row.free} | ${row.lastTurn} | ${gold ?? "-"} | ${delta}`,
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
    sessionDrift = Math.max(0, now - turnsSpent - checkpoint - MARKER_SLACK);
    if (sessionDrift > 0) {
      print(
        `Gold guard: resuming ${sessionDrift} turns behind ${GOLD_RUN} (turncount ${now - turnsSpent}, ` +
          `${groupOf(taskName)} checkpoint ${checkpoint}); later limits carry that drift.`,
        "yellow",
      );
    }
  }
  const limit = checkpoint + MARKER_SLACK + sessionDrift + args.goldSlack;
  if (now <= limit) return;

  for (const line of ledgerLines()) print(line, "red");
  for (const line of ladderState()) print(line, "red");
  throw (
    `GOLD DEVIATION: ${taskName} spent a turn at turncount ${now}; ${GOLD_RUN} had ${groupOf(taskName)} ` +
    `done by turn ${checkpoint} (slack ${args.goldSlack}${sessionDrift ? ` + ${sessionDrift} resumed drift` : ""}, ` +
    `limit ${limit}). Stopping before more turns go. ` +
    `Compare against docs/superpowers/research/runs/gold-uts-2026-08-21.log; rerun with goldSlack=N ` +
    `to loosen or gold=false to disable.`
  );
}
