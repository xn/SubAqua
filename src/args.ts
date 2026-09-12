import { Args } from "grimoire-kolmafia";

export const args = Args.create(
  "subaqua",
  'Speedrun the 11,037 Leagues Under the Sea path. Run "subaqua" for the run, "subaqua sim" for a readiness checklist.',
  {
    command: Args.string({
      help: "What to do.",
      options: [
        ["run", "Execute the path speedrun (default)"],
        ["sim", "Print the readiness checklist; no turns, purchases, or server writes"],
      ],
      default: "run",
      setting: "",
    }),
    tier: Args.string({
      help: "Shiny-tier override; 'auto' detects from owned items and garbo_valueOfFreeFight.",
      options: [
        ["auto", "Detect automatically"],
        ["low", "No 2002 Catalog / monkey's paw / august scepter: farm instead of pull"],
        ["mid", "Spend every daily resource on run speed"],
        ["high", "Free fights worth more in aftercore: conserve them in-run"],
      ],
      default: "auto",
    }),
    buyLimit: Args.number({
      help: "Max meat per mall purchase; defaults to your autoBuyPriceLimit mafia preference.",
    }),
    postloopCommand: Args.string({
      help: "CLI command to run once the route completes (e.g. a farming script). Empty = skip.",
      default: "",
    }),
    godRunGuard: Args.flag({
      help: "Abort at ≤17 turns played if dreadscroll clue 7 is still unknown (top-turncount insurance).",
      default: false,
    }),
    seedScan: Args.boolean({
      help: "Enable the dreadscroll seed-space scan (native seedfinder port). seedScan=false if the one-time 9M-seed scan is too slow on your machine; the Mastermind solver still works without it.",
      default: true,
      setting: "",
    }),
    dreadGuess: Args.boolean({
      help: "Read the dreadscroll with a seed-aware guess when the scan leaves at most guessMax candidates; dreadGuess=false farms catalog cards instead (spec 2026-09-09).",
      default: true,
      setting: "",
    }),
    guessMax: Args.number({
      help: "Most candidate seeds the dreadscroll guess lane will read through; above this the catalog lane runs.",
      default: 3,
      setting: "",
    }),
    burnMomFinish: Args.boolean({
      help: "Let a Deep-Tainted Mind burn spend turns on Mom Finish (Peanut is a spell kill and the effect halves Mysticality).",
      default: false,
      setting: "",
    }),
    list: Args.flag({
      help: "Print the selected runplan with per-task completed status, then exit.",
      default: false,
      setting: "",
    }),
    actions: Args.number({
      help: "Run at most this many tasks, then stop (incremental testing).",
      setting: "",
    }),
    version: Args.flag({ help: "Print the version and exit.", default: false, setting: "" }),
  },
  { positionalArgs: ["command"] },
);
