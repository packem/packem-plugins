/* Copyright (c) 2019 packem-bundle-stats-plugin */

const { PackemPlugin } = require("packem");

const { statSync, existsSync } = require("fs");
const { dirname } = require("path");
const walkSync = require("walk-sync");
const chalk = require("chalk");
const prettySize = require("prettysize");
const AsciiTable = require("ascii-table");
const table = new AsciiTable("Bundle Stats (Packem v0.1.0 alpha)");

// table.removeBorder();

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

    table.setHeading("", "Asset", "Size");
    table.setAlign(1, AsciiTable.RIGHT);
    walkedBundles.map((bundle: string) => {
      table.addRow(
        "#",
        chalk.yellow(bundle),
        chalk.cyan(prettySize(statSync(bundle).size))
      );
    });

    console.log(table.toString());
  }
}

module.exports = PackemBundleStatsPlugin;
