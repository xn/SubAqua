import { getCampground, getWorkshed, isTradeable, print, Skill } from "kolmafia";
import { $familiars, $item, $items, $skill, $skills, EternityCodpiece, get, have } from "libram";

import { haveAnywhere } from "./lib";
import { detectTier } from "./lib/tier";

const supportedIotms = $items`Monodent of the Sea, The Eternity Codpiece, closed-circuit pay phone, 2002 Mr. Store Catalog, cursed monkey's paw, august scepter, Fourth of May Cosplay Saber, Peridot of Peril, blood cubic zirconia, Baseball Diamond, Heartstone, backup camera, Jurassic Parka, spring shoes, Everfull Dart Holster, Mayam Calendar, Leprecondo, Cincho de Mayo, McHugeLarge duffel bag, Apriling band helmet, April Shower Thoughts shield, bat wings, server room key, Time-Spinner, January's Garbage Tote, Powerful Glove, combat lover's locket, Lil' Doctor™ bag, mumming trunk, Kremlin's Greatest Briefcase, Cargo Cultist Shorts, Eight Days a Week Pill Keeper, Sept-Ember Censer, vampyric cloake, unwrapped knock-off retro superhero cape, Roman Candelabra, miniature crystal ball, latte lovers member's mug, V for Vivala mask, designer sweatpants, tearaway pants, autumn-aton, cosmic bowling ball`;

// Meteor Lore is the passive mafia can see outside combat; the Micro/
// Macrometeorite combat skills are only learned from a fight page, so
// have_skill() reads them as absent at startup (upstream 97dc599).
const supportedSkills = $skills`Just the Facts, Map the Monsters, Meteor Lore, Feel Nostalgic`;

// eslint-plugin-libram's data snapshot predates the 2026 Sword of S Words IOTM
// (real: mafia familiars.txt id 330); remove the disable when the plugin updates.
// eslint-disable-next-line libram/verify-constants
const supportedFamiliars = $familiars`Grouper Groupie, Red-Nosed Snapper, Jill-of-All-Trades, Chest Mimic, Patriotic Eagle, Sword of S Words, Peace Turkey, Disgeist, Jumpsuited Hound Dog, Glover, Foul Ball, Space Jellyfish, Pocket Professor, Tiny Plastic Santa Claus Skeleton`;

// No FLUDA: the shadow-rift lane (tasks/monkees/shadow.ts) does not port the
// Douse Foe rider. The antidote is Yog-Urt's Gummiheart escape (upstream
// YogHpCheck, 6b7cd80).
const routePulls = $items`Mer-kin sneakmask, sea lasso, ten-leaf clover, large box, shark jumper, scale-mail underwear, Congressional Medal of Insanity, Mer-kin digpick, lodestone, comb jelly, Elf Guard SCUBA tank, rusty rivet, sea cowbell, Mer-kin prayerbeads, Mer-kin healscroll, Mer-kin killscroll, Mer-kin worktea, Mer-kin knucklebone, Mer-kin cheatsheet, Mer-kin hallpass, Mer-kin hidepaint, pro skateboard, software glitch, pulled yellow taffy, stuffed yam stinkbomb, waffle, skate blade, null-day exploit, New Age healing crystal, soggy used band-aid, soft green echo eyedrop antidote, damp old wallet, fish sauce, Aldebaran sardines, pie man was not meant to eat, handheld Allied radio, Clara's bell, stench jelly, peppermint parasol, ink bladder, Mer-kin pinkslip, Louder Than Bomb, anchor bomb`;

const catalogCovered = $items`pro skateboard, software glitch`;

/**
 * Permable skills the route leans on (upstream skillChecklist(), G:2011-2114
 * at 89982f5, trimmed to what SubAqua actually casts: the shadow-slab and
 * Kokomo entries went with their subsystems). A skill an IOTM grants belongs
 * in supportedSkills above; these survive a perm. Informational only.
 */
type SkillTier = "required" | "big turn saver" | "optional";
const routeSkills: [Skill, SkillTier, string][] = [
  [
    $skill`Saucegeyser`,
    "required",
    "The finisher in every kill macro; Saucestorm is the fallback.",
  ],
  [$skill`Cannelloni Cocoon`, "required", "Full heal before Yog-Urt."],
  [$skill`Empathy of the Newt`, "required", "Cast before Shub-Jigguwatt."],
  [$skill`Deep Dark Visions`, "required", "The only source of dreadscroll clue 3."],
  [$skill`Steely-Eyed Squint`, "big turn saver", "Once-a-day +item spike for the forced drops."],
  [
    $skill`Unaccompanied Miner`,
    "big turn saver",
    "Five free mine trips a day — no lodestone pull for the teflon ore.",
  ],
  [
    $skill`Transcendent Olfaction`,
    "big turn saver",
    "Neptune flytrap, giant squid and Mer-kin tippler turn up far more often.",
  ],
  [$skill`Holiday Multitasking`, "big turn saver", "Three adventure-free crafts a day."],
  [$skill`Tongue of the Walrus`, "big turn saver", "Clears Beaten Up without resting."],
  [$skill`OVERCLOCK(10)`, "big turn saver", "Ten free CyberRealm fights a day for the Mom lane."],
  [$skill`Garbage Nova`, "big turn saver", "Extra damage on the school of many."],
  [$skill`Saucestorm`, "optional", "Backup finisher without Saucegeyser; you need one of the two."],
  [$skill`Snokebomb`, "optional", "Three banishes a day."],
  [$skill`Shattering Punch`, "optional", "Three free kills a day."],
  [$skill`Gingerbread Mob Hit`, "optional", "One free kill a day."],
  [$skill`Feel Lonely`, "optional", "Three -combat casts a day for the NC hunts."],
  [$skill`Raise Backup Dancer`, "optional", "Extra damage on the Nautical Seaceress."],
  [$skill`Ambidextrous Funkslinging`, "optional", "Two-item throws halve the Yog-Urt rounds."],
  [$skill`Ruthless Efficiency`, "optional", "Cast before Shub-Jigguwatt."],
  [$skill`Fat Leon's Phat Loot Lyric`, "optional", "+item mood."],
  [$skill`Singer's Faithful Ocelot`, "optional", "+item mood."],
  [$skill`The Polka of Plenty`, "optional", "+item mood."],
  [$skill`Donho's Bubbly Ballad`, "optional", "+item mood (underwater)."],
  [$skill`Leash of Linguini`, "optional", "+item mood."],
  [$skill`The Sonata of Sneakiness`, "optional", "-combat mood."],
  [$skill`Smooth Movement`, "optional", "-combat mood."],
  [$skill`Astral Shell`, "optional", "Elemental resistance for the pearl zones."],
  [$skill`Elemental Saucesphere`, "optional", "Elemental resistance for the pearl zones."],
];

function printSkillChecklist(): void {
  print("");
  print("Skill check — permable skills the route leans on:");
  let owned = 0;
  let missingRequired = 0;
  for (const tier of ["required", "big turn saver", "optional"] as SkillTier[]) {
    for (const [skill, skillTier, why] of routeSkills) {
      if (skillTier !== tier) continue;
      const has = have(skill);
      if (has) owned++;
      else if (tier === "required") missingRequired++;
      checkRow(has, `${skill.name} (${tier})`, why);
    }
  }
  const missing = missingRequired > 0 ? `, ${missingRequired} REQUIRED missing` : "";
  print(`Skill check: ${owned} of ${routeSkills.length} route skills owned${missing}.`);
}

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
    owned += checkRow(have(skill), skill.name);
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

  printSkillChecklist();

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
