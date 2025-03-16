const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onToggleBars: (callback) => ipcRenderer.on("toggle-bars", callback),
});

