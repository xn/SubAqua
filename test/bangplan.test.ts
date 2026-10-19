import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BANG_LETTERS,
  detectionPotionIndex,
  drinkPlan,
  possibleEffects,
  throwWanted,
  withElimination,
} from "../src/lib/bangplan";

const none: string[] = Array(9).fill("");
const all = (...known: string[]): string[] => [...known, ...Array(9 - known.length).fill("")];

test("throwWanted: nothing known -> throw", () => {
  assert.equal(throwWanted(none), true);
});

test("throwWanted: booze known but teleportitis not -> keep throwing", () => {
  assert.equal(throwWanted(all("inebriety", "healing")), true);
});

test("throwWanted: booze and teleportitis both known -> stop, the rest are drinkable", () => {
  assert.equal(throwWanted(all("blessing", "inebriety", "teleportitis")), false);
});

test("withElimination: eight known fills the ninth like mafia does", () => {
  const known = [
    "blessing",
    "inebriety",
    "confusion",
    "sleepiness",
    "healing",
    "detection",
    "mental acuity",
    "ettin strength",
    "",
  ];
  assert.equal(withElimination(known)[8], "teleportitis");
  assert.equal(throwWanted(known), false);
});

test("possibleEffects: pref wins; else seed candidates; else whatever is unassigned", () => {
  const known = all("inebriety");
  assert.deepEqual([...possibleEffects(0, known, undefined)], ["inebriety"]);
  // Two candidates agree potion 1 is detection ('d' at index 1) and split on potion 2.
  const candidates = ["idtcsembh", "idsctembh"];
  assert.deepEqual([...possibleEffects(1, known, candidates)], ["detection"]);
  assert.deepEqual([...possibleEffects(2, known, candidates)].sort(), [
    "sleepiness",
    "teleportitis",
  ]);
  // No candidates: every unassigned effect.
  assert.equal(possibleEffects(2, known, undefined).size, 8);
  assert.equal(possibleEffects(2, known, undefined).has("inebriety"), false);
});

test("possibleEffects: a candidate contradicting a pref falls back to the pref view", () => {
  const known = all("inebriety", "healing");
  // Candidate says potion 2 is healing, but healing is already potion 1.
  assert.equal(possibleEffects(2, known, ["ihhcsdemb"]).has("healing"), false);
  assert.equal(possibleEffects(2, known, ["ihhcsdemb"]).size, 7);
});

test("drinkPlan: unknowns are drunk only once booze and teleportitis are off the table", () => {
  const held = Array(9).fill(true);
  // Only booze known: any unknown could be teleportitis -> nothing drunk.
  assert.deepEqual(drinkPlan(all("inebriety"), held, undefined), []);
  // Both costly identities thrown (not held): every remaining unknown is safe.
  const known = all("inebriety", "teleportitis");
  const heldRest = [false, false, ...Array(7).fill(true)];
  assert.deepEqual(drinkPlan(known, heldRest, undefined), [2, 3, 4, 5, 6, 7, 8]);
});

test("drinkPlan: an identified potion is drunk only when it is detection", () => {
  const known = all("inebriety", "teleportitis", "detection", "sleepiness");
  const held = [false, false, true, true, true, true, true, true, true];
  assert.deepEqual(drinkPlan(known, held, undefined), [2, 4, 5, 6, 7, 8]);
});

test("drinkPlan: seed pinned -> only the detection potion is worth drinking", () => {
  const known = all("inebriety", "teleportitis");
  const held = [false, false, true, true, true, true, true, true, true];
  const pinned = ["it" + "dsembhc"];
  assert.equal(pinned[0].length, BANG_LETTERS.length);
  assert.deepEqual(drinkPlan(known, held, pinned), [2]);
});

test("drinkPlan: seed candidates split -> drink the safe ones, skip a possible teleportitis", () => {
  const known = all("inebriety");
  const held = [false, ...Array(8).fill(true)];
  // Candidates agree potion 1 is detection and potions 4, 7, 8; they split 2/3 (one of them
  // teleportitis) and 5/6 (confusion vs mental acuity). Agreed non-detection potions add no
  // constraint, so only detection and the safe split pair are drunk.
  const candidates = ["idtsecmbh", "idstemcbh"];
  assert.deepEqual(drinkPlan(known, held, candidates), [1, 5, 6]);
});

test("detectionPotionIndex: from the pref, from agreeing seeds, else undefined", () => {
  assert.equal(detectionPotionIndex(all("inebriety", "detection"), undefined), 1);
  assert.equal(detectionPotionIndex(all("inebriety"), ["idtsecmbh", "idstecmbh"]), 1);
  assert.equal(detectionPotionIndex(all("inebriety"), ["idtsecmbh", "itdsecmbh"]), undefined);
  assert.equal(detectionPotionIndex(none, undefined), undefined);
});
