const { app, BrowserWindow, session, ipcMain, globalShortcut, Menu } = require("electron");
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
      nativeWindowOpen: false,
      webviewTag: true, // Ensure webview support
      partition: "persist:custom-browser",
      allowRunningInsecureContent: false,
    },
  });

  mainWindow.webContents.on("will-attach-webview", (event, webPreferences) => {
    Object.assign(webPreferences, {
      nativeWindowOpen: true,
      allowpopups: true,
      partition: "persist:custom-browser",
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    });
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
};

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self' 'unsafe-inline' data: blob: filesystem: http: https: ws: wss:;",
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
