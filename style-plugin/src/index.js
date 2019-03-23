/**
 *
 * @PackemPlugin Style Plugin
 *
 * @description Handles loading Markdown file types by parsing them into a valid
 * HTML5 string that is then injected inline into the final output. If you want to
 * extract the Markdown contents into a seperate directory, use the `packem-extract-assets-plugin`.
 * This plugin uses PostCSS, less' compiler and node-sass to handle CSS, LESS and SASS/SCSS respectively.
 *
 * @note Raw loading of styles is done by the `packem-file-plugin` so you don't need to include
 * this plugin if all you want is non-transpiled CSS. Use the File Plugin in that case.
 *
 * More details on the Markdown plugin can be found here:
 * https://packem.github.io/docs/plugins/common/style
 *
 */

const { PackemPlugin } = require("packem");

const { readFileSync } = require("fs");
const compileSass = require("node-sass").renderSync;

// @todo Abstract into `PackemUtils`
function escapeTextBasedImport(string) {
  return string.replace(/(\r\n|\r|\n)/g, `\\n`).replace(/\"/g, '\\"');
}

class PackemStylePlugin extends PackemPlugin {
  /**
   * @method onModuleBundle
   *
   * Defines operations synchronously on the final output bundle
   *
   * @param {PackemModule} mod Output of current module
   * @return {PackemModule} Output of current module to replace previous output
   */
  onModuleBundle(mod) {
    switch (mod.extension) {
      case "css":
        return `\n\n// Source: "${mod.filename}"
this._mod_${mod.id} = function(require, module, exports) {
  module.exports = "";
}`;
        break;

      case "scss":
      case "sass":
        let outputCSS = compileSass({
          data: readFileSync(mod.filename).toString()
        }).css.toString();

        return `\n\n// Source: "${mod.filename}"
this._mod_${mod.id} = function(require, module, exports) {
  module.exports = "${escapeTextBasedImport(outputCSS)}";
}`;
        break;

      case "less":
        return `\n\n// Source: "${mod.filename}"
this._mod_${mod.id} = function(require, module, exports) {
  module.exports = "";
}`;
        break;
    }
  }
}

module.exports = PackemStylePlugin;
