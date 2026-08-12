import { getCampground, getWorkshed, isTradeable, print } from "kolmafia";
import { $familiars, $item, $items, $skill, $skills, EternityCodpiece, get, have } from "libram";

import { haveAnywhere } from "./lib";
import { detectTier } from "./lib/tier";

const supportedIotms = $items`Monodent of the Sea, The Eternity Codpiece, closed-circuit pay phone, 2002 Mr. Store Catalog, cursed monkey's paw, august scepter, Fourth of May Cosplay Saber, Peridot of Peril, blood cubic zirconia, Baseball Diamond, Heartstone, backup camera, Jurassic Parka, spring shoes, Everfull Dart Holster, Mayam Calendar, Leprecondo, Cincho de Mayo, McHugeLarge duffel bag, Apriling band helmet, April Shower Thoughts shield, bat wings, server room key, Time-Spinner, January's Garbage Tote, Powerful Glove, combat lover's locket, Lil' Doctor™ bag, mumming trunk, Kremlin's Greatest Briefcase, Cargo Cultist Shorts, Eight Days a Week Pill Keeper, Sept-Ember Censer, vampyric cloake, unwrapped knock-off retro superhero cape, Roman Candelabra, miniature crystal ball, latte lovers member's mug, V for Vivala mask, designer sweatpants, tearaway pants, autumn-aton, cosmic bowling ball`;

const supportedSkills = $skills`Just the Facts, Map the Monsters, Macrometeorite, Feel Nostalgic`;

// eslint-plugin-libram's data snapshot predates the 2026 Sword of S Words IOTM
// (real: mafia familiars.txt id 330); remove the disable when the plugin updates.
// eslint-disable-next-line libram/verify-constants
const supportedFamiliars = $familiars`Grouper Groupie, Red-Nosed Snapper, Jill-of-All-Trades, Chest Mimic, Patriotic Eagle, Sword of S Words, Peace Turkey, Disgeist, Jumpsuited Hound Dog, Glover, Foul Ball, Space Jellyfish, Pocket Professor, Tiny Plastic Santa Claus Skeleton`;

const routePulls = $items`Mer-kin sneakmask, sea lasso, shark jumper, scale-mail underwear, Congressional Medal of Insanity, Flash Liquidizer Ultra Dousing Accessory, Mer-kin digpick, lodestone, comb jelly, Elf Guard SCUBA tank, rusty rivet, sea cowbell, Mer-kin prayerbeads, Mer-kin healscroll, Mer-kin killscroll, Mer-kin worktea, Mer-kin knucklebone, Mer-kin cheatsheet, Mer-kin hallpass, Mer-kin hidepaint, pro skateboard, software glitch, pulled yellow taffy, stuffed yam stinkbomb, waffle, skate blade, null-day exploit, New Age healing crystal, soggy used band-aid, damp old wallet, fish sauce, Aldebaran sardines, pie man was not meant to eat, handheld Allied radio, Clara's bell, stench jelly, peppermint parasol, ink bladder, Mer-kin pinkslip, Louder Than Bomb, anchor bomb`;

const catalogCovered = $items`pro skateboard, software glitch`;

function checkRow(owned: boolean, label: string, note = ""): number {
  print(`${owned ? "✓" : "✗"} ${label}${note ? ` — ${note}` : ""}`, owned ? "blue" : "red");
  return owned ? 1 : 0;
}

export function printSimChecklist(): void {
  let owned = 0;
  let total = 0;

  print("IOTM check — supported IOTMs:");
  for (const item of supportedIotms) {
    total++;
    owned += checkRow(haveAnywhere(item), item.name);
  }
  for (const skill of supportedSkills) {
    total++;
    const has =
      have(skill) || (skill === $skill`Macrometeorite` && have($item`Pocket Meteor Guide`));
    owned += checkRow(has, skill.name);
  }
  for (const familiar of supportedFamiliars) {
    total++;
    owned += checkRow(have(familiar), familiar.name);
  }
  total++;
  owned += checkRow(
    getWorkshed() !== $item.none ||
      have($item`Asdon Martin keyfob (on ring)`) ||
      have($item`model train set`) ||
      have($item`portable Mayo Clinic`) ||
      have($item`TakerSpace letter of Marque`),
    "a workshed",
  );
  total++;
  // getCampground() is keyed by item NAME strings; the $item tag still lint-validates the name.
  owned += checkRow($item`Source terminal`.name in getCampground(), "Source Terminal");
  print(`IOTM check: ${owned} of ${total} supported IOTMs owned.`);

  print("");
  print("Pull check — Hagnk's stock:");
  for (const item of routePulls) {
    if (have($item`2002 Mr. Store Catalog`) && catalogCovered.includes(item)) continue;
    if (item === $item`Congressional Medal of Insanity` && !haveAnywhere(item)) {
      print(`✗ ${item.name} — optional, the script won't buy one`, "red");
      continue;
    }
    if (haveAnywhere(item)) print(`✓ ${item.name}`, "blue");
    else if (isTradeable(item))
      print(`✗ ${item.name} — will be mall-bought if the route needs it`, "red");
    else print(`✗ ${item.name} — NOT mall-buyable, acquire before it's needed`, "red");
  }

  print("");
  print("Pre-ascension checklist (spec §7 / wiki strategy):");
  const pearl = $item`unblemished pearl`;
  const pearlsLoaded = EternityCodpiece.have()
    ? EternityCodpiece.currentGems().filter((gem) => gem === pearl).length
    : 0;
  checkRow(pearlsLoaded >= 5, `5 unblemished pearls in the codpiece (${pearlsLoaded}/5)`);
  checkRow(have($skill`Deep Dark Visions`), "Deep Dark Visions permed (dreadScroll3 source)");
  checkRow($item`sushi-rolling mat`.name in getCampground(), "sushi-rolling mat installed");
  checkRow(get("mapToAnemoneMinePurchased"), "Anemone Mine unlocked");
  checkRow(get("mapToTheMarinaraTrenchPurchased"), "The Marinara Trench unlocked");
  checkRow(get("mapToTheDiveBarPurchased"), "The Dive Bar unlocked");
  checkRow(get("mapToMadnessReefPurchased"), "Madness Reef unlocked");
  checkRow(get("mapToTheSkateParkPurchased"), "The Skate Park unlocked");

  print("");
  print(`Tier verdict (auto-detect): ${detectTier()}`, "blue");
}
