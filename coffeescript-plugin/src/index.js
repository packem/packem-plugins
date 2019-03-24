/**
 *
 * @PackemPlugin CoffeeScript Plugin
 *
 * @description Handles loading CoffeeScript file types by parsing them into a valid
 * HTML5 string that is then injected inline into the final output. If you want to
 * extract the CoffeeScript contents into a seperate directory, use the `packem-extract-assets-plugin`.
 * This plugin uses CoffeeScript's compiler.
 *
 * @note Raw loading of CoffeeScript is done by the `packem-file-plugin` so you don't need to include
 * this plugin if all you want is non-transpiled CSS. Use the File Plugin in that case.
 */

const { PackemPlugin } = require("packem");

const { readFileSync } = require("fs");
const compileCoffeeScript = require("coffeescript").compile;

// @todo Abstract into `PackemUtils`
function escapeTextBasedImport(string) {
  return string.replace(/(\r\n|\r|\n)/g, `\\n`).replace(/\"/g, '\\"');
}

class PackemCoffeeScriptPlugin extends PackemPlugin {
  onModuleBundle(mod) {
    switch (mod.extension) {
      case "coffee":
        let output = compileCoffeeScript(
          readFileSync(mod.filename).toString(),
          this.pluginConfig
        );

        return `\n\n// Source: "${mod.filename}"
__packemModules._mod_${mod.id} = function(require, module, exports) {
  ${output}
}`;
        break;
    }
  }
}

module.exports = PackemCoffeeScriptPlugin;
