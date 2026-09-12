// The seahorse hunt's by-hand plan for one corral fight, from the 2026-09-12 dynamic program
// over the wiki encounter model (80% seahorse rejection, 5-deep queue, refused waffles kept):
//   - a waffle thrown with no other draw standing (last draw, or a tumbleweed) is a repeatable
//     20% seahorse roll: refused and kept on a miss. That is where the LAST waffle belongs.
//   - a waffle thrown with another draw standing is a one-shot 13-16% roll and is consumed;
//     it is worth throwing only as a spare, and only on a draw the macro banishes afterwards.
//   - Spring Kick does not end the fight, so kick + spare waffle + banish is two banishes and
//     a roll in one fight; with a single waffle the kick is only a slower banish, so hold.
// E[adventures] from 3 draws standing: no waffle 4.44, last waffle held 4.09, three waffles with
// the kick 2.85; the vibes line (throw the last waffle after the kick) 4.99.
export type WaffleState = {
  current: "draw" | "tumbleweed";
  othersStanding: number;
  waffles: number;
  kick: boolean;
};

export type HandAction = "kick" | "waffle";

export const WAFFLE_RESERVE = 1;

export function wafflePlan(state: WaffleState): HandAction[] {
  if (state.waffles <= 0) return [];
  if (state.current === "tumbleweed" || state.othersStanding === 0) return ["waffle"];
  if (state.waffles <= WAFFLE_RESERVE) return [];
  return state.kick ? ["kick", "waffle"] : ["waffle"];
}
