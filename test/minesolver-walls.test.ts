// Every Anemone Mine wall this account has logged (test/fixtures/anemone-walls.json: the final
// mineState3 / mineLayout3 of each wall, taken from mafia's pref-reset lines when the next
// ascension first visits the mine) must be admitted by the vein solver's model: at least one
// (teflon, velcro, vinyl) triple of disjoint 4-connected veins in rows 1-4 fits what the wall
// showed. The fixture is checked without Object Detection only: a final wall's exposure comes
// from its open squares, and unexposed twinkles were never visible, so `detection: true` would
// wrongly read every unexposed undug square as rock.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { observe, posterior } from "../src/lib/minesolver";

type Wall = { state: string; layout: string; source: string };

const here = dirname(fileURLToPath(import.meta.url));
const walls: Wall[] = JSON.parse(
  readFileSync(join(here, "fixtures", "anemone-walls.json"), "utf8"),
);

/**
 * Walls (by mineState3) the model is known not to admit; each is a real wall from the logs that
 * contradicts the three-disjoint-veins model. Empty means every logged wall fits.
 */
const KNOWN_MODEL_VIOLATIONS: string[] = [];

function describeWall(wall: Wall): string {
  const rows: string[] = [];
  for (let r = 0; r < 6; r++) rows.push(wall.state.slice(r * 6, r * 6 + 6));
  const found: string[] = [];
  const re = /#(\d+)<img src="[^"]*\/([a-z0-9]+)\.gif"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(wall.layout)) !== null) {
    const which = parseInt(m[1], 10);
    found.push(`r${Math.floor(which / 8)}c${which % 8}=${m[2]}`);
  }
  return `${wall.source}\n${rows.join("\n")}\n${found.join(" ")}`;
}

test("the fixture holds at least 40 distinct walls", () => {
  assert.ok(walls.length >= 40, `only ${walls.length} walls`);
  const keys = new Set(walls.map((w) => `${w.state}|${w.layout}`));
  assert.equal(keys.size, walls.length, "duplicate walls in the fixture");
  for (const w of walls) assert.equal(w.state.length, 36, `${w.source}: state is not 36 chars`);
});

test("every known violation is a wall in the fixture", () => {
  const states = new Set(walls.map((w) => w.state));
  for (const s of KNOWN_MODEL_VIOLATIONS) assert.ok(states.has(s), `not in the fixture: ${s}`);
});

for (const wall of walls) {
  const known = KNOWN_MODEL_VIOLATIONS.includes(wall.state);
  test(
    `the model admits the ${wall.source} wall ${wall.state}`,
    { skip: known && "known violation" },
    () => {
      const post = posterior(observe(wall.state, wall.layout, false));
      assert.ok(
        post.mass > 0,
        `no vein triple fits:\n${describeWall(wall)}\ncounts ${JSON.stringify(post.counts)}`,
      );
    },
  );
}
