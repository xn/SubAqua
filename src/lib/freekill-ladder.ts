// The free-kill ladder a kill rung compiles to. The engine picks ONE source (the first that
// fits the outfit), but a chance-based first source — Darts: Aim for the Bullseye — can miss,
// and a single rung then falls straight to the paid kill: 2026-09-28 t9 (`:1965`) two darts
// missed a Mer-kin healer with two Shattering Punches, the Mob Hit and three X-rays in hand.
// The ladder is the selected source followed by every other source already worn, so a miss
// falls through to a guaranteed kill.

export function killRungLadder<T extends { name: string }>(source: T | undefined, chain: T[]): T[] {
  if (source === undefined) return chain;
  return chain.some((rung) => rung.name === source.name) ? chain : [source, ...chain];
}
