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
const stripAnsi = require("strip-ansi");
const ansiToHtml = require("ansi-html");

const moduleWatcher = require("./moduleWatcher");
const bundleTemp = require("./bundleTemp");

ansiToHtml.setColors({
  reset: ["fff", "00000000"]
});

class PackemDevPlugin extends PackemPlugin {
  constructor(pluginConfig) {
    super(pluginConfig);

    this._moduleGraphCache = {}; // dev session cache
  }

  onInitialBundleComplete(
    config,
    PluginEvents,
    moduleGraph,
    dependencyMap,
    initialBundleContent
  ) {
    this.CWD = process.cwd();
    this.moduleGraph = moduleGraph;
    this.dependencyMap = dependencyMap;

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
      if (req.url !== "/favicon.ico") {
        // console.log(this._moduleGraphCache);
        // append cached mods to initialBundleContent
        if (this._moduleGraphCache)
          for (const modId in this._moduleGraphCache) {
            initialBundleContent += `\n__packemModules._mod_${modId} = function(require, module, exports) {${
              this._moduleGraphCache[modId].content
            }}`;
          }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(bundleTemp(initialBundleContent, devServerPort));
      }
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
      moduleWatcher(transformerConfig, PluginEvents, this.dependencyMap);
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
          const changedMod = this.getModule(modId);
          let dependencies = changedMod.dependencies;
          let dependencySource = Object.keys(dependencies);
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
            const cachedMod = this.getModule(modId);
            let mod = moduleGraph[modId];

            let { code } = transformSync(
              mod.content,
              this.babelTransformOptions
            );

            subsequentBundle += `\n__packemModules._mod_${modId} = function(require, module, exports) {${code}}`;

            this.cacheModule({
              id: modId,
              path: mod.path,
              dependencies: Object.assign(
                (cachedMod && cachedMod.dependencies) || {},
                mod.dependencies
              ),
              content: code
            });
          }

          this.sendSubsequentBundle(subsequentBundle);
          console.clear();
          console.info(chalk.bold.blue(this.CWD) + "$\n");
          console.info(
            `  ⚡ ${chalk.yellow("[packem]")} Rebuilt in: ${chalk.yellow(
              ((Date.now() - REBUILD_START_TIME) / 1000).toFixed(2)
            )} s`
          );

          // cache module for subsequent builds
          // this.moduleGraph[modId].dependencies = Object.assign(
          //   this.moduleGraph[modId].dependencies,
          //   moduleGraph[modId].dependencies
          // );
          break;

        default:
          break;
      }
    } catch (error) {
      let errorMsg = error.toString();

      // replace module import/require string to original
      let dependencies = this.moduleGraph[modId].dependencies;
      for (const src in dependencies) {
        errorMsg = errorMsg.replace("_mod_" + dependencies[src], src);
      }

      // console.log
      this.sendConsoleError(
        stripAnsi(`${errorMsg}\n\nError in: ${absoluteModPath}`)
      );

      // throw dialog error in frontend
      this.sendMessageDialog(
        `<strong style="color: #dd4949;">&#x2718;</strong> Error in: ${absoluteModPath}<br /><strong style="color: #dd4949;">&#x2718;</strong> ` +
          ansiToHtml(
            errorMsg.replace(
              /\u0020/gm,
              `<span style="display:inline-block;width:12px;"></span>`
            )
          ).replace(/\n/gm, "<br />")
      );

      console.error(error);
    }
  }

  isModuleCached(modId) {
    return this._moduleGraphCache.hasOwnProperty(modId);
  }

  cacheModule(mod) {
    this._moduleGraphCache[mod.id] = mod;
    this.dependencyMap[mod.path] = mod.id; // for watcher
  }

  // get from cache else from initial module graph
  getModule(modId) {
    return this.isModuleCached(modId)
      ? this._moduleGraphCache[modId]
      : this.moduleGraph[modId];
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

  // Clientside logger
  sendConsoleError(msg) {
    const { clientSideLogs = true } = this.pluginConfig;
    if (clientSideLogs) this.broadcast({ type: "CONSOLE_ERROR", msg });
  }

  broadcast(data) {
    for (const client of this.webSocket.clients)
      if (client.readyState === WebSocket.OPEN)
        client.send(JSON.stringify(data));
  }

  // @todo better handle error
  handleWebSocketError(error) {
    throw Error(error);
  }
}

module.exports = PackemDevPlugin;
