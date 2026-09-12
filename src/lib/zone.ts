// mafia's appearance_rates keys every monster the zone can roll, with the rate itself carrying
// state: -3 banished, -1 ultra-rare, 0 conditional-and-unmet. Membership is the key, never
// the sign; a `> 0` test says a banished monster is not in its own zone, which is exactly the
// case a banish-source check needs to catch (2026-09-12 corral: Feel Hatred re-thrown at the
// rustler while it held the cowboy, releasing the cowboy).
export function inZone(rates: { [monster: string]: number }, name: string | undefined): boolean {
  return name !== undefined && name in rates;
}
