const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getDevices: () => ipcRenderer.invoke('adb:getDevices'),
    listDir: (path) => ipcRenderer.invoke('adb:listDir', path),
    pullFile: (devicePath, localPath) => ipcRenderer.invoke('adb:pullFile', devicePath, localPath),
    pushFile: (localPath, devicePath) => ipcRenderer.invoke('adb:pushFile', localPath, devicePath),
    openFile: (devicePath) => ipcRenderer.invoke('adb:openFile', devicePath),
    on: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
});
