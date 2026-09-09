import assert from "node:assert/strict";
import { test } from "node:test";

import {
  agreedClues,
  burnTurns,
  Candidate,
  filterByClues,
  filterByGuesses,
  hamming,
  parseGuesses,
  pickGuess,
  splitsOn,
  unknownClues,
  worstWrongWords,
} from "../src/lib/dreadguess";

const A: Candidate = { seed: 2480686, scroll: [1, 2, 4, 1, 3, 1, 2, 1] };
const B: Candidate = { seed: 4967741, scroll: [4, 4, 3, 1, 3, 3, 3, 3] };
const C: Candidate = { seed: 9085813, scroll: [4, 4, 2, 1, 3, 3, 3, 1] };

test("parseGuesses reads mafia's code:incorrect list", () => {
  assert.deepEqual(parseGuesses(""), []);
  assert.deepEqual(parseGuesses("44413333:2"), [{ code: [4, 4, 4, 1, 3, 3, 3, 3], incorrect: 2 }]);
  assert.deepEqual(
    parseGuesses("11111111:8,44413333:0").map((g) => g.incorrect),
    [8, 0],
  );
});

test("hamming counts differing positions", () => {
  assert.equal(hamming(A.scroll, B.scroll), 6);
  assert.equal(hamming(B.scroll, C.scroll), 2);
});

test("filterByGuesses keeps candidates whose distance equals the recorded miss count", () => {
  const guessed = "12413121:6";
  assert.deepEqual(
    filterByGuesses([A, B, C], guessed).map((c) => c.seed),
    [B.seed],
  );
  assert.deepEqual(filterByGuesses([A, B, C], "").length, 3);
});

test("filterByClues drops candidates that contradict a known clue", () => {
  assert.deepEqual(
    filterByClues([A, B, C], [0, 0, 4, 0, 0, 0, 0, 0]).map((c) => c.seed),
    [A.seed],
  );
});

test("agreedClues is the digit shared by every candidate, else 0", () => {
  assert.deepEqual(agreedClues([A, B]), [0, 0, 0, 1, 3, 0, 0, 0]);
  assert.deepEqual(agreedClues([B]), B.scroll);
  assert.deepEqual(agreedClues([]), [0, 0, 0, 0, 0, 0, 0, 0]);
});

test("unknownClues are the positions still 0 after inference", () => {
  assert.deepEqual(unknownClues([A, B], [0, 0, 4, 1, 3, 0, 0, 0]), [1, 2, 6, 7, 8]);
  assert.deepEqual(unknownClues([B], [0, 0, 0, 0, 0, 0, 0, 0]), []);
  assert.deepEqual(unknownClues([], [0, 0, 4, 0, 0, 0, 0, 0]), [1, 2, 4, 5, 6, 7, 8]);
});

test("splitsOn is true only where the candidates disagree", () => {
  assert.equal(splitsOn([A, B], 4), false);
  assert.equal(splitsOn([A, B], 7), true);
  assert.equal(splitsOn([B], 7), false);
});

test("pickGuess minimises expected wrong words and worstWrongWords bounds the miss", () => {
  const guess = pickGuess([B, C]);
  assert.ok([B.scroll, C.scroll].some((s) => s.join("") === guess.join("")));
  assert.equal(worstWrongWords([B, C], guess), 2);
  assert.equal(worstWrongWords([A, B], A.scroll), 6);
  assert.equal(worstWrongWords([B], B.scroll), 0);
});

test("burnTurns is 3 per wrong word minus the read's own tick", () => {
  assert.equal(burnTurns(0), 0);
  assert.equal(burnTurns(1), 2);
  assert.equal(burnTurns(5), 14);
});
