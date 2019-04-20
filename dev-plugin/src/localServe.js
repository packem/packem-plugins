const fs = require("fs");
const path = require("path");
const http = require("http");
const mime = require("mime-types");

const getPortSync = require("./getPortSync");

module.exports = (configObject, eventsObject = {}) => {
  // Union is used even though result is definite
  const port = getPortSync({ port: configObject.port });
  // @ts-ignore noImplicitAny
  const httpServerInstance = http
    .createServer((request, response) => {
      let resourcePath = "." + request.url;

      // No force override. Default path leads to `index.html`.
      if (resourcePath == "./") resourcePath = "./index.html";

      typeof eventsObject.onRequest == "function" && eventsObject.onRequest();

      let filePath = path.resolve(
        configObject.publicPath || "./dist",
        resourcePath
      );

      // Make sure `filePath` exists ahead of serve.
      if (!fs.existsSync(filePath))
        // [onResourceNotFound] Provide filePath
        return /**<ServerObject>{} */;

      // If is a directory use an `index.html` file.
      if (fs.statSync(filePath).isDirectory())
        filePath = path.join(filePath, path.sep, "index.html");

      // console.log(resourcePath, filePath);

      // Content type should be decided last.
      const fileExtension = path.extname(filePath);
      const contentType =
        mime.lookup(fileExtension) || "application/octet-stream";

      fs.readFile(filePath, function(error, content) {
        if (error) {
          if (!(error.code == "ENOENT")) {
            response.writeHead(500);
            // [onInternalError] Get returned string and display here.
            response.end();
          }
        } else {
          // [onSuccessfulResponse] Get returned string and display here.
          response.writeHead(200, { "Content-Type": contentType });
          response.end(content, "utf-8");
        }
      });
    })
    .listen(port);
  
  const devserverUrl = `http://localhost:${port}`

  typeof eventsObject.onWake == "function" && eventsObject.onWake(devserverUrl);

  return {
    // Pass down the resolved port
    port,
    httpServerInstance
  };
};
