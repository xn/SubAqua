import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import type { RollupOptions } from "rollup";

const watch = process.argv.includes("--watch") || process.argv.includes("-w");

const plugins = [
  replace({
    preventAssignment: true,
    values: {
      "process.env.GITHUB_SHA": JSON.stringify(process.env.GITHUB_SHA ?? "CustomBuild"),
      "process.env.GITHUB_REF_NAME": JSON.stringify(process.env.GITHUB_REF_NAME ?? "CustomBuild"),
      "process.env.GITHUB_REPOSITORY": JSON.stringify(
        process.env.GITHUB_REPOSITORY ?? "CustomBuild",
      ),
    },
  }),

  resolve({
    extensions: [".js", ".ts"],
  }),

  commonjs(),

  babel({
    babelHelpers: "bundled",
    extensions: [".js", ".ts"],
    babelrc: false,
    configFile: false,
    presets: [
      [
        "@babel/preset-env",
        {
          targets: {
            rhino: "1.8.0",
          },
        },
      ],
      "@babel/preset-typescript",
    ],
  }),
];

const bundles: Array<{ input: Record<string, string>; dir: string }> = [
  { input: { subaqua: "src/main.ts" }, dir: "dist/KoLmafia/scripts/subaqua" },
  {
    input: { subaqua_choice: "src/standalone/subaqua_choice.ts" },
    dir: "dist/KoLmafia/scripts/subaqua",
  },
  { input: { relay_subaqua: "src/relay.ts" }, dir: "dist/KoLmafia/relay" },
];

export default bundles.map(
  ({ input, dir }): RollupOptions => ({
    input,
    output: {
      dir,
      format: "cjs",
      exports: "auto",
      chunkFileNames: "_[name].js",
    },
    external: ["kolmafia"],
    plugins,
    watch: watch ? { clearScreen: false } : undefined,
  }),
);
