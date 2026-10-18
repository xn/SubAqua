import { bufferToFile, myTurncount, print } from "kolmafia";
import { get, set } from "libram";

import { GOLD_RUN, goldTurncounts } from "./goldrun";

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

export function ledgerLines(): string[] {
  loadLedger();
  const lines = [
    `Run accounting vs ${GOLD_RUN} (whole run; turncount now ${myTurncount()})`,
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
