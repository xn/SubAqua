import {
  Familiar,
  getCampground,
  getWorkshed,
  isTradeable,
  Item,
  itemAmount,
  Monster,
  print,
  printHtml,
  Skill,
} from "kolmafia";
import {
  $familiar,
  $item,
  $items,
  $monster,
  $skill,
  CombatLoversLocket,
  EternityCodpiece,
  get,
  have,
} from "libram";

import { args } from "./args";
import { haveAnywhere } from "./lib";
import { detectTier, Tier } from "./lib/tier";

// Modelled on InstantSCCS's `sim` (src/sim.ts checkRequirements): every requirement carries a
// reason, a tier, and optionally alternatives ("any of these"). "Necessary" means the script
// aborts without it at the detected run tier; "recommended" means a ladder or lane the run
// leans on; "optional" means a rung the ladders use if present.

class Hardcoded {
  constructor(
    public have: boolean,
    public name: string,
  ) {}
}

type Thing = Item | Familiar | Skill | Monster | Hardcoded;

type Requirement = {
  thing: Thing | Thing[];
  why: string;
  /** Tiers where the script aborts without it. Absent = never necessary. */
  necessaryAt?: Tier[];
  recommended?: boolean;
  /** Tiers whose policy uses it at all. Absent = every tier. */
  tiers?: Tier[];
};

const allTiers: Tier[] = ["low", "mid", "high"];

function simTier(): Tier {
  return args.tier === "low" || args.tier === "mid" || args.tier === "high"
    ? args.tier
    : detectTier();
}

function pearlsLoaded(): number {
  const pearl = $item`unblemished pearl`;
  const inCodpiece = EternityCodpiece.have()
    ? EternityCodpiece.currentGems().filter((gem) => gem === pearl).length
    : 0;
  return inCodpiece + itemAmount(pearl);
}

