const getPort = require("get-port");
const deasync = require("deasync");

module.exports = (portConfig) => {
  let isDone = false;
  let freeport = null;
  let capturedError = null;

  getPort(portConfig)
    .then(port => {
      isDone = true;
      freeport = port;
    })
    .catch(err => {
      isDone = true;
      capturedError = err;
    });

  // Wait until done
  deasync.loopWhile(() => !isDone);

  if (capturedError) {
    throw capturedError;
  } else {
    return freeport;
  }
};
