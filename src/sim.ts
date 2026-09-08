import {
  availableAmount,
  canFaxbot,
  closetAmount,
  displayAmount,
  Familiar,
  getCampground,
  getClanLounge,
  getLocketMonsters,
  getPermedSkills,
  getWorkshed,
  isTradeable,
  Item,
  Monster,
  myPath,
  myPrimestat,
  myStorageMeat,
  print,
  printHtml,
  Skill,
  Stat,
  storageAmount,
} from "kolmafia";
import {
  $familiar,
  $item,
  $items,
  $monster,
  $path,
  $skill,
  $stat,
  CombatLoversLocket,
  EternityCodpiece,
  get,
  have,
  Leprecondo,
} from "libram";

import { args } from "./args";
import { buyLimit, haveAnywhere } from "./lib";
import { detectTier, Tier } from "./lib/tier";
import { selectFreeKill } from "./resources/freekill";
import { policyForTier } from "./resources/policy";

// Modelled on InstantSCCS's `sim` (src/sim.ts checkRequirements): every requirement carries a
// reason, a tier, and optionally alternatives ("any of these"). "Necessary" means the script
// aborts (or a task throws its try limit) without it at the detected run tier; "recommended"
// means a ladder or lane the run leans on; "optional" means a rung the ladders use if present.
//
// The checklist runs in two situations and answers a different question in each:
//   - pre-ascension: "will this survive ascension and be reachable in-run?" Items count in
//     inventory, Hagnk's, equipped, on a familiar, or installed as the workshed; skills count
//     only when permed; pearls count only when mounted in the codpiece.
//   - in-run: "can the route reach it now?" — the same tests the route itself uses.
// Audit of 2026-09-06: docs/superpowers/research/2026-09-06-sim-audit.md.

const seaPath = $path`11,037 Leagues Under the Sea`;

function inRun(): boolean {
  return myPath() === seaPath;
}

