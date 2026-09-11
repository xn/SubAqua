/**
 * Paid-turn limits. grimoire's `limit.turns` reads `Location.turnsSpent`, which counts every
 * adventure in the zone: free Back-Up copies, free kills and noncombats included. A lane that
 * runs mostly on free fights (the school farm) blows that limit after a handful of real turns.
 * `limit.paidTurns` instead sums the task's turncount deltas across its executions, so only
 * turns the run actually paid count against it.
 */
export class PaidTurnTally {
  private spent = new Map<string, number>();

  add(taskName: string, turns: number): number {
    const total = this.get(taskName) + turns;
    this.spent.set(taskName, total);
    return total;
  }

  get(taskName: string): number {
    return this.spent.get(taskName) ?? 0;
  }
}

export function paidTurnLimitFailure(
  taskName: string,
  spent: number,
  limit: number | undefined,
  message?: string,
): string | undefined {
  if (limit === undefined || spent < limit) return undefined;
  const failureMessage = message ? ` ${message}` : "";
  return `Task ${taskName} did not complete within ${limit} paid turns. Please check what went wrong.${failureMessage}`;
}
