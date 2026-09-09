import { bufferToFile, myTurncount, print } from "kolmafia";
import { get, set } from "libram";

import { args } from "../args";
import { banishSources } from "../resources/banish";
import { freeKillSources } from "../resources/freekill";
import { freeRunSources } from "../resources/freerun";

export const GOLD_RUN = "SubAqua 2026-09-06 (36 turns)";

// Turncount at which each group finished in the gold run (docs/gold-star-run.txt, the final
// _subaqua_ledger table at the end of the log). The gold run is this script, so the groups
// land in runplan order and the checkpoints apply as-is.
export const goldTurncounts: Record<string, number> = {
  Openers: 2,
  Pellet: 2,
  "Big Brother": 3,
  Grandpa: 6,
  Outpost: 13,
  Currents: 13,
  Helmet: 13,
  Mom: 13,
  "Shadow Rift": 13,
  "Sorceress Dailies": 13,
  Corral: 13,
  Teflon: 13,
  School: 16,
  Library: 18,
  "Yog-Urt": 18,
  "Gladiator Gear": 25,
  "Skate Park": 25,
  Colosseum: 32,
  "Mom Finish": 34,
  Shub: 35,
  Finale: 36,
};

export const goldCheckpoints: Record<string, number> = goldTurncounts;

const GUARD_TOLERANCE = 1;
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

const LEDGER_PREF = "_subaqua_ledger";
type LedgerState = { order: string[]; rows: Record<string, GroupLedger> };
let ledgerLoaded = false;

function loadLedger(): void {
  if (ledgerLoaded) return;
  ledgerLoaded = true;
  const raw = get(LEDGER_PREF, "");
  if (raw === "") return;
  try {
    const state = JSON.parse(raw) as LedgerState;
    for (const group of state.order ?? []) {
      const row = state.rows?.[group];
      if (!row) continue;
      ledger.set(group, row);
      order.push(group);
    }
  } catch {
    print(`Gold ledger: ${LEDGER_PREF} was unreadable; counting from this invocation.`, "yellow");
  }
}

function saveLedger(): void {
  const rows: Record<string, GroupLedger> = {};
  for (const [group, row] of ledger) rows[group] = row;
  set(LEDGER_PREF, JSON.stringify({ order, rows }));
}

export function recordTask(taskName: string, turnsSpent: number, fought: boolean): void {
  loadLedger();
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
  if (!FLOATING.has(taskName)) row.lastTurn = myTurncount();
  saveLedger();
}

export function fightHappened(preCombatStarted: string): boolean {
  return get("_lastCombatStarted") !== preCombatStarted;
}

let sessionDrift: number | undefined;

export function ledgerLines(): string[] {
  loadLedger();
  const lines = [
    `Run accounting vs ${GOLD_RUN} (whole run; turncount now ${myTurncount()}` +
      `${sessionDrift ? `; this invocation resumed ${sessionDrift} behind` : ""})`,
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
    lines.push(
      `${group} | ${row.tasks} | ${row.turns} | ${row.combats} | ${row.free} | ${row.lastTurn} | ${gold ?? "-"} | ${delta}`,
    );
  }
  const unattributed = myTurncount() - turns;
  const gap =
    unattributed > 0
      ? ` (+${unattributed} unattributed: spent before the ledger's first task, or by hand)`
      : "";
  lines.push(`total turns this run: ${turns}${gap}`);
  return lines;
}

export function reportLedger(): void {
  loadLedger();
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
  const group = groupOf(taskName);
  const burn = group === "Library" || group === "Yog-Urt" ? get("_subaqua_dreadBurn", 0) : 0;
  const limit = checkpoint + GUARD_TOLERANCE + sessionDrift + args.goldSlack + burn;
  if (now <= limit) return;

  for (const line of ledgerLines()) print(line, "red");
  for (const line of ladderState()) print(line, "red");
  throw (
    `GOLD DEVIATION: ${taskName} spent a turn at turncount ${now}; ${GOLD_RUN} had ${groupOf(taskName)} ` +
    `done by turn ${checkpoint} (tolerance ${GUARD_TOLERANCE} + slack ${args.goldSlack}` +
    `${burn ? ` + ${burn} dreadscroll burn` : ""}` +
    `${sessionDrift ? ` + ${sessionDrift} resumed drift` : ""}, ` +
    `limit ${limit}). Stopping before more turns go. ` +
    `Compare against docs/gold-star-run.txt; rerun with goldSlack=N ` +
    `to loosen or gold=false to disable.`
  );
}