class Hardcoded {
  constructor(
    public have: boolean,
    public name: string,
    public note = "",
    /** Mafia has no data either way; printed as "?" and not counted. */
    public unknown = false,
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
const lowMid: Tier[] = ["low", "mid"];

function simTier(): Tier {
  return args.tier === "low" || args.tier === "mid" || args.tier === "high"
    ? args.tier
    : detectTier(ownItem);
}

// ---------------------------------------------------------------------------------------------
// Ownership tests
// ---------------------------------------------------------------------------------------------

type ItemCheck = { have: boolean; note: string };

/**
 * Where the route can reach an item from. The route's own tests are `have()` (inventory,
 * equipped, on a familiar, plus the closet only with autoSatisfyWithCloset) and Hagnk's via
 * pulls; an installed workshed is neither, so it is counted here. Ascension empties the closet
 * into Hagnk's, so pre-ascension a closeted item is as good as a stored one; in-run it is
 * invisible unless autoSatisfyWithCloset is on. The display case is out of reach in Ronin.
 */
function checkItem(item: Item): ItemCheck {
  if (haveAnywhere(item) || getWorkshed() === item) return { have: true, note: "" };
  if (closetAmount(item) > 0) {
    if (!inRun())
      return { have: true, note: " (in your closet; it moves to Hagnk's at ascension)" };
    return get("autoSatisfyWithCloset")
      ? { have: true, note: " (in your closet)" }
      : {
          have: false,
          note: " (in your closet: take it out, or set autoSatisfyWithCloset = true)",
        };
  }
  if (displayAmount(item) > 0) {
    return { have: false, note: " (in your display case: take it out, it is unreachable in-run)" };
  }
  return { have: false, note: "" };
}

export function ownItem(item: Item): boolean {
  return checkItem(item).have;
}

/** Pre-ascension a skill only counts when permed; in-run, when known. */
function checkSkill(skill: Skill): ItemCheck {
  if (inRun()) return { have: have(skill), note: "" };
  const permed = getPermedSkills();
  if (skill.name in permed) {
    return { have: true, note: permed[skill.name] ? "" : " (softcore perm)" };
  }
  if (have(skill) && skill.permable) {
    return { have: false, note: " (known but not permed: counts only if it survives ascension)" };
  }
  return { have: have(skill), note: "" };
}

function pearlsMounted(): number {
  const pearl = $item`unblemished pearl`;
  return EternityCodpiece.have()
    ? EternityCodpiece.currentGems().filter((gem) => gem === pearl).length
    : 0;
}

/** Loose pearls do not survive ascension (they are unpullable in-path), so pre-ascension only
 * mounted pearls count. In-run the Pearl Guard counts codpiece + inventory, and so do we. */
function pearlsLoaded(): number {
  const mounted = pearlsMounted();
  return inRun() ? mounted + availableAmount($item`unblemished pearl`) : mounted;
}

const photoBoothCrate = "photo booth sized crate";
const faxMachine = "deluxe fax machine";
const sheriffOutfit = $items`Sheriff moustache, Sheriff badge, Sheriff pistol`;

let loungeCache: { [item: string]: number } | undefined;
function loungeHas(name: string): boolean {
  loungeCache ??= getClanLounge();
  return name in loungeCache;
}

// Locket monsters: mafia fills its locket cache only at login and only when the locket is
// accessible then, so "empty" can mean "unknown" rather than "nothing unlocked".
type LocketState = { owned: boolean; known: boolean; unlocked: Set<Monster> };

function locketState(): LocketState {
  const unlocked = new Set(CombatLoversLocket.unlockedLocketMonsters());
  return {
    owned: ownItem($item`combat lover's locket`),
    known: Object.keys(getLocketMonsters()).length > 0,
    unlocked,
  };
}

function summonSource(locket: LocketState, monster: Monster): Hardcoded {
  const viaLocket = locket.unlocked.has(monster);
  const viaFax = loungeHas(faxMachine) && canFaxbot(monster);
  const unknown = locket.owned && !locket.known && !viaFax;
  return new Hardcoded(
    viaLocket || viaFax,
    `a summon source for the ${monster.name}: locket unlock OR a clan fax machine with a faxbot that carries it`,
    unknown ? " (locket contents unknown: open inventory.php?reminisce=1 and rerun sim)" : "",
    unknown,
  );
}

// ---------------------------------------------------------------------------------------------
// Requirement tables
// ---------------------------------------------------------------------------------------------

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
      tiers: lowMid,
    },
    {
      thing: $item`Jurassic Parka`,
      why: "Spikolodon spikes = 5 NC forces; the spit is the run's one yellow ray and a free kill at every tier (needs Torso Awareness)",
      recommended: true,
    },
    {
      thing: $item`blood cubic zirconia`,
      why: "Refracted Gaze on the cow and the school; Blood Bath; Sweat Bullets free kills (low/mid)",
      recommended: true,
    },
    {
      thing: $item`Everfull Dart Holster`,
      why: "Bullseye free kill; at high tier (dartsOnly) the darts and the parka spit are the only free kills",
      recommended: true,
    },
    {
      thing: $item`Peridot of Peril`,
      why: "One forced encounter per zone per day: diver, flytrap, cow, cowboy, monitor, eye in the darkness",
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
      why: "Septapus summoning charms for the shadow slab; owned shadow bricks are free kills (up to 13)",
      recommended: true,
      tiers: lowMid,
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
      why: "Catalog credits: pro skateboard (McTwist doubles cow drops, low/mid) + VHS tapes; tier marker",
      recommended: true,
    },
    {
      thing: $item`august scepter`,
      why: "Aug 2nd clover day for pristine scales; waffle day (low/mid); tier marker",
      recommended: true,
    },
    {
      thing: $item`Lil' Doctor™ bag`,
      why: "Reflex Hammer banish; Chest X-Ray 3 free kills (low/mid)",
      recommended: true,
    },
    {
      thing: $item`spring shoes`,
      why: "Spring Away free run (pantry), Spring Kick",
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
      tiers: lowMid,
    },
    {
      thing: $item`closed-circuit pay phone`,
      why: "Rufus: the Shadow Rift quest and its free fights; opens the guild lane",
      recommended: true,
      tiers: lowMid,
    },
    {
      thing: $item`server room key`,
      why: "Cyberzone: OVERCLOCK Mom lane, free cyber eye fights",
      recommended: true,
      tiers: lowMid,
    },
    {
      thing: $item`legendary seal-clubbing club`,
      why: "Club 'Em Across the Battlefield on corral draws, Club 'Em Into Next Week on the golem; Club 'Em Back in Time free kill (mid)",
      recommended: true,
    },
    {
      thing: $item`miniature crystal ball`,
      why: "The Outpost screech reads its prediction (never worn in a fight)",
    },
    { thing: $item`Cincho de Mayo`, why: "Fiesta Exit NC force, Party Foul banish" },
    { thing: $item`latte lovers member's mug`, why: "Latte banish" },
    {
      thing: $item`Heartstone`,
      why: "Heartstone banish and %pals/Ultraheart (the banish and buff unlocks must be bought)",
    },
    { thing: $item`Eight Days a Week Pill Keeper`, why: "Sneakisol NC force" },
    { thing: $item`Kremlin's Greatest Briefcase`, why: "KGB dart banish" },
    { thing: $item`Mayam Calendar`, why: "Daily resources" },
    {
      thing: $item`Leprecondo`,
      why: "Furniture buffs (layout per tier; see the layout row under Miscellany)",
    },
    { thing: $item`April Shower Thoughts shield`, why: "Shower buffs" },
    { thing: $item`Time-Spinner`, why: "Thrown at underleveled gladiators" },
    { thing: $item`January's Garbage Tote`, why: "Tote gear" },
    { thing: $item`unwrapped knock-off retro superhero cape`, why: "Cape modes" },
    { thing: $item`V for Vivala mask`, why: "Mask buffs" },
    { thing: $item`tearaway pants`, why: "Tear Away your Pants! on the tumbleweed" },
    { thing: $item`Kramco Sausage-o-Matic™`, why: "Sausage goblins advance NC counters for free" },
    { thing: $item`mafia middle finger ring`, why: "Once-a-day banish" },
    {
      thing: [$item`Greatest American Pants`, $item`navel ring of navel gazing`],
      why: "Free runaways; skips the peppermint parasol late pull",
    },
    {
      thing: $item`Flash Liquidizer Ultra Dousing Accessory`,
      why: "Douse Foe on the shadow slab (a discretionary pull, mid/high)",
      tiers: lowMid,
    },
    {
      thing: $item`Platinum Yendorian Express Card`,
      why: "Pulled and used on Shadow Affinity (low/mid)",
      tiers: lowMid,
    },
    {
      thing: $item`Archaeologist's Spade`,
      why: "The Skeleton Store pellet lane with the Sword of S Words (low/mid)",
      tiers: lowMid,
    },
    { thing: $item`durable dolphin whistle`, why: "Re-fights a dolphin-stolen route drop" },
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
      why: "Part of the cyber kit (eagle + server room key + OVERCLOCK + Glover); without the kit Mom goes through the paid Abyss",
      recommended: true,
      tiers: lowMid,
    },
    {
      thing: $familiar`Pair of Stomping Boots`,
      why: "Free runaways: the corral taming familiar and the guild test fights",
      recommended: true,
    },
    {
      thing: [$familiar`Peace Turkey`, $familiar`Disgeist`],
      why: "-combat familiar for the NC hunts; the Peace Turkey is the mandated Shub-Jigguwatt familiar",
      recommended: true,
    },
    {
      thing: $familiar`Jill-of-All-Trades`,
      why: "Item familiar; only a 1x fairy until her LED candle drops (turn ~16)",
    },
    { thing: $familiar`Sword of S Words`, why: "Sword Imprint on the cowboy: lasso lane" },
    { thing: $familiar`Space Jellyfish`, why: "The Sea Jelly harvest at init" },
    { thing: $familiar`Artistic Goth Kid`, why: "Free kid fights (dude phylum)" },
    { thing: $familiar`Foul Ball`, why: "Foul Ball free fights" },
    {
      thing: [$familiar`Red-Nosed Snapper`, $familiar`Grouper Groupie`],
      why: "Underwater item familiar fallback when the fairy scan has nothing better",
    },
    {
      thing: [$familiar`Cooler Yeti`, $familiar`Cookbookbat`],
      why: "Experience familiar for the boss fights when there is no Chest Mimic",
    },
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
      thing: $skill`Curse of Weaksauce`,
      why: "The opener in every kill macro; the bladeswitcher stall floor",
      recommended: true,
    },
    {
      thing: $skill`Torso Awareness`,
      why: "Without it the Jurassic Parka never equips: no spit yellow ray, no spikolodon forces",
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
      why: "Five free mine picks a day; otherwise a lodestone pull (mall) carries the teflon ore, and with neither the mine aborts",
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
      tiers: lowMid,
    },
    {
      thing: $skill`Emotionally Chipped`,
      why: "Feel Hatred banishes, Feel Lonely -combat, Feel Nostalgic on corral draws",
      recommended: true,
    },
    { thing: $skill`Snokebomb`, why: "Three banishes a day", recommended: true },
    {
      thing: $skill`Shattering Punch`,
      why: "Three free kills a day",
      recommended: true,
      tiers: lowMid,
    },
    {
      thing: $skill`Gingerbread Mob Hit`,
      why: "One free kill a day",
      recommended: true,
      tiers: lowMid,
    },
    {
      thing: $skill`Tongue of the Walrus`,
      why: "Clears Beaten Up without resting",
      recommended: true,
    },
    {
      thing: $skill`Just the Facts`,
      why: "Golem Recall (crayon shavings, screech host), the Abyss habitat/Cyber Mom lane, pocket-wish summons; needs a golem summon source (see Miscellany)",
    },
    { thing: $skill`Meteor Lore`, why: "Micrometeorite in the kill macros" },
    { thing: $skill`Empathy of the Newt`, why: "Cast before Shub-Jigguwatt; familiar weight" },
    { thing: $skill`Stuffed Mortar Shell`, why: "Extra nuke on gladiators and the Seaceress" },
    { thing: $skill`Raise Backup Dancer`, why: "Extra damage on the Nautical Seaceress" },
    { thing: $skill`Ambidextrous Funkslinging`, why: "Two-item throws halve the Yog-Urt rounds" },
    { thing: $skill`Ruthless Efficiency`, why: "Cast before Shub-Jigguwatt" },
    {
      thing: $skill`Aug. 2nd: Find an Eleven-Leaf Clover Day`,
      why: "Lucky! for pristine scales and sand dollars",
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

/** Mafia infers the mapTo*Purchased prefs from the sea map page, so a red row may be stale. */
function mapRow(pref: string, zone: string): Hardcoded {
  const unlocked = get(pref, false);
  return new Hardcoded(
    unlocked,
    `${zone} unlocked`,
    unlocked ? "" : " (if you did unlock it, visit place.php?whichplace=thesea and rerun sim)",
  );
}

/** Pre-ascension the class you will ascend as is unknown; the current prime stat stands in. */
function primeNote(stat: Stat): string {
  if (inRun()) return "";
  return myPrimestat() === stat
    ? " (necessary for your current class)"
    : " (necessary only if you ascend as that stat's class)";
}

function miscRequirements(tier: Tier): Requirement[] {
  const locket = locketState();
  const rows: Requirement[] = [
    {
      thing: new Hardcoded(get("autoSatisfyWithNPCs"), "autoSatisfyWithNPCs = true"),
      why: "main.ts refuses to start without it",
      necessaryAt: allTiers,
    },
    {
      thing: new Hardcoded(
        pearlsLoaded() >= 5,
        inRun()
          ? `5 unblemished pearls in the codpiece + inventory (${pearlsLoaded()}/5)`
          : `5 unblemished pearls MOUNTED in the Eternity Codpiece (${pearlsLoaded()}/5 mounted)`,
        !inRun() && availableAmount($item`unblemished pearl`) > 0
          ? ` (${availableAmount($item`unblemished pearl`)} loose in inventory: loose pearls do not survive ascension)`
          : "",
      ),
      why: "Pearls cannot be obtained inside the path; init aborts short of 5 (finale needs them)",
      necessaryAt: allTiers,
    },
    {
      thing: new Hardcoded(
        getWorkshed() !== $item.none ||
          $items`Asdon Martin keyfob (on ring), model train set, portable Mayo Clinic, TakerSpace letter of Marque`.some(
            ownItem,
          ),
        "a workshed (installed, or one of Asdon / model train set / Mayo Clinic / TakerSpace to install)",
      ),
      why: "The Workshed init task throws its try limit with nothing to install; Asdon fuels Driving Waterproofly, TakerSpace crafts the anchor bomb",
      necessaryAt: allTiers,
    },
    {
      thing: new Hardcoded(
        loungeHas(photoBoothCrate) ||
          (inRun() && (sheriffOutfit.every(have) || get("_photoBoothEquipment", 0) >= 3)),
        "a clan photobooth (e.g. BAFH) handing out the Sheriff kit",
      ),
      why: "Init takes the Sheriff kit from the booth and throws without a booth (aborts if the booth hands out another kit); Assert your Authority is 3 free kills (low/mid)",
      necessaryAt: allTiers,
    },
    {
      thing: [$item`old SCUBA tank`, $item`Elf Guard SCUBA tank`],
      why: "The only breather that fits under the lasso-training hat + chaps (the Old Man hands out the trunks, bathysphere and sushi mat at init); init pulls an Elf Guard tank from the mall if none is owned (1 pull, every tier) and aborts if that buy fails",
      recommended: true,
    },
    {
      thing: mapRow("mapToAnemoneMinePurchased", "Anemone Mine"),
      why: "Mine Teflon digs there; Muscle classes also run Find Grandpa there",
      necessaryAt: allTiers,
    },
    {
      thing: mapRow("mapToTheMarinaraTrenchPurchased", "The Marinara Trench"),
      why: `Find Grandpa and the wanderer redemptions for Mysticality classes stall to their limit without it${primeNote($stat`Mysticality`)}`,
      necessaryAt: myPrimestat() === $stat`Mysticality` ? allTiers : undefined,
      recommended: true,
    },
    {
      thing: mapRow("mapToTheDiveBarPurchased", "The Dive Bar"),
      why: `Find Grandpa and the wanderer redemptions for Moxie classes stall to their limit without it${primeNote($stat`Moxie`)}`,
      necessaryAt: myPrimestat() === $stat`Moxie` ? allTiers : undefined,
      recommended: true,
    },
    {
      thing: mapRow("mapToMadnessReefPurchased", "Madness Reef"),
      why: "Rough scale fallback when the mine runs dry",
      recommended: true,
    },
    {
      thing: mapRow("mapToTheSkateParkPurchased", "The Skate Park"),
      why: "Skate war and the skate lutz Fishy source",
      recommended: true,
    },
    {
      thing: new Hardcoded($item`Source terminal`.name in getCampground(), "Source Terminal"),
      why: "Duplicate on the monitor, enhance items",
    },
    {
      thing: new Hardcoded(ownItem($item`fishy pipe`), "fishy pipe (inventory or Hagnk's)"),
      why: "First Fishy source; sushi, fish sauce and the pull meal are the fallbacks",
      recommended: true,
    },
  ];

  // Conditional necessities: only rows whose trigger the player actually owns.
  if (tier !== "high") {
    rows.push({
      thing: summonSource(locket, $monster`unholy diver`),
      why: "Diver Summon runs at low/mid and aborts when the locket, a charged mimic, a clan fax and a pocket wish are all unavailable",
      necessaryAt: lowMid,
    });
    if (checkSkill($skill`Just the Facts`).have) {
      rows.push({
        thing: summonSource(locket, $monster`Black Crayon Golem`),
        why: "Golem Recall is ready whenever Just the Facts is known and aborts with no summon source",
        necessaryAt: lowMid,
      });
    }
  }
  const swordImprintRuns =
    have($familiar`Sword of S Words`) &&
    locket.owned &&
    (tier === "high" || !ownItem($item`closed-circuit pay phone`)) &&
    (!inRun() || selectFreeKill({ dropsMatter: true }) !== undefined);
  if (swordImprintRuns) {
    rows.push({
      thing: summonSource(locket, $monster`sea cowboy`),
      why: "Sword Imprint is ready with the Sword of S Words + a locket (and no pay phone at low/mid) and aborts with no summon source",
      necessaryAt: allTiers,
    });
  }
  if (ownItem($item`Leprecondo`)) {
    const layout = policyForTier(tier).leprecondoLayout;
    const discovered = Leprecondo.discoveredFurniture();
    const usable = layout
      .map((id) => Leprecondo.FURNITURE_PIECES[id])
      .filter((piece) => piece !== undefined && discovered.includes(piece)).length;
    rows.push({
      thing: new Hardcoded(
        (inRun() && get("leprecondoInstalled") !== "0,0,0,0") || usable >= 4,
        `4 of the ${tier}-tier Leprecondo layout pieces discovered (${usable}/4)`,
      ),
      why: "The Leprecondo init task throws its try limit when it cannot place a full layout; discover more furniture or stash the Leprecondo",
      necessaryAt: allTiers,
    });
  }
  if ($item`Source terminal`.name in getCampground()) {
    const known = get("sourceTerminalEducateKnown");
    rows.push({
      thing: new Hardcoded(
        known.includes("duplicate.edu"),
        "duplicate.edu learned on the Source Terminal",
        known === "" ? " (unknown: open the terminal's educate menu once and rerun sim)" : "",
        known === "",
      ),
      why: "Terminal Educate throws its try limit when duplicate.edu is not known",
      necessaryAt: allTiers,
    });
  }
  return rows;
}

function locketRequirements(): Requirement[] {
  return [
    {
      thing: $monster`unholy diver`,
      why: "Diver Summon: the first Forced diver (4 rivets)",
      recommended: true,
      tiers: lowMid,
    },
    {
      thing: $monster`Black Crayon Golem`,
      why: "Golem Recall: crayon shavings, screech host",
      recommended: true,
      tiers: lowMid,
    },
    { thing: $monster`sea cowboy`, why: "Sword Imprint lane" },
  ];
}

// ---------------------------------------------------------------------------------------------
// Pull check
// ---------------------------------------------------------------------------------------------

/** stockOnly: the route pulls it from Hagnk's only and never mall-buys it. */
type PullRow = { item: Item; note?: string; discretionary?: boolean; stockOnly?: boolean };

const routePulls: PullRow[] = [
  { item: $item`Mer-kin sneakmask`, discretionary: true },
  { item: $item`shark jumper`, discretionary: true },
  { item: $item`scale-mail underwear`, discretionary: true, note: "skipped with a Kramco" },
  {
    item: $item`Elf Guard SCUBA tank`,
    note: "pulled at every tier when no SCUBA tank is owned (lasso training); discretionary otherwise",
  },
  { item: $item`Flash Liquidizer Ultra Dousing Accessory`, discretionary: true },
  {
    item: $item`Congressional Medal of Insanity`,
    discretionary: true,
    stockOnly: true,
    note: "optional",
  },
  { item: $item`ten-leaf clover`, discretionary: true, note: "bang potions (blessed large box)" },
  { item: $item`large box`, discretionary: true, note: "bang potions (blessed large box)" },
  { item: $item`Mer-kin hidepaint`, discretionary: true },
  { item: $item`Mer-kin digpick`, discretionary: true, note: "low tier farms it in the mine" },
  { item: $item`Platinum Yendorian Express Card`, stockOnly: true, note: "low/mid" },
  { item: $item`Greatest American Pants`, stockOnly: true, note: "guild test free runs" },
  { item: $item`lodestone`, note: "only without Unaccompanied Miner picks" },
  {
    item: $item`damp old wallet`,
    note: "optional shortcut with three fallbacks; the route hands you next run's wallet",
  },
  { item: $item`11-leaf clover` },
  { item: $item`rusty rivet`, note: "only if the paw wishes leave the count at 7" },
  { item: $item`sea lasso`, note: "usually a drop or a wish" },
  { item: $item`sea cowbell` },
  {
    item: $item`waffle`,
    note: "late pull, last slot: one Peanut re-roll if the corral spent Waffle Day's",
  },
  { item: $item`software glitch`, note: "only without a backup camera (high tier)" },
  { item: $item`comb jelly` },
  { item: $item`Mer-kin prayerbeads`, note: "after the paw wishes" },
  { item: $item`Mer-kin healscroll`, note: "fallback; the researcher Force is the source" },
  { item: $item`Mer-kin worktea`, note: "fallback; the library alphabetizer drops it" },
  { item: $item`Mer-kin knucklebone`, note: "safety net; the library farm is the source" },
  { item: $item`Mer-kin cheatsheet`, note: "fallback; Talk to Some Fish is the source" },
  { item: $item`Mer-kin hallpass` },
  { item: $item`skate blade` },
  { item: $item`null-day exploit` },
  { item: $item`New Age healing crystal`, note: "Yog-Urt heal fallback" },
  { item: $item`soggy used band-aid`, note: "Yog-Urt heal fallback" },
  { item: $item`soft green echo eyedrop antidote`, note: "only if Gummiheart is up" },
  { item: $item`fish sauce`, note: "Fishy fallback" },
  {
    item: $item`Aldebaran sardines`,
    note: "Fishy pull meal (low/high) with the cheapest fishy pasta",
  },
  { item: $item`pie man was not meant to eat`, note: "Fishy fallback" },
  { item: $item`gremlin juice`, note: "Shub insurance (low; mid/high under 1250 Muscle)" },
  { item: $item`handful of hand chalk`, note: "Shub insurance (low; mid/high under 1250 Muscle)" },
  { item: $item`handheld Allied radio`, note: "NC force only without a duffel/parka" },
  { item: $item`Clara's bell`, note: "NC force only without a duffel/parka; never mall-bought" },
  { item: $item`stench jelly`, note: "NC force only without a duffel/parka" },
  { item: $item`peppermint parasol`, note: "late pull; skipped with GAP/navel ring" },
  { item: $item`ink bladder`, note: "late pull" },
  { item: $item`Mer-kin pinkslip`, note: "late pull" },
  { item: $item`stuffed yam stinkbomb`, note: "late pull" },
  { item: $item`anchor bomb`, note: "late pull; a TakerSpace workshed crafts it instead" },
];

// ---------------------------------------------------------------------------------------------
// Checking and printing
// ---------------------------------------------------------------------------------------------

type CheckResult = { have: boolean; label: string; note: string; unknown?: boolean };

function checkThing(thing: Thing, locket: LocketState): CheckResult {
  if (thing instanceof Hardcoded) {
    return { have: thing.have, label: thing.name, note: thing.note, unknown: thing.unknown };
  }
  // Familiar.name is the pet's nickname; the type name is its string form.
  if (thing instanceof Familiar) return { have: have(thing), label: `${thing}`, note: "" };
  if (thing instanceof Skill) return { ...checkSkill(thing), label: thing.name };
  if (thing instanceof Monster) {
    return { have: locket.unlocked.has(thing), label: thing.name, note: "" };
  }
  return { ...checkItem(thing), label: thing.name };
}

function check(req: Requirement, locket: LocketState): CheckResult {
  if (Array.isArray(req.thing)) {
    const checks = req.thing.map((thing) => checkThing(thing, locket));
    return {
      have: checks.some((res) => res.have),
      label: checks.map((res) => res.label).join(" OR "),
      note: checks.map((res) => res.note).join(""),
      unknown: !checks.some((res) => res.have) && checks.some((res) => res.unknown),
    };
  }
  return checkThing(req.thing, locket);
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
  const locket = locketState();
  const groups: [string, () => Requirement[]][] = [
    ["IoTMs", iotmRequirements],
    ["Familiars", familiarRequirements],
    ["Skills", skillRequirements],
    ["Miscellany", () => miscRequirements(tier)],
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
      .map((req): [CheckResult, Requirement] => [check(req, locket), req])
      .sort((a, b) => a[0].label.localeCompare(b[0].label));
    for (const [res, req] of rows) {
      if (!res.have && res.unknown) {
        print(`? ${res.label}${res.note} - ${req.why}`);
        continue;
      }
      if (!res.have && level === "necessary") missing++;
      if (!res.have && level !== "necessary") missingOptional++;
      const line = `${res.have ? "✓" : "✗"} ${res.label}${res.note} - ${req.why}`;
      if (res.have) print(line, "#888888");
      else if (level === "necessary") print(line, "red");
      else print(line);
    }
    print("");
  };

  const printLocketGroup = (): void => {
    const rows = locketRequirements().filter((req) => appliesAt(req, tier));
    if (!locket.owned) {
      print(
        "Combat Lover's Locket monsters: no locket owned; the summon fallbacks are a charged Chest Mimic, a clan fax machine, or a pocket wish",
        "blue",
      );
      print("");
      return;
    }
    if (!locket.known) {
      print("Combat Lover's Locket monsters (Highly Recommended)", "blue");
      print(
        "? Locket contents unknown: KoLmafia only reads the locket at login while it is in inventory. Open inventory.php?reminisce=1 (or run `reminisce` in the CLI) and rerun sim to check:",
      );
      for (const req of rows) print(`? ${check(req, locket).label} - ${req.why}`);
      print("");
      return;
    }
    printGroup("Combat Lover's Locket monsters", rows, "recommended");
  };

  for (const [level] of levels) {
    for (const [name, build] of groups) {
      printGroup(
        name,
        build().filter((req) => appliesAt(req, tier) && levelAt(req, tier) === level),
        level,
      );
    }
    if (level === "recommended") printLocketGroup();
  }
  return { missing, missingOptional };
}

function printPullChecklist(tier: Tier): void {
  const discretionaryOn = policyForTier(tier).allowDiscretionaryPulls;
  print(
    "Pull check — Hagnk's stock (counted pulls; 2015+ Mr. Store items auto-pull for free):",
    "blue",
  );
  print(
    `Pulls not in Hagnk's are mall-bought with Hagnk's meat (you have ${myStorageMeat().toLocaleString()} there) up to buyLimit = ${buyLimit().toLocaleString()} (autoBuyPriceLimit, or buyLimit=); a pricier item aborts the run at that point.`,
  );
  if (!discretionaryOn) {
    print(
      `Discretionary pulls (the sea gear, bang potions, hidepaint, digpick) are off at ${tier} tier; those rows are not pulled at all.`,
    );
  }
  for (const row of routePulls) {
    const suffix = row.note ? ` — ${row.note}` : "";
    if (row.discretionary && !discretionaryOn) {
      print(`- ${row.item.name} — not pulled at ${tier} tier${suffix}`, "#888888");
      continue;
    }
    const stocked = storageAmount(row.item) > 0 || (inRun() ? have(row.item) : ownItem(row.item));
    if (stocked) print(`✓ ${row.item.name}${suffix}`, "#888888");
    else if (row.stockOnly)
      print(`- ${row.item.name} — not in Hagnk's; never mall-bought, skipped${suffix}`);
    else if (isTradeable(row.item))
      print(`✗ ${row.item.name} — mall-bought if the route needs it${suffix}`);
    else print(`✗ ${row.item.name} — NOT mall-buyable${suffix}`, "red");
  }
}

export function printSimChecklist(): void {
  const tier = simTier();
  const where = inRun() ? "in-run" : "pre-ascension";
  printHtml(
    `Checking your character (${where}) at tier <b>${tier}</b>... Legend: <font color='#888888'>✓ Have</font> / <font color='red'>✗ Missing & Necessary (the script aborts)</font> / ✗ Missing & Recommended or Optional`,
  );
  print("");
  const { missing, missingOptional } = printRequirementChecklist(tier);

  printPullChecklist(tier);
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
  if (missingOptional > 0) {
    print(
      "Note: the gold guard is on by default (gold=true) and aborts the first time a paid turn lands more than goldSlack=3 turns past the reference 36-turn run's checkpoint. Missing recommended rows make that likely; run with gold=false to let the route finish at its own pace.",
    );
  }
  print(`Tier verdict (auto-detect: ${detectTier(ownItem)}, in use: ${tier})`, "blue");
}