function iotmRequirements(): Requirement[] {
  return [
    {
      thing: $item`The Eternity Codpiece`,
      why: "The only way to bring the Seaceress's 5 unblemished pearls into the path (init/finale abort)",
      necessaryAt: allTiers,
    },
    {
      thing: $item`Fourth of May Cosplay Saber`,
      why: "Use the Force: 2 divers = 8 rivets, healer prayerbeads, researcher scrolls (5/day)",
      recommended: true,
    },
    {
      thing: $item`combat lover's locket`,
      why: "Reminisces: the first diver, the screech golem, the Sword Imprint cowboy",
      recommended: true,
    },
    {
      thing: $familiar`Chest Mimic`,
      why: "Mimic eggs: the second diver copy without a locket charge",
      recommended: true,
    },
    {
      thing: $item`backup camera`,
      why: "Copies: cow cowbells, healer prayerbeads, free-monster re-fights (11/day)",
      recommended: true,
      tiers: ["low", "mid"],
    },
    {
      thing: $item`Jurassic Parka`,
      why: "Spikolodon spikes = NC forces; the spit is the run's one yellow ray",
      recommended: true,
    },
    {
      thing: $item`blood cubic zirconia`,
      why: "Sweat Bullets is the workhorse free kill; Refracted Gaze on the cow",
      recommended: true,
      tiers: ["low", "mid"],
    },
    {
      thing: $item`Everfull Dart Holster`,
      why: "Bullseye free kill; at high tier (dartsOnly) it is the only free-kill source",
      recommended: true,
    },
    {
      thing: $item`Peridot of Peril`,
      why: "One forced encounter per zone per day: diver, cow, cowboy, monitor, healer",
      recommended: true,
    },
    {
      thing: $item`cosmic bowling ball`,
      why: "Bowl a Curveball: the banish that comes back every few fights",
      recommended: true,
    },
    {
      thing: $item`Apriling band helmet`,
      why: "Tuba: 3 NC forces (Wreck hatch, shadow rift, skate park); piccolo/quad tom second",
      recommended: true,
    },
    {
      thing: $item`Sept-Ember Censer`,
      why: "Shadow bricks: 11-13 free kills a day, the Mom finish",
      recommended: true,
    },
    {
      thing: $item`Monodent of the Sea`,
      why: "Talk to Some Fish: a cheatsheet on every school fight, pristine scales",
      recommended: true,
    },
    {
      thing: $item`cursed monkey's paw`,
      why: "Wishes: prayerbeads/rivets in place of an Outpost visit (1 turn); tier marker",
      recommended: true,
    },
    {
      thing: $item`2002 Mr. Store Catalog`,
      why: "Catalog credits: pro skateboard (McTwist doubles cow drops) + VHS tapes; tier marker",
      recommended: true,
    },
    {
      thing: $item`august scepter`,
      why: "Aug 2nd clover day for pristine scales; waffle day; tier marker",
      recommended: true,
    },
    {
      thing: $item`Lil' Doctor™ bag`,
      why: "Chest X-Ray 3 free kills, Reflex Hammer banish, Otoscope on the diver",
      recommended: true,
    },
    {
      thing: $item`spring shoes`,
      why: "Spring Away free run (pantry), spring kick",
      recommended: true,
    },
    {
      thing: $item`McHugeLarge duffel bag`,
      why: "Avalanche: 3 NC forces",
      recommended: true,
    },
    {
      thing: $item`bat wings`,
      why: "Swoop procs make paid Colosseum rounds free (gold: 3 procs)",
      recommended: true,
    },
    {
      thing: $item`miniature crystal ball`,
      why: "Ponder predictions steer the forced encounters (takes the familiar slot)",
      recommended: true,
    },
    {
      thing: $item`closed-circuit pay phone`,
      why: "Rufus: shadow rift free fights and the FLUDA shop",
      recommended: true,
    },
    {
      thing: $item`server room key`,
      why: "Cyberzone: OVERCLOCK Mom lane, free cyber eye fights",
      recommended: true,
    },
    {
      thing: $item`Cincho de Mayo`,
      why: "Fiesta Exit NC force, Party Foul banish",
    },
    { thing: $item`Powerful Glove`, why: "CHEAT CODE: Replace Enemy re-rolls" },
    { thing: $item`latte lovers member's mug`, why: "Latte banish" },
    { thing: $item`mumming trunk`, why: "Familiar +item costume" },
    { thing: $item`Heartstone`, why: "Heartstone banish and %luck" },
    { thing: $item`Baseball Diamond`, why: "Sweat Bullets mainstat floor gear" },
    { thing: $item`Eight Days a Week Pill Keeper`, why: "Sneakisol NC force" },
    { thing: $item`Kremlin's Greatest Briefcase`, why: "Buffs" },
    { thing: $item`Cargo Cultist Shorts`, why: "Pocket pulls" },
    { thing: $item`Mayam Calendar`, why: "Daily resources" },
    { thing: $item`Leprecondo`, why: "Furniture buffs (layout per tier)" },
    { thing: $item`April Shower Thoughts shield`, why: "Shower buffs" },
    { thing: $item`Time-Spinner`, why: "Time cop free fights" },
    { thing: $item`January's Garbage Tote`, why: "Tote gear" },
    { thing: $item`vampyric cloake`, why: "Cloake forms" },
    { thing: $item`unwrapped knock-off retro superhero cape`, why: "Cape modes" },
    { thing: $item`Roman Candelabra`, why: "Candle casts" },
    { thing: $item`V for Vivala mask`, why: "Mask buffs" },
    { thing: $item`designer sweatpants`, why: "Sweat for the pantry runs" },
    { thing: $item`tearaway pants`, why: "Tear Away your Pants! on the tumbleweed" },
    { thing: $item`Kramco Sausage-o-Matic™`, why: "Sausage goblins advance NC counters for free" },
    {
      thing: $item`toy Cupid bow`,
      why: "Not equipped yet: re-rolls one failed drop, staggers, drops familiar gear",
    },
    {
      thing: $item`autumn-aton`,
      why: "No use in this route: sea drops are unpickpocketable and trips return too late",
    },
  ];
}

function familiarRequirements(): Requirement[] {
  return [
    {
      thing: $familiar`Patriotic Eagle`,
      why: "Patriotic Screech banishes constructs for the Bakery/habitat lanes",
      recommended: true,
    },
    {
      thing: $familiar`Glover`,
      why: "Cyber Mom eye fights: without Glover the lane yields to the paid Abyss fallback",
      recommended: true,
    },
    {
      thing: $familiar`Pair of Stomping Boots`,
      why: "Free runaways: the pantry's Guild Test fights",
      recommended: true,
    },
    {
      thing: [$familiar`Peace Turkey`, $familiar`Disgeist`],
      why: "-combat familiar for the NC hunts",
      recommended: true,
    },
    {
      thing: $familiar`Jill-of-All-Trades`,
      why: "Item familiar; only a 1x fairy until her LED candle drops (turn ~16)",
    },
    {
      thing: $familiar`Red-Nosed Snapper`,
      why: "1.5x fairy underwater with no gear; not fielded yet (see memory)",
    },
    { thing: $familiar`Sword of S Words`, why: "Sword Imprint on the cowboy: lasso lane" },
    { thing: $familiar`Space Jellyfish`, why: "Stench jelly NC force" },
    { thing: $familiar`Artistic Goth Kid`, why: "Free kid fights (dude phylum)" },
    { thing: $familiar`Jumpsuited Hound Dog`, why: "+combat where wanted" },
    { thing: $familiar`Foul Ball`, why: "Foul Ball free fights" },
    { thing: $familiar`Pocket Professor`, why: "Lectures" },
    { thing: $familiar`Tiny Plastic Santa Claus Skeleton`, why: "Knucklebone drops" },
    { thing: $familiar`Grouper Groupie`, why: "Underwater item familiar fallback" },
  ];
}

