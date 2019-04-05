/**
 *
 * MIT License
 *
 * Copyright (c) 2019 Packem
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @PackemPlugin Markdown Plugin
 *
 * @description Handles loading Markdown file types by parsing them into a valid
 * HTML5 string that is then injected inline into the final output. If you want to
 * extract the Markdown contents into a seperate directory, use the `packem-extract-assets-plugin`.
 * This plugin uses ShowdownJS as the parser. You can find Showdown here:
 * https://github.com/showdownjs/showdown
 *
 * @note Raw loading of Markdown files is done by the `packem-file-plugin` so you
 * don't need to include this plugin if all you want is raw Markdown (in case you
 * need to use your own Markdown parser). Use the File Plugin in that case.
 *
 * More details on the Markdown plugin can be found here:
 * https://packem.github.io/docs/plugins/common/markdown
 *
 */

const { PackemPlugin } = require("packem");

const { readFileSync } = require("fs");
const showdown = require("showdown");

// @todo Abstract into `PackemUtils`
function escapeTextBasedImport(string) {
  return string.replace(/(\r\n|\r|\n)/g, `\\n`).replace(/\"/g, '\\"');
}

class PackemMarkdownPlugin extends PackemPlugin {
  onModuleBundle(mod) {
    if (mod.extension === "md") {
      const markdownOptions = this.pluginConfig || {};
      const markdownConverter = new showdown.Converter(markdownOptions);

      mod.content = readFileSync(mod.path).toString();

      return (
        'module.exports = "' +
        escapeTextBasedImport(markdownConverter.makeHtml(mod.content)) +
        '";'
      );
    }
  }
}

module.exports = PackemMarkdownPlugin;
