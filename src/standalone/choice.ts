import {
  abort,
  availableAmount,
  availableChoiceOptions,
  getProperty,
  handlingChoice,
  lastChoice,
  print,
  runChoice,
} from "kolmafia";
import { $item, get, have, set, ValueOf } from "libram";

import { peridotTargetId } from "../resources/peridot";

/**
 * Ash stashboxCheck (CH:9-20): walk the per-lockkey-monster search order,
 * answering the first hut location not yet checked today. Choices 313-315
 * have no mafia tracking (ChoiceAdventures.java:2174-2177) — the record is
 * ours alone, in _subaqua_stashbox_checked (comma-joined option list; the
 * comma-wrap test keeps exact matching). Solely owned by this bundle.
 */
function stashboxCheck(order: number[]): void {
  const checked = get("_subaqua_stashbox_checked", "");
  for (const option of order) {
    if (`,${checked},`.includes(`,${option},`)) continue;
    runChoice(option);
    set("_subaqua_stashbox_checked", checked === "" ? `${option}` : `${checked},${option}`);
    return;
  }
  // All three checked and the choice fired again: answer *something*
  // (invariant: every handler branch answers) — the outpost task aborts on
  // this state before spending another turn.
  runChoice(order[0]);
}

export function main(choice: number, page: string) {
  const options: { [key: number]: string } = availableChoiceOptions();

  if (choice === 923 && options[5]) {
    runChoice(5); // All Over the Map (The Black Forest)
  } else if (choice === 780 && options[4]) {
    runChoice(4); // Action Elevator
  } else if (choice === 785 && options[4]) {
    runChoice(4); // Air Apparent
  } else if (choice === 788 && options[2]) {
    runChoice(2); // Life is Like a Cherry of Bowls
  } else if (choice === 691 && options[4]) {
    runChoice(4); // Second Chest
  } else if (choice === 1322) {
    // If NEP quest is food or booze
    if (
      getProperty("_questPartyFairQuest") === "food" ||
      getProperty("_questPartyFairQuest") === "booze"
    ) {
      runChoice(1); // Accept
    } else {
      runChoice(2); // Decline
    }
  }
  // Random Lack of an Encounter
  else if (choice === 182) {
    if (options[4] && !have($item`model airship`)) {
      // Pick up a model airship
      runChoice(4);
    } else if (options[6]) {
      // Bat Wings Skip
      runChoice(6);
    }
  }
  // Everfull dart handling
  else if (choice === 1525) {
    const priority: { [key: string]: number } = {
      "Throw a second dart quickly": 60,
      "Deal 25-50% more damage": 800,
      "You are less impressed by bullseyes": 10,
      "25% Better bullseye targeting": 20,
      "Extra stats from stats targets": 40,
      "Butt awareness": 30,
      "Add Hot Damage": 1000,
      "Add Cold Damage": 31,
      "Add Sleaze Damage": 1000,
      "Add Spooky Damage": 1000,
      "Add Stench Damage": 1000,
      "Expand your dart capacity by 1": 50,
      "Bullseyes do not impress you much": 9,
      "25% More Accurate bullseye targeting": 19,
      "Deal 25-50% extra damage": 10000,
      "Increase Dart Deleveling from deleveling targets": 100,
      "Deal 25-50% greater damage": 10000,
      "25% better chance to hit bullseyes": 18,
    };

    let currentScore = 999999999;
    let choiceToRun = 1;

    for (const [option, optionText] of Object.entries(options)) {
      if (!priority[optionText]) {
        print(`dart perk "${optionText}" not in priority list`, "red");
        continue;
      }

      if (priority[optionText] >= currentScore) {
        continue;
      }

      currentScore = priority[optionText];
      choiceToRun = parseInt(option);
    }

    runChoice(choiceToRun);
  }
  // Tavern NCs
  else if ((choice === 496 || choice === 513 || choice === 514 || choice === 515) && options[2]) {
    // Manually select this option if avilable, in case we increased elemental dmg in prepare
    runChoice(2);
  }
  // Lil Doctor bag NC
  else if (choice === 1340) {
    runChoice(3);
  }
  //Sea stuff
  else if (choice === 1565) {
    runChoice(1);
  } else if (choice === 312) {
    // Post-currents the outpost hut becomes a shop; option 3 opens the healer
    // stock (ash CH:55-59). Otherwise mafia auto-writes choiceAdventure312
    // from the lockkey drop (ResultProcessor.java:2271-2283); 3 = healer default.
    if (get("intenseCurrents")) {
      runChoice(3);
    } else {
      const lockkeyChoice = parseInt(getProperty("choiceAdventure312") || "3");
      runChoice(lockkeyChoice >= 1 && lockkeyChoice <= 3 ? lockkeyChoice : 3);
    }
  } else if (choice === 313) {
    stashboxCheck([1, 3, 2]); // burglar lockkey search order (ash CH:61)
  } else if (choice === 314) {
    stashboxCheck([1, 2, 3]); // raider (CH:62)
  } else if (choice === 315) {
    if (get("intenseCurrents")) {
      // Post-currents shopping (CH:63-75): beads, then dreadscroll spading
      // scrolls (mafia parses clues 2/5 from thrown heal/killscrolls), then
      // beads again — never leave the choice unanswered.
      if (availableAmount($item`Mer-kin prayerbeads`) < 3) runChoice(3);
      else if (availableAmount($item`Mer-kin killscroll`) === 0 && get("dreadScroll5", 0) === 0)
        runChoice(1);
      else if (availableAmount($item`Mer-kin healscroll`) === 0 && get("dreadScroll2", 0) === 0)
        runChoice(2);
      else runChoice(3);
    } else {
      stashboxCheck([3, 1, 2]); // healer (CH:63-79)
    }
  } else if (choice === 396) {
    // Woolly Scaly Bully: option 3 unlocks the janitor's closet (monitor
    // fights, ChoiceControl.java:5084-5089); other options just lose HP.
    runChoice(3);
  } else if (choice === 397) {
    // Bored of Education: option 2 unlocks the bathrooms (wordquiz NC 401,
    // ChoiceControl.java:5091-5096).
    runChoice(2);
  } else if (choice === 398) {
    // A Mer-kin Graffiti: option 1 unlocks the teacher's lounge — the
    // merkinElementaryTeacherUnlock the library route needs
    // (ChoiceControl.java:5098-5103).
    runChoice(1);
  } else if (choice === 399) {
    // The Case of the Closet: fight the Mer-kin monitor (cheatsheet source);
    // ash CH:126-131 takes option 1 too.
    runChoice(1);
  } else if (choice === 400) {
    // No Rest for the Room: fight the Mer-kin teacher (ash CH:126-131).
    runChoice(1);
  } else if (choice === 401) {
    // Raising Cane: option 2 takes a Mer-kin wordquiz (ash CH:134-140).
    runChoice(2);
  } else if (choice === 701) {
    // Ators Gonna Ate (Gymnasium): option 1 takes the item
    // (ChoiceAdventures.java:3612-3619; ash simple-case list CH:44,55).
    runChoice(1);
  } else if (choice === 705) {
    // Halls Passing in the Night: option 4 takes a wordquiz; mafia already
    // deducted the hallpass on visit (ChoiceControl.java:7290-7291).
    runChoice(4);
  } else if (choice === 1562) {
    const getPriority = (option: string): number => MOBIUS_PRIORITIES[option as MobiusOption];
    const bestChoice = Object.entries(options).reduce((a, b) =>
      getPriority(a[1]) <= getPriority(b[1]) ? a : b,
    )[0];
    runChoice(Number(bestChoice));
  } else if (choice === 704) {
    const libraryOptions = get("merkinCatalogChoices").split(",");
    for (const option of libraryOptions) {
      const [_, choiceNum, status] = option.split(":");
      if (status === "unknown") {
        runChoice(parseInt(choiceNum));
        return;
      }
    }
    // All entries known: take the first card (stats) rather than stalling the choice.
    runChoice(1);
  } else if (choice === 703) {
    const bestGuess = getDreadscrollGuess();
    const extra = `pro1=${bestGuess[0]}&pro2=${bestGuess[1]}&pro3=${bestGuess[2]}&pro4=${bestGuess[3]}&pro5=${bestGuess[4]}&pro6=${bestGuess[5]}&pro7=${bestGuess[6]}&pro8=${bestGuess[7]}`;
    runChoice(1, extra);
  } else if (choice === 310) {
    // The Economist of Scales re-presents itself after every trade, and
    // mafia invokes this script ONCE per choice number: when the page comes
    // back as 310 again it falls through to the pref-based automation
    // (ChoiceManager.java:268-290), and choiceAdventure310=0 means "Manual
    // control requested" — live 2026-08-28, one pristine in, run aborted.
    // So drain the trades here: 10 rough -> 1 pristine (option 2) while
    // the rough scales last, then leave (option 6). Bounded so a trade that
    // silently fails can't spin.
    for (let trades = 0; handlingChoice() && lastChoice() === 310 && trades < 30; trades++) {
      runChoice(have($item`rough fish scale`, 10) ? 2 : 6);
    }
  } else if (choice === 1599) {
    // Legendary Digestion (legendary pasta wand's Summon Legendary Noodles;
    // ChoiceControl.java:6884-6894 case 1599 — options 1-5 are Spleen /
    // Amygdala / Skin / Heart / Stomach). Option 1 sets
    // _legendaryNoodlesSpleen and banks a free spleen point; user rule: it
    // should always be that.
    runChoice(1);
  } else if (choice === 1557) {
    // Peering Through Your Peridot. ChoiceManager.invokeChoiceAdventureScript
    // (mafia) runs this script BEFORE its own pref-based auto-answer, for
    // EVERY occurrence of a choice — so when engine.ts has already
    // registered a vetted choiceAdventure1557 answer (peridot.ts
    // peridotTargetOffered(): equipped only once appearanceRates(location,
    // true) actually lists the target), do nothing and let that answer
    // through unchanged.
    if (getProperty("choiceAdventure1557")) return;
    // No vetted answer on file: the peridot opened this menu outside the
    // engine's own gate. Resolve narrowly and NEVER resubmit an unlisted id
    // on a loop — that resubmit loop is the live bug (hundreds of repeated
    // "Took choice 1557/1" lines with no progress once KoL stops offering
    // the monster). The bandersnatch id is present in the raw response even
    // though its button label isn't (ChoiceAdventures.java
    // decorateMonsterMap relabels display text only, keyed off the id, for
    // the relay browser).
    const wanted = peridotTargetId();
    const firstMatch = /name="bandersnatch" value="(\d+)"/.exec(page);
    const firstOffered = firstMatch ? Number(firstMatch[1]) : undefined;
    if (wanted !== undefined && firstOffered === wanted) {
      runChoice(1, `bandersnatch=${wanted}`);
    } else {
      abort(
        "Peridot of Peril's monster menu (choice 1557) has no vetted target; pick a listed monster in the relay browser, then rerun.",
      );
    }
  }
}

