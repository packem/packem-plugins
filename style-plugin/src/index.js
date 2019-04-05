/**
 * @PackemPlugin Style Plugin
 */

const { PackemPlugin } = require("packem");

const { readFileSync } = require("fs");
const compileSass = require("node-sass").renderSync;

// @todo Abstract into `PackemUtils`
function escapeTextBasedImport(string) {
  return string.replace(/(\r\n|\r|\n)/g, `\\n`).replace(/\"/g, '\\"');
}

class PackemStylePlugin extends PackemPlugin {
  onModuleBundle(mod) {
    switch (mod.extension) {
      case "scss":
      case "sass":
        let outputCSS = compileSass({
          data: readFileSync(mod.path).toString()
        }).css.toString();

        return "module.exports = \"" + escapeTextBasedImport(outputCSS) + "\";";
        break;
    }
  }
}

module.exports = PackemStylePlugin;
