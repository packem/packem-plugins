const { readFileSync, writeFileSync } = require("fs");
const path = require("path");

const devRuntime = readFileSync(path.join(__dirname, "devRuntime.js"));

module.exports = (outputPath, initialBundleContent, devServerPort) => {
  const resolvedBundle = `/*
  * Bundled with Packem v0.1.0 (${new Date().toUTCString()})
  * Mode: development
  */
 ;(function() {
   var __packemModules = {};
 ${initialBundleContent}
   
   var devServerPort = "${devServerPort}";
 
 ${devRuntime}
 })();`

  writeFileSync(outputPath, resolvedBundle)
}

// module.exports = (initialBundleContent, devServerPort) => `<!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8">
// <meta name="viewport" content="width=device-width, initial-scale=1.0">
// <meta http-equiv="X-UA-Compatible" content="ie=edge">
// <title>Packem | DevServer</title>
// </head>
// <body>
// <script id="packem-bundle">
// /*
//  * Bundled with Packem v0.1.0 (${new Date().toUTCString()})
//  * Mode: development
//  */
// ;(function() {
//   var __packemModules = {};
// ${initialBundleContent}
  
//   var devServerPort = "${devServerPort}";

// ${devRuntime}
// })();
// </script>
// </body>
// </html>
// `;
