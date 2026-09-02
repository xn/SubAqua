import { Location } from "kolmafia";

export type ChargeReservation = {
  name: string;
  count: number;
  sites: Location[];
  needed: () => boolean;
};

export function activeHolders(
  reservations: readonly ChargeReservation[],
  location: Location | undefined,
): ChargeReservation[] {
  return reservations
    .filter((reservation) => !(location && reservation.sites.includes(location)))
    .filter((reservation) => reservation.needed());
}
