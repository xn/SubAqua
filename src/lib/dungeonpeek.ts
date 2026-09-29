// The Daily Dungeon as a dreadscroll clue. The room order is seeded like the bang potions, so
// two candidate seeds that agree on potions and seahorse name usually disagree on room 1
// (2026-09-23 seedfinder chat: TTTD_... vs DTDT_...). Room 1 is a free look: a door room has
// "Leave the way you came in.", a trap room "Proceed backwards cautiously" (wiki: no turn, no
// progress), a monster room is a fight to run from. Rooms past the first need a completed room
// each, so only the room the counter points at is ever peeked here.

const CHESTS = new Set([5, 10, 15]);

/** seedfinder's 4_4_4 print of the twelve shuffled rooms; the chest rooms are fixed and absent. */
export function formatDungeonLayout(rooms: string): string {
  return `${rooms.slice(0, 4)}_${rooms.slice(4, 8)}_${rooms.slice(8, 12)}`;
}

/** Index into the 14-char layout (mafia's dailyDungeonRooms) of the room the counter
 *  (_lastDailyDungeonRoom = rooms completed) will show next; undefined at a chest or the end. */
export function nextRoomIndex(lastRoom: number): number | undefined {
  const room = lastRoom + 1;
  if (room < 1 || room > 14 || CHESTS.has(room)) return undefined;
  // The underscores sit where the chest rooms would, so the offset is uniform.
  return room - 1;
}

export function isDungeonPref(pref: string): boolean {
  return /^[MDT?]{4}_[MDT?]{4}_[MDT?]{4}$/.test(pref);
}

/** True when the next room is still unknown and the candidate layouts disagree on it. */
export function peekSplits(layouts: string[], pref: string, lastRoom: number): boolean {
  if (layouts.length < 2) return false;
  const index = nextRoomIndex(lastRoom);
  if (index === undefined) return false;
  if (isDungeonPref(pref) && pref[index] !== "?") return false;
  const first = layouts[0][index];
  return layouts.some((layout) => layout[index] !== first);
}

/** True when any candidate puts a monster in the next room, so the peek needs a free run. */
export function peekMayFight(layouts: string[], lastRoom: number): boolean {
  const index = nextRoomIndex(lastRoom);
  if (index === undefined) return false;
  return layouts.some((layout) => layout[index] === "M");
}
