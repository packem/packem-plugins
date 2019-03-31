const { PackemPlugin } = require("packem");
const { readFileSync, existsSync } = require("fs");
const path = require("path");
const ts = require("typescript");
function getTsConfig(pluginConfig) {
    const projectRootTsConfig = path.resolve(process.cwd(), "./tsconfig.json");
    if (existsSync(projectRootTsConfig))
        return JSON.parse(readFileSync("./tsconfig.json").toString());
    else if (pluginConfig["tscOptions"])
        return pluginConfig["tscOptions"];
    return {};
}
function validateTsConfig(config) {
    let pipedConfig = Object.assign({ skipLibCheck: true, suppressOutputPathCheck: true }, config);
    if (pipedConfig.module === undefined &&
        (pipedConfig.target !== undefined && pipedConfig["target"] < 2)) {
        pipedConfig.module = 1;
    }
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
            default:
                pipedConfig.target = ts.ScriptTarget.ES3;
                break;
        }
    }
    if (typeof pipedConfig.target === "undefined") {
        pipedConfig.target = ts.ScriptTarget.ES3;
    }
    return pipedConfig;
}
class PackemTypeScriptPlugin extends PackemPlugin {
    onModuleBundle(mod) {
        const isTsxModule = mod.extension === "tsx";
        if (mod.extension === "ts" || isTsxModule) {
            const tsConfig = validateTsConfig(getTsConfig(this.pluginConfig));
            const transpileResult = ts.transpileModule(readFileSync(mod.filename).toString(), tsConfig, undefined, this.pluginConfig.diagnostics || true, undefined);
            console.log(tsConfig, transpileResult.outputText);
            return `module.exports = function() {
  ${transpileResult.outputText}
}();`;
        }
    }
}
module.exports = PackemTypeScriptPlugin;
