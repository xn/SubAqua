import { Args } from "grimoire-kolmafia";
import { $item } from "libram";

//import { Item, toClass } from "kolmafia";
//import { $class, $classes, $item, $items, get } from "libram";

export const supportedWorksheds = [$item`none`, $item`Asdon Martin keyfob (on ring)`];

export const args = Args.create("subaqua", `Written by Chartreusenator`, {
  //alternate-run flags
  version: Args.flag({
    help: "Output script version number and exit.",
    default: false,
    setting: "",
  }),

  quest: Args.custom<string>(
    {
      // Fake the default value display;
      // we don't actually want to set a default value for non-sim debug commands like list.
      help: "Quest to provide information for in sim. <font color='#888888'>[default: grind]</font>",
      options: [
        ["grind", "Autoselect garment quest"],
        ["hatred", "Hateful Habiliments"],
        ["violence", "Violent Vestments"],
        ["little", "Little Brother"],
        ["big", "Big Brother"],
        ["grandpa", "Grandpa"],
        ["grandma", "Grandma"],
        ["mom", "Mom"],
        ["dad", "Dad"],
      ],
      setting: "",
    },
    (value: string) => value.toLowerCase(),
    "TEXT",
  ),
  list: Args.flag({
    help: "Show the status of all tasks and exit.",
    setting: "",
  }),
  little: Args.group("Little Brother Quest", {
    fax_neptune: Args.flag({
      help: "Fax Neptune?",
      default: false,
      setting: "",
    }),
  }),
  abort: Args.string({
    help: "If given, abort during the prepare() step for the task with matching name.",
  }),
  skate_quest: Args.number({
    help: "How to complete the Skate Quest? 0 - Skip. 1 - Ice. 2 - Roller. 3 - Board. 4 - Unlock, but don't do the quest.",
    default: 0,
  }),
  buy_skateboard: Args.flag({
    help: "Purchase Skateboard?",
    default: false,
    setting: "",
  }),
  buy_skatemap: Args.flag({
    help: "Purchase Skate Map?",
    default: false,
    setting: "",
  }),
  closet_meat: Args.flag({
    help: "If set, will closet that amount of meat at the start of the run",
    default: false,
    setting: "",
  }),
  resources: Args.group("Resource Usage", {
    speed: Args.flag({
      help: "Use other resources indiscriminately, to save turns",
      hidden: true,
    }),
    fax: Args.boolean({
      help: "Use a fax to summon a monster. Set to false if the faxbots are offline.",
      default: true,
    }),
    savebackups: Args.number({
      help: "Number of uses of the backup camera to save (max 11).",
      default: 0,
    }),
    saveember: Args.number({
      help: "Number of sept-ember embers to save (max 7).",
      default: 0,
    }),
    savelocket: Args.number({
      help: "Number of uses of the combat lover's locket to save (max 3).",
      default: 0,
    }),
    saveparka: Args.number({
      help: "Number of spikolodon spikes to save (max 5).",
      default: 0,
    }),
    saveapriling: Args.number({
      help: "Number of apriling band instruments to save (max 2).",
      default: 0,
    }),
    voterbooth: Args.boolean({
      help: "Attempt to use the voter booth if we have access.",
      default: true,
    }),
    pocketprofessor: Args.boolean({
      help: "Attempt to use the pocket professor.",
      default: true,
    }),
  }),
  debug: Args.group("Debug Options", {
    actions: Args.number({
      help: "Maximum number of actions to perform, if given. Can be used to execute just a few steps at a time.",
    }),
    verbose: Args.flag({
      help: "Print out a list of possible tasks at each step.",
      default: false,
    }),
    ignoretasks: Args.string({
      help: "A comma-separated list of task names that should not be done. Can be used as a workaround for script bugs where a task is crashing.",
    }),
    completedtasks: Args.string({
      help: "A comma-separated list of task names the should be treated as completed. Can be used as a workaround for script bugs.",
    }),
    debuglist: Args.flag({
      help: "Show the status of all tasks and exit.",
      setting: "",
    }),
    settings: Args.flag({
      help: "Show the parsed value for all arguments and exit.",
      setting: "",
    }),
    lastasdonbumperturn: Args.number({
      help: "Set the last usage of Asdon Martin: Spring-Loaded Front Bumper, in case of a tracking issue",
      hidden: true,
    }),
    ignorekeys: Args.flag({
      help: "Ignore the check that all keys can be obtained. Typically for hardcore, if you plan to get your own keys",
      default: false,
    }),
    halt: Args.number({
      help: "Halt when you have this number of adventures remaining or fewer",
      default: 0,
    }),
    verify: Args.flag({
      help: "Verify that all supported paths pass basic checks",
      hidden: true,
      setting: "",
    }),
    allocate: Args.flag({
      help: "Check the current task resource allocation",
      hidden: true,
      setting: "",
    }),
  }),
});

const scriptName = Args.getMetadata(args).scriptName;
export function toTempPref(name: string) {
  return `_${scriptName}_${name}`;
}
