const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getDevices: () => ipcRenderer.invoke('adb:getDevices'),
    listDir: (path) => ipcRenderer.invoke('adb:listDir', path),
    pullFile: (devicePath, localPath) => ipcRenderer.invoke('adb:pullFile', devicePath, localPath),
    pushFile: (localPath, devicePath) => { return ipcRenderer.invoke('adb:pushFile', localPath, devicePath); },
    deleteFile: (devicePath) => { return ipcRenderer.invoke('adb:deleteFile', devicePath); },
    deleteFiles: (devicePaths) => { return ipcRenderer.invoke('adb:deleteFiles', devicePaths); },
    openFile: (devicePath) => { return ipcRenderer.invoke('adb:openFile', devicePath); },
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
    selectFiles: () => ipcRenderer.invoke('dialog:selectFiles'),
    on: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
});
