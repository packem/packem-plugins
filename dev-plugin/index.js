/**
 * Packem Dev Plugin
 *
 * Handles core development related features
 */

const {
  PackemPlugin,
  NativeUtils: { regenerateModuleGraph }
} = require("packem");

const http = require("http");
const { readFileSync, writeFileSync } = require("fs");

const { transformSync } = require("@babel/core");
const chalk = require("chalk");
const WebSocket = require("ws");
const ansiToHtml = require("ansi-html");

const moduleWatcher = require("./moduleWatcher");
const bundleTemp = require("./bundleTemp");

ansiToHtml.setColors({
  reset: ["fff", "00000000"]
});

class PackemDevPlugin extends PackemPlugin {
  onInitialBundleComplete(
    config,
    PluginEvents,
    moduleGraph,
    dependencyMap,
    initialBundleContent
  ) {
    this.CWD = process.cwd();
    this.moduleGraph = moduleGraph;

    const { transformer: transformerConfig } = config;
    const {
      devServerPort = 3000, // @todo default to unused port
      watchFiles = false,
      clientSideLogs = true
    } = this.pluginConfig;
    const devServerUrl = `http://localhost:${devServerPort}/`;

    // to be used in onModuleWatch
    this.babelTransformOptions = {
      presets: transformerConfig.babelPresets || [],
      plugins: transformerConfig.babelPlugins || []
    };

    // Initialize devServer & WebSocket connection
    this.devServer = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(bundleTemp(initialBundleContent, devServerPort));
    });
    this.webSocket = new WebSocket.Server({ server: this.devServer });
    this.devServer.listen(devServerPort, () => {
      console.info(
        `  ${chalk.green("✔")} DevServer listening at: ${chalk.yellow(
          devServerUrl
        )}`
      );
    });
    this.webSocket.on("connection", ws => {
      ws.onerror = this.handleWebSocketError;
    });
    this.webSocket.on("error", this.handleWebSocketError);

    // Initialize module watcher
    if (watchFiles)
      moduleWatcher(transformerConfig, PluginEvents, dependencyMap);
  }

  onModuleWatch(event, modId, absoluteModPath) {
    try {
      switch (event) {
        case "unlink":
          this.sendModuleUnlink(modId);
          break;

        case "change":
          const REBUILD_START_TIME = Date.now();

          let subsequentBundle = "";
          let dependencies = this.moduleGraph[modId].dependencies;
          let dependencySource = Object.keys(
            this.moduleGraph[modId].dependencies
          );
          let [
            moduleGraph,
            moduleGraphLength,
            dependencyMap
          ] = regenerateModuleGraph(
            this.CWD,
            modId,
            absoluteModPath,
            dependencies,
            dependencySource
          );
          writeFileSync(
            "../moduleGraph.dev.json",
            JSON.stringify(moduleGraph, null, 2)
          );

          for (const modId in moduleGraph) {
            let mod = moduleGraph[modId];

            let { code } = transformSync(
              mod.content,
              this.babelTransformOptions
            );

            subsequentBundle += `__packemModules._mod_${modId} = function(require, module, exports) {${code}};`;
          }

          this.sendSubsequentBundle(subsequentBundle);
          console.clear();
          console.log(chalk.bold.blue(this.CWD) + "$\n");
          console.info(
            `  ⚡ ${chalk.yellow("[packem]")} Rebuilt in: ${chalk.yellow(
              ((Date.now() - REBUILD_START_TIME) / 1000).toFixed(2)
            )} s`
          );
          break;

        default:
          break;
      }
    } catch (error) {
      this.sendMessageDialog(
        '<strong style="color: #dd4949;">&#x2718;</strong> ' +
          ansiToHtml(
            error
              .toString()
              .replace(
                /\u0020/gm,
                `<span style="display:inline-block;width:12px;"></span>`
              )
          ).replace(/\n/gm, "<br>")
      );
    }
  }

  // Add new module to clientside
  sendModuleAdd(mod) {
    this.broadcast({ type: "MODULE_ADDITION", mod });
  }

  // Delete clientside module
  sendModuleUnlink(modId) {
    this.broadcast({ type: "MODULE_UNLINK", modId });
  }

  // Update clientside module
  sendSubsequentBundle(subsequentBundle) {
    this.broadcast({ type: "MODULE_UPDATE", subsequentBundle });
  }

  // Overlayed clientside message logger
  sendMessageDialog(msg) {
    const { clientSideLogs = true } = this.pluginConfig;
    if (clientSideLogs)
      this.broadcast({
        type: "MESSAGE_DIALOG",
        msg
      });
  }

  // Clientside logger
  sendConsoleLog(msg) {
    const { clientSideLogs = true } = this.pluginConfig;
    if (clientSideLogs) this.broadcast({ type: "CONSOLE_LOG", msg });
  }

  broadcast(data) {
    for (const client of this.webSocket.clients)
      if (client.readyState === WebSocket.OPEN)
        client.send(JSON.stringify(data));
  }

  // @todo better handle error
  handleWebSocketError(err) {
    throw Error(err);
  }
}

module.exports = PackemDevPlugin;
