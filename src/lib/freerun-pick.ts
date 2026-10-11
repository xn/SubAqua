// Pure helpers behind resources/freerun selectFreeRun, kept kolmafia-free for the test suite.

/**
 * The monster a banish source currently holds, read from mafia's `banishedMonsters`
 * ("monster:banisher:turn:monster:banisher:turn…"). mafia writes the banisher as the skill or
 * item name, sometimes lower-cased ("snokebomb"), so the match ignores case.
 */
export function banisherHolds(pref: string, banisher: string): string | undefined {
  const parts = pref.split(":");
  const wanted = banisher.toLowerCase();
  for (let i = 0; i + 1 < parts.length; i += 3) {
    if (parts[i] && parts[i + 1].toLowerCase() === wanted) return parts[i];
  }
  return undefined;
}

/**
 * Whether a banishing free run may be thrown. Re-throwing a source that holds a monster of
 * this zone releases that monster (2026-09-12 corral), so it is refused while the banish is
 * worth keeping. In a 100%-combat zone a banish only changes which monster shows up, never
 * how many fights there are (2026-10-05 gym: two Snokebomb charges sat unused while shadow
 * bricks and paid kills covered the fights), so there the run is taken regardless.
 */
export function banishRunAllowed(opts: { heldInZone: boolean; banishValue: boolean }): boolean {
  return !(opts.heldInZone && opts.banishValue);
}

/** Reflex Hammer charges left today: three with the Lil' Doctor™ bag, none without it. */
export function reflexHammerRemaining(used: number, haveBag: boolean): number {
  return haveBag ? Math.max(0, 3 - used) : 0;
}
