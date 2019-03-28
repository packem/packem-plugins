/* Copyright (c) 2019 packem-bundle-stats-plugin */

const { PackemPlugin } = require("packem");

const { statSync, existsSync } = require("fs");
const { dirname, basename } = require("path");
const walkSync = require("walk-sync");
const chalk = require("chalk");
const prettySize = require("prettysize");
const asciitable = require("asciitable");

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
      skinny: true,
      intersectionCharacter: "+",
      columns: [
        { field: "id", name: "ID" },
        { field: "path", name: "Asset Path" },
        { field: "size", name: "Size" }
      ]
    };
    const data: object[] = [];

    walkedBundles.map((bundle: string) => {
      data.push({
        id: " # ",
        path: bundle,
        size: statSync(bundle).size
      });

      console.log(
        statSync(bundle).size,
        this.pluginConfig.maxAssetSizeLimit.js * 10e6
      );
    });

    // Hack: color ASCII table without breaking
    let table = asciitable(options, data);
    let tableSplit = table.split(/\n/);
    let logAfter: string[] = [];

    table = tableSplit
      .map(m => "  " + m) // left padding: 2 spaces
      .map((m, i) => {
        if ([0, 1, 2, tableSplit.length - 1].includes(i)) return m;

        let pathMatch: string = m.match(/\|\s+\#\s+\|(.+?)\|/)[1].trim();
        let sizeMatch: string = m.match(/\|\s*(\d+)/)[1].trim();
        let extendedExtension: string = basename(pathMatch)
          .split(".")
          .slice(1)
          .join(".")
          .trim();
        let didAssetBloat: boolean = false;

        if (this.pluginConfig["maxAssetSizeLimit"])
          if (this.pluginConfig["maxAssetSizeLimit"][extendedExtension])
            if (
              +sizeMatch >
              +this.pluginConfig["maxAssetSizeLimit"][extendedExtension] * 10e6
            ) {
              didAssetBloat = true;
              logAfter.push(pathMatch);
            }

        m = m.replace(
          pathMatch,
          didAssetBloat ? chalk.red(pathMatch) : chalk.yellow(pathMatch)
        );
        m = m.replace(
          sizeMatch,
          didAssetBloat
            ? chalk.red(prettySize(sizeMatch))
            : chalk.green(prettySize(sizeMatch))
        );

        return m;
      })
      .join("\n");

    const space = " ".repeat((tableSplit[0].length - 20) / 2 + 2);
    console.log(
      `  ${tableSplit[0]}\n${space +
        chalk.cyan("Packem Bundle Stats")}\n${table}`
    );
    logAfter.forEach(bloatedAssetPath =>
      console.log(
        chalk.red(
          `\nAsset \`${bloatedAssetPath}\` exceeded the size constraint defined.`
        )
      )
    );
    console.log(
      chalk.red(
        `\nTry removing extra dependencies and bloatware code or lowering the size limit.`
      )
    );
  }
}

module.exports = PackemBundleStatsPlugin;
