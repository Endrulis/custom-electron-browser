const {
  app,
  BrowserWindow,
  session,
  ipcMain,
  globalShortcut,
} = require("electron");
const path = require("path");

let mainWindow;

require("electron-reload")(__dirname, {
  electron: require(`${__dirname}/node_modules/electron`),
  ignored: /browser-data|node_modules|[\/\\]\./,
});

app.setPath("userData", path.join(__dirname, "browser-data"));

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      sandbox: true,
      webviewTag: true,
      partition: "persist:custom-browser",
      allowRunningInsecureContent: false,
    },
  });

  mainWindow.webContents.on("will-attach-webview", (event, webPreferences) => {
    webPreferences.partition = "persist:custom-browser";
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
};

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self' 'unsafe-inline' data: blob: filesystem: http: https: ws: wss:",
        ],
      },
    });
  });

  globalShortcut.register("CommandOrControl+Shift+H", () => {
    if (mainWindow) {
      mainWindow.webContents.send("toggle-bars");
    }
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });

  ipcMain.on("enter-fullscreen", () => mainWindow?.setFullScreen(true));
  ipcMain.on("exit-fullscreen", () => mainWindow?.setFullScreen(false));

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: details.url.startsWith("https://example.com") });
  });

  createWindow();
});

app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
app.on(
  "activate",
  () => BrowserWindow.getAllWindows().length === 0 && createWindow()
);
