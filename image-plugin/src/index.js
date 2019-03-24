/* Copyright (c) 2019 packem-image-plugin */

const { PackemPlugin } = require("packem");

const imagemin = require("imagemin");
const imageminJpegtran = require("imagemin-jpegtran");
const imageminPngquant = require("imagemin-pngquant");
const imageminGiflossy = require('imagemin-giflossy');
const imageminSvgo = require('imagemin-svgo');
const imageminWebp = require('imagemin-webp');

class PackemImagePlugin extends PackemPlugin {
  onModuleBundle(mod) {
    switch (mod.extension) {
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "svg":
      case "webp":
        const imagesOutputPath =
          this.pluginConfig.extractAssetsDirectory || "./dist/img";

        imagemin([mod.filename], imagesOutputPath, {
          // ImageMin plugins shouldn't be mangled with all file types otherwise it would cause undesired
          // results/outputs since every plugin instance would run on a single file type. For instance, 
          // `ImageMinWebPPlugin` is able to process PNG files in this case. It would also result in unnecessary
          // performance strains. Simple safe checks must be made before an image file types' corresponding ImageMin
          // plugin is instantiated. In this way, we're bulletproof certain that images are optimized according to
          // Packem's general standard.
          plugins: [
            mod.extension === "jpeg" || mod.extension === "jpg" && imageminJpegtran(this.pluginConfig.imageminOptions.jpeg || {}),
            mod.extension === "png" && imageminPngquant(this.pluginConfig.imageminOptions.png || {}),
            mod.extension === "gif" && imageminGiflossy(this.pluginConfig.imageminOptions.gif || {}),
            mod.extension === "svg" && imageminSvgo(this.pluginConfig.imageminOptions.svg || {}),
            mod.extension === "webp" && imageminWebp(this.pluginConfig.imageminOptions.webp || {})
            // The result must be filtered out to get the plugin instance of our choice.
          ].filter((manifestPlugin) => !!manifestPlugin)
        });

        return `\n\n// Source: "${mod.filename}"
this._mod_${mod.id} = function(require, module, exports) {
  module.exports = "${mod.filename}";
}`;
    }
  }
}

module.exports = PackemImagePlugin;
