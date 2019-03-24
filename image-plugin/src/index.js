/**
 * Copyright (c) 2019 packem-image-plugin
 */

const { PackemPlugin } = require("packem");

const imagemin = require("imagemin");
const imageminJpegtran = require("imagemin-jpegtran");
const imageminPngquant = require("imagemin-pngquant");

class PackemImagePlugin extends PackemPlugin {
  onModuleBundle(mod) {
    switch (mod.extension) {
      // case "svg":
      // case "gif":
      case "jpg":
      case "jpeg":
      case "png":
        const imagesOutputPath =
          this.pluginConfig.extractAssetsDirectory || "./dist/img";

        imagemin([mod.filename], imagesOutputPath, {
          plugins: [
            imageminJpegtran(this.pluginConfig.imageminOptions.jpeg || {}),
            imageminPngquant(this.pluginConfig.imageminOptions.png || {})
          ]
        });

        return `\n\n// Source: "${mod.filename}"
this._mod_${mod.id} = function(require, module, exports) {
  module.exports = "${mod.filename}";
}`;
    }
  }
}

module.exports = PackemImagePlugin;
