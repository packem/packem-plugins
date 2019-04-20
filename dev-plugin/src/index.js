/**
 * Packem Dev Plugin
 *
 * Handles core development related features
 */

const {
  PackemPlugin,
  NativeUtils: { regenerateModuleGraph }
} = require("packem");

const { readFileSync, writeFileSync } = require("fs");
const path = require("path");

const { transformSync } = require("@babel/core");
const chalk = require("chalk");
const WebSocket = require("ws");
const stripAnsi = require("strip-ansi");
const ansiToHtml = require("ansi-html");

const moduleWatcher = require("./moduleWatcher");
const writeBundleToOutput = require("./bundleTemp");
const localServe = require("./localServe");

ansiToHtml.setColors({
  reset: ["fff", "00000000"]
});

class PackemDevPlugin extends PackemPlugin {
  constructor(pluginConfig) {
    super(pluginConfig);

    // dev session cache holder
    this._moduleGraphCache = Object.create(null);
  }

  // initial bundle complete
  onBundleComplete(
    config,
    PluginEvents,
    moduleGraph,
    dependencyMap,
    initialBundles
  ) {
    this.CWD = process.cwd();
    this.moduleGraph = moduleGraph;
    this.dependencyMap = dependencyMap;
    this.config = config;

    const { transformer: transformerConfig } = this.config;
    const { watchFiles = false, clientSideLogs = true } = this.pluginConfig;

    // to be used in onModuleWatch
    this.babelTransformOptions = {
      presets: transformerConfig.babelPresets || [],
      plugins: transformerConfig.babelPlugins || []
    };

    // handle initialBundleContent, both root/main & dynamic
    this.initialBundleContent = "";

    for (const id in initialBundles) {
      this.initialBundleContent += initialBundles[id];
    }

    // Initialize devServer & WebSocket connection
    // this.devServer = http.createServer((req, res) => {
    //   if (req.url !== "/favicon.ico") {
    //     // append cached mods to initialBundleContent
    //     if (this._moduleGraphCache)
    //       for (const modId in this._moduleGraphCache) {
    //         this.initialBundleContent += `\n__packemModules._mod_${modId} = function(require, __packemImport, module, exports) {\n${
    //           this._moduleGraphCache[modId].content
    //         }\n}`;
    //       }

    //     res.writeHead(200, { "Content-Type": "text/html" });
    //     res.end(writeBundleToOutput(this.initialBundleContent, devServerPort));
    //   }
    // });

    const _packemDevPlugin = this; // back-compat
    const { port, httpServerInstance } = localServe(this.pluginConfig, {
      onRequest() {
        if (_packemDevPlugin._moduleGraphCache)
          for (const modId in _packemDevPlugin._moduleGraphCache) {
            _packemDevPlugin.initialBundleContent += `\n__packemModules._mod_${modId} = function(require, __packemImport, module, exports) {\n${
              _packemDevPlugin._moduleGraphCache[modId].content
            }\n}`;
          }
      },

      onWake(devServerUrl) {
        console.info(
          `  ${chalk.green("✔")} DevServer listening at: ${chalk.yellow(
            devServerUrl
          )}`
        );
      }
    });

    writeBundleToOutput(
      path.resolve(config.outputPath),
      this.initialBundleContent,
      port
    );

    this.devServer = httpServerInstance;

    // WebSocket connection
    this.socket = new WebSocket.Server({ server: this.devServer });
    this.socket.on("connection", ws => {
      ws.onerror = this.handleWebSocketError;
    });
    this.socket.on("error", this.handleWebSocketError);

    if (watchFiles) {
      // module/file watcher
      // add root module to dependencyMap so
      // that it could be watched too
      this.dependencyMap[this.config.rootPath] = "root";
      // Initialize module watcher
      moduleWatcher(transformerConfig, PluginEvents, this.dependencyMap);
    }
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
            this.config.outputPathFileStem, // @todo do this internally
            modId,
            absoluteModPath,
            dependencies,
            dependencySource
          );

          // writeFileSync(
          //   "../moduleGraph.dev.json",
          //   JSON.stringify(moduleGraph, null, 2)
          // );

          for (const modId in moduleGraph) {
            const cachedMod = this.getModule(modId);
            let mod = moduleGraph[modId];

            let { code } = transformSync(
              mod.content,
              this.babelTransformOptions
            );

            subsequentBundle += `\n__packemModules._mod_${modId} = function(require, __packemImport, module, exports) {\n${code}\n}`;

            // cache module for subsequent builds
            this.cacheModule({
              id: modId,
              path: mod.path,
              dependencies: Object.assign(
                (cachedMod && cachedMod.dependencies) || Object.create(null),
                mod.dependencies
              ),
              content: code
            });
          }

          this.sendSubsequentBundle(subsequentBundle);
          // console.clear();
          console.info(chalk.bold.blue(this.CWD) + "$\n");
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

  cacheModule(mod) {
    this._moduleGraphCache[mod.id] = mod;
    this.dependencyMap[mod.path] = mod.id; // for watcher
  }

  // get from cache else from initial module graph
  getModule(modId) {
    return this._moduleGraphCache[modId] || this.moduleGraph[modId];
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
    for (const client of this.socket.clients)
      if (client.readyState === WebSocket.OPEN)
        client.send(JSON.stringify(data));
  }

  // @todo better handle error
  handleWebSocketError(error) {
    throw Error(error);
  }
}

module.exports = PackemDevPlugin;
