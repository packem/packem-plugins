/**
 * Copyright (c) 2019 Packem packem-file-plugin
 * Handles generic text-based file types.
 */

const { PackemPlugin } = require("packem");

const { readFileSync } = require("fs");
const parseCSV = require("convert-csv-to-json").getJsonFromCsv;
const parseINI = require("ini").parse;
const parseYAML = require("js-yaml").safeLoad;
const parseTOML = require("toml").parse;
const parseXML = require("xml-parser");
const __dangerousConvertImageToBase64 = require("base64-img").base64Sync;

function escapeTextBasedImport(string) {
  return string.replace(/\n/g, "\\n").replace(/[\""]/g, '\\"');
}

class PackemFilePlugin extends PackemPlugin {
  onModuleBundle(mod) {
    switch (mod.extension) {
      /**
       * @ModuleType Generic files
       *
       * Text files that should be read as a string and returned
       * as is without any modifications on the final output.
       */

      /**
       * OpenGL GLSL shaders
       *
       * @note Khronos' reference GLSL compiler/validator uses the following
       * extensions to determine what type of shader this module is for. Since
       * there is no official standard, Packem will use all the available formats.
       */
      case "glsl":
      case "hlsl": // High-level Shading Language
      case "cg": // C for Graphics
      case "tesc": // Tessellation control shader
      case "tese": // Tessellation evaluation shader
      case "geom": // Tessellation control shader
      case "comp": // Geometry shader
      case "vert": // Vertex shader
      case "frag": // Fragment shader
      case "vsh": // Vertex shader
      case "fsh": // Fragment shader
      // Logfiles
      case "log":
      // Configuration files
      case "cnf":
      case "conf":
      case "cfg":
      // Temporary files
      case "temp":
      case "tmp":
      // SQL database querying files
      case "sql":
      case "sqlite":
      // SVG files
      case "svg":
      // Patch/diff files
      case "patch":
      // License files
      case "0":
      // Markup (bare)
      case "md":
      // Human-readable text files
      case "asc":
      case "txt":
        return 'module.exports = "' + escapeTextBasedImport(readFileSync(mod.path).toString()) + '";';
        break;

      /**
       * CSV, Comma Separated Values (strict form as described in @RFC 4180)
       *
       * @RFC 4180 is available online at http://tools.ietf.org/html/rfc4180
       */
      case "csv":
        return (
          "module.exports = JSON.parse('" +
          JSON.stringify(parseCSV(readFileSync(mod.path).toString())) +
          "');"
        );
        break;

      // JSON file format.
      case "json":
      return (
        "module.exports = JSON.parse('" +
        JSON.stringify(mod.path) +
        "');"
      );
        break;

      // INI file format.
      case "ini":
        return (
          "module.exports = JSON.parse('" +
          JSON.stringify(parseINI(readFileSync(mod.path).toString())) +
          "');"
        );
        break;

      // YAML file format.
      case "yaml":
        return (
          "module.exports = JSON.parse('" +
          JSON.stringify(parseYAML(readFileSync(mod.path).toString())) +
          "');"
        );
        break;

      // TOML file format.
      case "toml":
        return (
          "module.exports = JSON.parse('" +
          JSON.stringify(parseTOML(readFileSync(mod.path).toString())) +
          "');"
        );
        break;

      // XML file format and other syndication formats.
      case "xml":
      case "rss":
      case "atom":
        return (
          "module.exports = JSON.parse('" +
          JSON.stringify(parseXML(readFileSync(mod.path).toString())) +
          "');"
        );
        break;

      /**
       * Base64-compatible raw images are converted into a lossless base64
       * format. Use the `packem-image-plugin` for handling advanced image
       * optimizations.
       *
       * @note SVG is returned as a string into the bundle output.
       * @warning IE8 has a limit of 32 KB for the Data URI Scheme. Versions below have no support.
       */
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "webp":
      case "bmp":
        return "module.exports = \"" + __dangerousConvertImageToBase64(mod.path) + "\";";
        break;
    }
  }
}

module.exports = PackemFilePlugin;
