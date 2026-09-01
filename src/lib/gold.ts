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
 * Checkpoints are read off the gold log's `[N]` markers at each `UTS: phase:`
 * line (docs/…/BRIEF.md has the index): the marker of the NEXT phase's first
 * adventure. Mafia logs `[getCurrentRun()+1]` (KoLAdventure.java:4603-4607)
 * while my_turncount() is getCurrentRun(), so each checkpoint is one turn
 * GENEROUS relative to the turncount the gold run actually had when it left
 * the group — never strict. Groups absent from the table (Init, Wanderers)
 * are unchecked; tasks listed in FLOATING are maintenance steps the route
 * legitimately re-runs late.
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
  Grandpa: 10,
  Outpost: 15,
  Currents: 15,
  Helmet: 16,
  Mom: 16,
  "Shadow Rift": 16,
  Corral: 16,
  "Sorceress Dailies": 16,
  Teflon: 16,
  School: 20,
  Library: 21,
  "Yog-Urt": 22,
  "Gladiator Gear": 30,
  "Skate Park": 30,
  Colosseum: 37,
  "Mom Finish": 40,
  Shub: 41,
  Finale: 42,
};

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

/**
 * Gold's actual turncount when it LEFT a group — what `done@` measures for us,
 * and therefore the only number Δ may be computed against.
 *
 * `goldCheckpoints` is deliberately one turn GENEROUS (see its doc): each
 * entry was read off the marker of the next phase's first adventure, and mafia
 * logs `[getCurrentRun()+1]`. That slack is right for the GUARD — a threshold
 * should never abort a run that is actually on pace — but it was also being
 * printed as `gold@` and subtracted to make Δ, which understated every row by
 * exactly one turn. Live 2026-09-01 the run finished at turncount 45 and the
 * table reported the Finale as `gold@42, Δ +3`; gold's own log ends "Run End
 * Adventures used: 41", so the true figure is +4.
 */
function goldTurncountAt(group: string): number | undefined {
  const checkpoint = goldCheckpoints[group];
  return checkpoint === undefined ? undefined : checkpoint - 1;
}

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
    const gold = goldTurncountAt(group);
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
    sessionDrift = Math.max(0, now - turnsSpent - checkpoint);
    if (sessionDrift > 0) {
      print(
        `Gold guard: resuming ${sessionDrift} turns behind ${GOLD_RUN} (turncount ${now - turnsSpent}, ` +
          `${groupOf(taskName)} checkpoint ${checkpoint}); later limits carry that drift.`,
        "yellow",
      );
    }
  }
  const limit = checkpoint + sessionDrift + args.goldSlack;
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
