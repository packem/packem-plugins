/**
 * Copyright (c) 2019 Packem
 *
 * @PackemPlugin packem-minify-plugin
 */
const { PackemPlugin } = require("packem");
const { readFileSync, writeFileSync, statSync, existsSync } = require("fs");
const { dirname, resolve: resolvePath } = require("path");
const { minify: terserMinify } = require("terser");
function writeOutput(outputDirectory, outputFileName, fileContent) {
    if (statSync(outputDirectory).isDirectory()) {
        writeFileSync(resolvePath(outputDirectory, outputFileName), fileContent);
    }
}
class PackemMinifyPlugin extends PackemPlugin {
    onEnd(config) {
        // A bundle must exist in the output directory of the main bundle
        // @todo Abstract the logging to `PackemLogger` or `PackemCLI` or `PackemInvariant`
        if (!existsSync(config.output)) {
            throw Error("A bundle must be available for `packem-minify-plugin` to work.");
            return;
        }
        const { terserOptions = {} } = this.pluginConfig;
        const outputDirectory = dirname(config.output);
        const outputBundleFileName = this.pluginConfig.outputFilename || "bundle.min.js";
        const bundle = readFileSync(config.output).toString();
        const minifiedBundle = terserMinify(bundle, terserOptions);
        if (typeof minifiedBundle == "string") {
            writeOutput(outputDirectory, outputBundleFileName, minifiedBundle);
        }
        else if (minifiedBundle.code) {
            writeOutput(outputDirectory, outputBundleFileName, minifiedBundle.code);
            if (minifiedBundle.map) {
                let outputMapFileName = outputBundleFileName.replace(/.js$/, ".map") || "bundle.min.map";
                writeOutput(outputDirectory, outputMapFileName, minifiedBundle.map);
            }
        }
    }
}
module.exports = PackemMinifyPlugin;
