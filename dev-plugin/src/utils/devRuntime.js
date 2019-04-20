/* Packem development runtime */
var __packem = {
  import: function(url) {
    return __packem.fetch(url);
  },
  require: function(modID) {
    var module = { exports: {} };

    try {
      __packemModules[modID](
        __packem.require,
        __packem.import,
        module,
        module.exports
      );
    } catch (e) {
      console.error("Error: Unable to load module: " + modID + "\n" + e);
      return;
    }

    return module.exports.default || module.exports;
  },
  reload: function() {
    __packem.require("_mod_root");
  }
};

__packem.reload();

// HMR Socket
if (typeof WebSocket !== "undefined") {
  var protocol = location.protocol === "https:" ? "wss" : "ws";
  var devSocket = new WebSocket(protocol + "://localhost:" + devServerPort);

  devSocket.onmessage = function(event) {
    var data = JSON.parse(event.data);

    switch (data.type) {
      // HMR ops
      case "MODULE_UNLINK":
        eval(
          "__packemModules._mod_" +
            data.modId +
            " = function(require, module, exports) {module.exports=null;};"
        );
        __packem.reload();
        break;
      case "MODULE_UPDATE":
        eval(data.subsequentBundle);
        __packem.reload();
        break;

      // Message broadcasts
      case "MESSAGE_DIALOG":
        logMessageDialog(data.msg);
        break;
      case "CONSOLE_LOG":
        console.log(data.msg);
        break;
      case "CONSOLE_ERROR":
        console.error(data.msg);
        break;

      default:
        break;
    }
  };
} else {
  logMessageDialog(
    '<strong style="color:#dd4949;">&#x2718; Error</strong>: Packem\'s Developper plugin requires the WebSocket API. Please update your browser.'
  );
}

// Development message dialog
function logMessageDialog(msg) {
  var msgDialogWrapper = document.querySelector(
    "#packem-msg-dialog > div.msg-wrapper"
  );

  if (msgDialogWrapper) {
    msgDialogWrapper.innerHTML =
      '<p style="word-wrap:break-word;">' + msg + "</p>";
    msgDialogWrapper.parentNode.style.display = "block";
  } else {
    // create dialog
    var msgDialog = document.createElement("div");
    msgDialog.id = "packem-msg-dialog";
    msgDialog.style =
      "position:fixed;width:100%;height:100%;z-index:99998;background-color:rgba(0,0,0,0.9);left:0;top:0;right:0;bottom:0;";
    var closeDialog = document.createElement("span");
    closeDialog.style =
      "width:30px;position:absolute;z-index:99999;top:0;right:0;color:#fff;font-size:35px;text-align:center;padding:25px;cursor:pointer;";
    closeDialog.innerHTML = "&#x2718;";
    closeDialog.onclick = function() {
      this.parentNode.style.display = "none";
    };
    closeDialog.onmouseenter = function() {
      this.style.color = "#dd4949";
    };
    closeDialog.onmouseleave = function() {
      this.style.color = "#fff";
    };
    var msgWrapper = document.createElement("div");
    msgWrapper.className = "msg-wrapper";
    msgWrapper.style =
      "height:100%;font-family:monospace;color:rgb(255,255,255);padding:50px;font-size:20px;user-select:none;width:100%;box-sizing:border-box;overflow-y:auto;";
    msgWrapper.innerHTML = '<p style="word-wrap:break-word;">' + msg + "</p>";

    msgDialog.appendChild(closeDialog);
    msgDialog.appendChild(msgWrapper);

    document.body.appendChild(msgDialog);
  }
}
