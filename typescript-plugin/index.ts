/* Copyright (c) 2019 packem-typescript-plugin */

const { PackemPlugin } = require("packem");

const { readFileSync, existsSync } = require("fs");
const path = require("path");
const ts = require("typescript");

// Gets the configuration options required for `ts.transpileModule`
// from the directory's `tsconfig.json` file and falls back to this
// plugin's `tscOptions` field whereby it returns an empty object to
// be passed into the module transpiler funtion.
function getTsConfig(pluginConfig: object) {
  const projectRootTsConfig = path.resolve(process.cwd(), "./tsconfig.json");

  if (existsSync(projectRootTsConfig))
    return JSON.parse(readFileSync("./tsconfig.json").toString());
  else if (pluginConfig["tscOptions"]) return pluginConfig["tscOptions"];

  return {};
}

// Takes `tsconfig.json` or this plugin's `tscOptions` field and converts
// it to a valid `CompilerOptions` object by piping defaults.
function validateTsConfig(config) /*: ts.CompilerOptions */ {
  // Exposes the defaults
  let pipedConfig = {
    skipLibCheck: true,
    suppressOutputPathCheck: true, // Refer to https://github.com/Microsoft/TypeScript/issues/7363
    ...config
  };

  // Checks for `module` and `target`
  if (
    pipedConfig.module === undefined &&
    (pipedConfig.target !== undefined && pipedConfig["target"] < 2) // ts.ScriptTarget.ES2015
  ) {
    pipedConfig.module = 1; // ts.ModuleKind.CommonJs
  }

  // Checks for `target` specifically
  // Check https://www.typescriptlang.org/docs/handbook/compiler-options.html
  if (pipedConfig.target && typeof pipedConfig.target === "string") {
    switch (pipedConfig.target) {
      case "ES3":
      case "es3":
        pipedConfig.target = ts.ScriptTarget.ES3;
        break;

      case "ES5":
      case "es5":
        pipedConfig.target = ts.ScriptTarget.ES5;
        break;

      case "ES6":
      case "es6":
      case "ES2015":
        pipedConfig.target = ts.ScriptTarget.ES2015;
        break;

      case "ES2016":
        pipedConfig.target = ts.ScriptTarget.ES2016;
        break;

      case "ES2017":
        pipedConfig.target = ts.ScriptTarget.ES2017;
        break;

      case "ES2018":
        pipedConfig.target = ts.ScriptTarget.ES2018;
        break;
      
      case "ES2019":
        pipedConfig.target = ts.ScriptTarget.ES2019;
        break;
      
      case "ESNext":
        pipedConfig.target = ts.ScriptTarget.ESNext;
        break;

      // When the target is not of a valid type
      // @todo Don't fail silently
      default:
        pipedConfig.target = ts.ScriptTarget.ES3;
        break;
    }
  }
  
  // When the target is not defined at all
  if(typeof pipedConfig.target === "undefined") {
    pipedConfig.target = ts.ScriptTarget.ES3;
  }

  return pipedConfig;
}

class PackemTypeScriptPlugin extends PackemPlugin {
  onModuleBundle(mod): any {
    const isTsxModule = mod.extension === "tsx";

    if (mod.extension === "ts" || isTsxModule) {
      const tsConfig = validateTsConfig(getTsConfig(this.pluginConfig));

      // @todo Handle diagnostics
      const transpileResult = ts.transpileModule(
        readFileSync(mod.filename).toString(),
        tsConfig,
        undefined, // fileName?
        this.pluginConfig.diagnostics || true,
        undefined // moduleName?
      );

      console.log(tsConfig, transpileResult.outputText);

      return `module.exports = function() {
  ${transpileResult.outputText}
}();`;
    }
  }
}

module.exports = PackemTypeScriptPlugin;
