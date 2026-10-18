// Lutz's once-a-day Fishy (30 turns, `_skateBuff1`) is claimable once `skateParkStatus` reads
// "ice". The pref only moves when the park page is visited, and the war-ending adventure runs
// inside a task's `do` while the visit used to live in its `completed`, which grimoire runs
// afterwards: a check right after the adventure always saw "war". So a check that finds the war
// still on refreshes the page itself before reading again.
export type IceBuffIo = {
  /** `skateParkStatus`. */
  status: () => string;
  /** Visit the park page so the status pref is current. */
  refresh: () => void;
  /** `_skateBuff1`. */
  claimed: () => boolean;
  /** Take the buff from Lutz. */
  claim: () => void;
};

/** Claims Lutz's buff if the park is (or has just become) iced; true when it was claimed. */
export function claimIceBuffWith(io: IceBuffIo): boolean {
  if (io.claimed()) return false;
  if (io.status() === "war") io.refresh();
  if (io.status() !== "ice") return false;
  io.claim();
  return true;
}