function skillRequirements(): Requirement[] {
  return [
    {
      thing: [$skill`Saucegeyser`, $skill`Saucestorm`],
      why: "The finisher in every kill macro; without one, fights run on plain attacks",
      recommended: true,
    },
    {
      thing: $skill`Cannelloni Cocoon`,
      why: "The sanctioned full heal before Yog-Urt",
      recommended: true,
    },
    {
      thing: $skill`Deep Dark Visions`,
      why: "The only source of dreadscroll clue 3; without it the solve leans on the seed tables",
      recommended: true,
    },
    {
      thing: $skill`Unaccompanied Miner`,
      why: "Five free mine picks a day; otherwise the lodestone pull carries the teflon ore",
      recommended: true,
    },
    {
      thing: $skill`Steely-Eyed Squint`,
      why: "Once-a-day +item spike on a forced drop fight",
      recommended: true,
    },
    {
      thing: $skill`OVERCLOCK(10)`,
      why: "Ten free Cyberzone fights for the Mom lane",
      recommended: true,
    },
    {
      thing: $skill`Emotionally Chipped`,
      why: "Feel Hatred banishes, Feel Lonely -combat; Feel Nostalgic is unused (0 turns)",
      recommended: true,
    },
    { thing: $skill`Snokebomb`, why: "Three banishes a day", recommended: true },
    { thing: $skill`Shattering Punch`, why: "Three free kills a day", recommended: true },
    { thing: $skill`Gingerbread Mob Hit`, why: "One free kill a day", recommended: true },
    {
      thing: $skill`Transcendent Olfaction`,
      why: "Neptune flytrap, giant squid and tippler turn up far more often",
      recommended: true,
    },
    {
      thing: $skill`Tongue of the Walrus`,
      why: "Clears Beaten Up without resting",
      recommended: true,
    },
    { thing: $skill`Holiday Multitasking`, why: "Three adventure-free crafts a day" },
    { thing: $skill`Just the Facts`, why: "Golem Recall: crayon shavings and a screech host" },
    { thing: $skill`Map the Monsters`, why: "Forced encounters" },
    { thing: $skill`Meteor Lore`, why: "Macrometeorite re-rolls in the school and corral" },
    { thing: $skill`Empathy of the Newt`, why: "Cast before Shub-Jigguwatt; familiar weight" },
    { thing: $skill`Garbage Nova`, why: "Extra damage on the school of many" },
    { thing: $skill`Raise Backup Dancer`, why: "Extra damage on the Nautical Seaceress" },
    { thing: $skill`Ambidextrous Funkslinging`, why: "Two-item throws halve the Yog-Urt rounds" },
    { thing: $skill`Ruthless Efficiency`, why: "Cast before Shub-Jigguwatt" },
    {
      thing: $skill`Aug. 2nd: Find an Eleven-Leaf Clover Day`,
      why: "Lucky! for pristine scales and sand dollars",
    },
    {
      thing: $skill`Summon Taffy`,
      why: "Not cast: indigo = banish depth, green = a copy (0 turns)",
    },
    {
      thing: [
        $skill`Fat Leon's Phat Loot Lyric`,
        $skill`Singer's Faithful Ocelot`,
        $skill`The Polka of Plenty`,
        $skill`Donho's Bubbly Ballad`,
        $skill`Leash of Linguini`,
      ],
      why: "+item mood",
    },
    {
      thing: [$skill`The Sonata of Sneakiness`, $skill`Smooth Movement`],
      why: "-combat mood",
    },
    {
      thing: [$skill`Astral Shell`, $skill`Elemental Saucesphere`],
      why: "Elemental resistance for the pearl zones",
    },
  ];
}