/**
 * dreadScrollGuesses is mafia's guess log: comma-joined
 * `<8-digit-guess>:<wrong-count>` entries. Pull out just the codes we've
 * already submitted, so fallback guesses can avoid repeating one.
 */
function parseGuessedCodes(): Set<string> {
  const guessed = new Set<string>();
  const pastGuesses = get("dreadScrollGuesses");
  if (pastGuesses) {
    for (const guess of pastGuesses.split(",")) {
      const [code] = guess.split(":");
      if (code) guessed.add(code);
    }
  }
  return guessed;
}

/**
 * Build a guess from the known clues (unknown positions default to "1"),
 * then — if that guess was already submitted per dreadScrollGuesses —
 * perturb the unknown positions like a base-4 odometer (digits 1->2->3->4,
 * carrying into the next-lowest-index unknown on overflow) until we find a
 * guess not yet tried. Used when there are too many unknowns to enumerate
 * (F10) and when guess history is contradictory, so neither fallback path
 * submits the identical wrong guess on every attempt and burns Deep-Tainted
 * Mind cycles for nothing. If every combination has already been guessed,
 * fall through and return the last one anyway — a branch must still always
 * answer.
 */
function fallbackGuess(unknowns: number[]): string {
  const digits = Array.from({ length: 8 }, (_, i) => get(`dreadScroll${i + 1}`, 0) || 1);
  const guessed = parseGuessedCodes();
  let candidate = digits.join("");
  if (unknowns.length === 0 || !guessed.has(candidate)) return candidate;

  const totalCombos = Math.pow(4, unknowns.length);
  for (let attempt = 1; attempt < totalCombos; attempt++) {
    let carry = 1;
    for (const pos of unknowns) {
      if (carry === 0) break;
      const idx = pos - 1;
      digits[idx] += carry;
      carry = 0;
      if (digits[idx] > 4) {
        digits[idx] = 1;
        carry = 1;
      }
    }
    candidate = digits.join("");
    if (!guessed.has(candidate)) return candidate;
  }
  return candidate;
}

