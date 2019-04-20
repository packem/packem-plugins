const path = require("path");

const chalk = require("chalk");
const chokidar = require("chokidar");

module.exports = (transformerConfig, PluginEvents, dependencyMap) => {
  const CWD = process.cwd();
  const chokidarOpts = {
    ignored: new RegExp(transformerConfig.exclude, "") || /node_modules/,
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 50,
      pollInterval: 10
    }
  };

  // Initialize watcher.
  chokidar
    .watch(transformerConfig.include || process.cwd(), chokidarOpts)
    .on("all", (event, relativeModPath) => {
      const absoluteModPath = path.join(CWD, relativeModPath);
      const modId = dependencyMap[absoluteModPath] || null;

      // onModuleWatch event
      if (modId)
        PluginEvents.dispatch("onModuleWatch", event, modId, absoluteModPath);
    })
    .on("ready", () =>
      console.info(`  ${chalk.green("✔")} Actively watching file updates...`)
    );
};