function miscRequirements(): Requirement[] {
  return [
    {
      thing: new Hardcoded(get("autoSatisfyWithNPCs"), "autoSatisfyWithNPCs = true"),
      why: "main.ts refuses to start without it",
      necessaryAt: allTiers,
    },
    {
      thing: new Hardcoded(
        pearlsLoaded() >= 5,
        `5 unblemished pearls in the codpiece + inventory (${pearlsLoaded()}/5)`,
      ),
      why: "Pearls cannot be obtained inside the path; init aborts short of 5",
      necessaryAt: allTiers,
    },
    {
      thing: new Hardcoded(
        get("hasSushiMat") || have($item`sushi-rolling mat`),
        "sushi-rolling mat",
      ),
      why: "Fishy sushi and the library nigiri clue; the library aborts without a roll",
      necessaryAt: allTiers,
    },
    {
      thing: [
        $item`das boot`,
        $item`little bitty bathysphere`,
        $item`Asdon Martin keyfob (on ring)`,
      ],
      why: "Non-aquatic familiars need a breather; the outfit engine aborts without one (Asdon's Driving Waterproofly also covers it)",
      necessaryAt: allTiers,
    },
    {
      thing: $items`really\, really nice swimming trunks, Elf Guard SCUBA tank, old SCUBA tank, The Crown of Ed the Undying, Asdon Martin keyfob (on ring)`,
      why: "Player water breathing; the SCUBA tank is pulled from the mall only when discretionary pulls are on, so low tier must own one",
      necessaryAt: ["low"],
      recommended: true,
    },
    {
      thing: new Hardcoded(
        getWorkshed() !== $item.none ||
          $items`Asdon Martin keyfob (on ring), model train set, portable Mayo Clinic, TakerSpace letter of Marque`.some(
            (it) => have(it),
          ),
        "a workshed",
      ),
      why: "Asdon fuels Driving Waterproofly; TakerSpace crafts the anchor bomb",
      recommended: true,
    },
    {
      thing: new Hardcoded($item`Source terminal`.name in getCampground(), "Source Terminal"),
      why: "Duplicate on the monitor, enhance items",
    },
    {
      thing: new Hardcoded(
        have($item`fishy pipe`) || haveAnywhere($item`fishy pipe`),
        "fishy pipe in Hagnk's",
      ),
      why: "First Fishy source; sushi, fish sauce and the pull meal are the fallbacks",
      recommended: true,
    },
    {
      thing: new Hardcoded(
        get("_photoBoothEquipment", 0) >= 3 ||
          $items`Sheriff moustache, Sheriff badge, Sheriff pistol`.every((it) => have(it)),
        "clan photobooth Sheriff kit (BAFH)",
      ),
      why: "Assert your Authority: three free kills in the Garden, Gymnasium and Abyss",
      recommended: true,
    },
  ];
}

function locketRequirements(): Requirement[] {
  return [
    {
      thing: $monster`unholy diver`,
      why: "Diver Summon: the first Forced diver (4 rivets)",
      recommended: true,
    },
    {
      thing: $monster`Black Crayon Golem`,
      why: "Golem Recall: crayon shavings, screech host",
      recommended: true,
    },
    { thing: $monster`sea cowboy`, why: "Sword Imprint lane" },
  ];
}

const routePulls = $items`Mer-kin sneakmask, sea lasso, ten-leaf clover, large box, shark jumper, scale-mail underwear, Congressional Medal of Insanity, Mer-kin digpick, lodestone, comb jelly, Elf Guard SCUBA tank, rusty rivet, sea cowbell, Mer-kin prayerbeads, Mer-kin healscroll, Mer-kin killscroll, Mer-kin worktea, Mer-kin knucklebone, Mer-kin cheatsheet, Mer-kin hallpass, Mer-kin hidepaint, pro skateboard, software glitch, pulled yellow taffy, stuffed yam stinkbomb, waffle, skate blade, null-day exploit, New Age healing crystal, soggy used band-aid, soft green echo eyedrop antidote, damp old wallet, fish sauce, Aldebaran sardines, pie man was not meant to eat, handheld Allied radio, Clara's bell, stench jelly, peppermint parasol, ink bladder, Mer-kin pinkslip, Louder Than Bomb, anchor bomb`;

const catalogCovered = $items`pro skateboard, software glitch`;

function checkThing(thing: Thing): [boolean, string] {
  if (thing instanceof Hardcoded) return [thing.have, thing.name];
  if (thing instanceof Familiar) return [have(thing), thing.name];
  if (thing instanceof Skill) return [have(thing), thing.name];
  if (thing instanceof Monster) {
    return [new Set(CombatLoversLocket.unlockedLocketMonsters()).has(thing), thing.name];
  }
  return [haveAnywhere(thing), thing.name];
}