function getDreadscrollGuess(): string {
  const unknowns: number[] = [];
  for (let i = 1; i <= 8; i++) {
    if (get(`dreadScroll${i}`, 0) === 0) unknowns.push(i);
  }
  if (unknowns.length > 5) {
    // Too blind to enumerate: 4^n candidates explodes past n=5 (4^6=4096
    // is fine, but the scoring loop below is O(n^2) over the candidate
    // pool and 4^7-4^8 hangs Rhino). The route never uses the scroll this
    // blind (clues 1/6/8 gate acquisition), but a manual `use` shouldn't
    // hang. Answer the known clues plus a guess-history-aware fallback
    // (F10) instead of enumerating.
    return fallbackGuess(unknowns);
  }

  let possibleCodes: string[] = [""];
  for (let i = 1; i <= 8; i++) {
    const currentClue = get(`dreadScroll${i}`, 0);
    if (currentClue !== 0) {
      for (let j = 0; j < possibleCodes.length; j++) {
        possibleCodes[j] = possibleCodes[j] + currentClue;
      }
    } else {
      // Unknown clue: branch into all possibilities
      const newCodes: string[] = [];
      for (const code of possibleCodes) {
        for (let digit = 1; digit <= 4; digit++) {
          newCodes.push(code + digit);
        }
      }
      possibleCodes = newCodes;
    }
  }
  const pastGuesses = get("dreadScrollGuesses");
  if (pastGuesses) {
    const guesses = pastGuesses.split(",");
    for (const guess of guesses) {
      const [code, incorrectStr] = guess.split(":");
      const incorrectCount = parseInt(incorrectStr);

      // filter out all codes that don't match previous dreadscroll guesses
      possibleCodes = possibleCodes.filter((candidate) => {
        let differences = 0;
        for (let i = 0; i < 8; i++) {
          if (candidate[i] !== code[i]) {
            differences++;
          }
        }
        return differences === incorrectCount;
      });
    }
  }
  if (possibleCodes.length === 0) {
    // Contradictory guess history (e.g. a pref was hand-edited by hand);
    // bestCode would be undefined below. Fall back to known clues plus a
    // guess-history-aware perturbation (F10) rather than submitting
    // "undefined".
    return fallbackGuess(unknowns);
  }
  // Choose the code that minimizes expected errors among possible codes
  let bestCode = possibleCodes[0];
  let minExpectedErrors = 8;
  for (const candidate of possibleCodes) {
    let expectedErrors = 0;
    for (let pos = 0; pos < 8; pos++) {
      const candidateDigit = candidate[pos];
      let matchCount = 0;
      for (const possible of possibleCodes) {
        if (possible[pos] === candidateDigit) {
          matchCount++;
        }
      }
      // Probability this position is wrong
      const errorProb = 1 - matchCount / possibleCodes.length;
      expectedErrors += errorProb;
    }

    if (expectedErrors < minExpectedErrors) {
      minExpectedErrors = expectedErrors;
      bestCode = candidate;
    }
  }
  print(`Possible codes: ${possibleCodes}`);
  print(`Best guess: ${bestCode}`);
  return bestCode;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MOBIUS_BASE_TO_RES = {
  "Borrow a cup of sugar from yourself": "Return the sugar you borrowed",
  "Draw a goatee on yourself": "Succumb to evil",
  "Stop your arch-nemesis as a baby": "Go back and make the Naughty Sorceress naughty again",
  "Defend yourself": "Assassinate yourself",
  "Take the long odds on the trifecta": "Fix the race and also fix the race.",
  "Plant some seeds in the distant past": "Chop down some trees",
  "Give your past self investment tips": "Steal from your future self",
  "Steal a cupcake from young Susie": "Bake Susie a cupcake",
  "Play Schroedinger's Prank on yourself": "Check your pocket",
  "Shoot yourself in the foot": "Get shot in the foot",
  "Meet your parents when they were young": "Fix your parents' relationship",
  "Go back and take a 20-year-long nap": "Go back and set an alarm",
  "Lift yourself up by your bootstraps": "Let yourself get lifted up by your bootstraps",
  "Go back and write a best-seller.": "Replace your novel with AI drivel",
  "Peek in on your future": "Make yourself forget",
  "Steal a club from the past": "Prevent the deadly seal invasion",
  "Mind your own business": "Sit and write in your journal",
  "Plant some trees and harvest them in the future": "Teach hippies to make jams and jellies",
  "Go for a nature walk": "Go back in time and kill a butterfly",
  "Hey, free gun!": "Sell the gun",
  "Make friends with a famous poet": "Make enemies with a famous poet",
  "Cheeze it, it's the pigs!": "Aiding and abetterment",
  "Borrow meat from your future": "Repay yourself in the past",
  "I'm not messing with the timeline!": "I'm not messing with the timeline!",
} as const;

type MobiusOption = keyof typeof MOBIUS_BASE_TO_RES | ValueOf<typeof MOBIUS_BASE_TO_RES>;

const MOBIUS_PRIORITIES: Record<MobiusOption, number> = {
  "I'm not messing with the timeline!": 100,
  "Borrow a cup of sugar from yourself": 99,
  "Return the sugar you borrowed": 1000,
  "Draw a goatee on yourself": 1000,
  "Succumb to evil": 1000,
  "Make friends with a famous poet": 1000,
  "Make enemies with a famous poet": 1000,
  "Go back and take a 20-year-long nap": 10,
  "Go back and set an alarm": 31,
  "Go for a nature walk": 1000,
  "Go back in time and kill a butterfly": 1000,
  "Cheeze it, it's the pigs!": 1000,
  "Aiding and abetterment": 1000,
  "Plant some trees and harvest them in the future": 20,
  "Teach hippies to make jams and jellies": 1000,
  "Plant some seeds in the distant past": 1000,
  "Chop down some trees": 1000,
  "Play Schroedinger's Prank on yourself": 1000,
  "Check your pocket": 1000,
  "Steal a club from the past": 1000,
  "Prevent the deadly seal invasion": 1000,
  "Borrow meat from your future": 8,
  "Repay yourself in the past": 1000,
  "Mind your own business": 1000,
  "Sit and write in your journal": 1000,
  "Take the long odds on the trifecta": 1000,
  "Fix the race and also fix the race.": 1000,
  "Go back and write a best-seller.": 5,
  "Replace your novel with AI drivel": 6,
  "Lift yourself up by your bootstraps": 1000,
  "Let yourself get lifted up by your bootstraps": 1000,
  "Shoot yourself in the foot": 1000,
  "Get shot in the foot": 1000,
  "Give your past self investment tips": 1000,
  "Steal from your future self": 1000,
  "Peek in on your future": 1000,
  "Make yourself forget": 1000,
  "Defend yourself": 1000,
  "Assassinate yourself": 1000,
  "Stop your arch-nemesis as a baby": 1,
  "Go back and make the Naughty Sorceress naughty again": 2,
  "Steal a cupcake from young Susie": 9,
  "Bake Susie a cupcake": 1000,
  "Hey, free gun!": 1000,
  "Sell the gun": 1000,
  "Meet your parents when they were young": 1000,
  "Fix your parents' relationship": 1000,
};
