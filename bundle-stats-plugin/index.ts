/* Copyright (c) 2019 packem-bundle-stats-plugin */

const { PackemPlugin } = require("packem");

const { statSync, existsSync } = require("fs");
const { dirname, basename } = require("path");
const walkSync = require("walk-sync");
const chalk = require("chalk");
const prettySize = require("prettysize");
const chalktable = require("chalk-table");

class PackemBundleStatsPlugin extends PackemPlugin {
  onEnd(config): void {
    const outputDirectory: string = dirname(config.output);

    if (
      /**!existsSync(outputDirectory) ||  */ !statSync(
        outputDirectory
      ).isDirectory()
    ) {
      throw Error(
        "There must be an output path specified for stats to be displayed."
      );

      return;
    }

    const walkedBundles: string[] = walkSync(outputDirectory)
      .filter((path: string) => statSync(outputDirectory + "/" + path).isFile())
      .map((path: string) => outputDirectory + "/" + path);

    const options: object = {
      leftPad: 2,
      intersectionCharacter: "+",
      columns: [
        { field: "id", name: " # " },
        { field: "bundlePath", name: "Asset Path" },
        { field: "bundleSize", name: "Size" },
        { field: "limit", name: "Limit" }
      ]
    };
    const data: object[] = [];
    let bloatedBundles: boolean[] = [];

    walkedBundles.map((bundlePath: string) => {
      let bundleSize = statSync(bundlePath).size;
      let extendedExtension: string = basename(bundlePath)
        .split(".")
        .slice(1)
        .join(".")
        .trim();
      let didAssetBloat: boolean = false;
      let bundleSizeLimit: number =
        +this.pluginConfig["maxAssetSizeLimit"][extendedExtension] * 1e3;

      if (this.pluginConfig["maxAssetSizeLimit"])
        if (this.pluginConfig["maxAssetSizeLimit"][extendedExtension])
          if (bundleSize > bundleSizeLimit) {
            didAssetBloat = true;
            bloatedBundles.push(bundleSize); // Don't push `true`. Idk why.
          }

      let formattedId = didAssetBloat ? chalk.red(" # ") : chalk.yellow(" # ");
      let formattedBundlePath = didAssetBloat
        ? chalk.red(bundlePath)
        : chalk.yellow(bundlePath);
      let formattedBundleSize = didAssetBloat
        ? chalk.red(prettySize(bundleSize))
        : chalk.green(prettySize(bundleSize));
      let formattedLimit = didAssetBloat
        ? chalk.red(bundleSizeLimit ? prettySize(bundleSizeLimit) : '-')
        : chalk.cyan(bundleSizeLimit ? prettySize(bundleSizeLimit) : '-');

      data.push({
        id: formattedId,
        bundlePath: formattedBundlePath,
        bundleSize: formattedBundleSize,
        limit: formattedLimit
      });
    });

    let table = chalktable(options, data);
    console.log("\n" + table + "\n");
    bloatedBundles.length &&
      console.log(
        chalk.red(
          `${chalk.bold(
            bloatedBundles.length
          )} asset(s) exceeded the size constraint defined.\nTry removing extra dependencies and bloatware code or lowering the size limit.`
        )
      );
  }
}

module.exports = PackemBundleStatsPlugin;