function check(req: Requirement): [boolean, string] {
  if (Array.isArray(req.thing)) {
    const checks = req.thing.map(checkThing);
    return [checks.some((res) => res[0]), checks.map((res) => res[1]).join(" OR ")];
  }
  return checkThing(req.thing);
}

type Level = "necessary" | "recommended" | "optional";

function levelAt(req: Requirement, tier: Tier): Level {
  if (req.necessaryAt?.includes(tier)) return "necessary";
  return req.recommended ? "recommended" : "optional";
}

function appliesAt(req: Requirement, tier: Tier): boolean {
  return req.tiers === undefined || req.tiers.includes(tier);
}

function printRequirementChecklist(tier: Tier): { missing: number; missingOptional: number } {
  const groups: [string, () => Requirement[]][] = [
    ["IoTMs", iotmRequirements],
    ["Familiars", familiarRequirements],
    ["Skills", skillRequirements],
    ["Miscellany", miscRequirements],
  ];
  const levels: [Level, string][] = [
    ["necessary", "Necessary"],
    ["recommended", "Highly Recommended"],
    ["optional", "Optional"],
  ];
  let missing = 0;
  let missingOptional = 0;

  const printGroup = (name: string, requirements: Requirement[], level: Level): void => {
    if (requirements.length === 0) return;
    print(`${name} (${levels.find(([lv]) => lv === level)?.[1]})`, "blue");
    const rows = requirements
      .map((req): [boolean, string, Requirement] => [...check(req), req])
      .sort((a, b) => a[1].localeCompare(b[1]));
    for (const [haveIt, label, req] of rows) {
      const color = haveIt ? "#888888" : level === "necessary" ? "red" : "black";
      if (!haveIt && level === "necessary") missing++;
      if (!haveIt && level !== "necessary") missingOptional++;
      print(`${haveIt ? "✓" : "X"} ${label} - ${req.why}`, color);
    }
    print("");
  };

  for (const [level] of levels) {
    for (const [name, build] of groups) {
      printGroup(
        name,
        build().filter((req) => appliesAt(req, tier) && levelAt(req, tier) === level),
        level,
      );
    }
    if (level === "recommended") {
      printGroup("Combat Lover's Locket monsters", locketRequirements(), "recommended");
    }
  }
  return { missing, missingOptional };
}

function printPullChecklist(): void {
  print("Pull check — Hagnk's stock (counted pulls; 2015+ Mr. Store items auto-pull for free):");
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
}

function checkRow(owned: boolean, label: string): void {
  print(`${owned ? "✓" : "✗"} ${label}`, owned ? "blue" : "red");
}

function printPreAscensionChecklist(): void {
  print("Pre-ascension checklist (spec §7 / wiki strategy):");
  checkRow(pearlsLoaded() >= 5, `5 unblemished pearls in the codpiece (${pearlsLoaded()}/5)`);
  checkRow(have($skill`Deep Dark Visions`), "Deep Dark Visions permed (dreadScroll3 source)");
  checkRow(get("hasSushiMat"), "sushi-rolling mat installed");
  checkRow(get("mapToAnemoneMinePurchased"), "Anemone Mine unlocked");
  checkRow(get("mapToTheMarinaraTrenchPurchased"), "The Marinara Trench unlocked");
  checkRow(get("mapToTheDiveBarPurchased"), "The Dive Bar unlocked");
  checkRow(get("mapToMadnessReefPurchased"), "Madness Reef unlocked");
  checkRow(get("mapToTheSkateParkPurchased"), "The Skate Park unlocked");
}

export function printSimChecklist(): void {
  const tier = simTier();
  printHtml(
    `Checking your character at tier <b>${tier}</b>... Legend: <font color='#888888'>✓ Have</font> / <font color='red'>X Missing & Necessary (the script aborts)</font> / <font color='black'>X Missing & Recommended or Optional</font>`,
  );
  print("");
  const { missing, missingOptional } = printRequirementChecklist(tier);

  printPullChecklist();
  print("");
  printPreAscensionChecklist();
  print("");

  if (missing > 0) {
    print(
      `You are missing ${missing} necessary thing(s) for a ${tier}-tier run. The script will abort without them.`,
      "red",
    );
    if (missingOptional > 0) {
      print(`You are also missing ${missingOptional} recommended/optional thing(s).`);
    }
  } else if (missingOptional > 0) {
    print(
      `Nothing necessary is missing. You are missing ${missingOptional} recommended/optional thing(s); the ladders will skip those rungs.`,
    );
  } else {
    print(`You have everything the route knows about at tier ${tier}.`, "blue");
  }
  print(`Tier verdict (auto-detect: ${detectTier()}, in use: ${tier})`, "blue");
}
