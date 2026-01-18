const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const adb = require('./adb');

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // In dev, load from vite dev server. In prod, load file.
    // Since we don't have dev server running effectively, we might rely on building or simplified loading.
    // For now, assuming standard Vite dev URL
    const devUrl = 'http://localhost:5173';

    // We can also try to load index.html directly if not running dev server
    // win.loadFile(path.join(__dirname, '../dist/index.html'));

    // But wait, the user instructions for this agent simulation imply we are running in dev mode usually.
    // Since I can't run npm run dev, the user will have to do it.

    win.loadURL(devUrl).catch(() => {
        console.log("Dev server not running, trying static file");
        // Fallback
        win.loadFile(path.join(__dirname, '../index.html'));
        // Note: loading src/index.html directly won't work well with modules without vite processing.
    });

    // Open DevTools
    // win.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers
ipcMain.handle('adb:getDevices', async () => {
    try {
        return await adb.getDevices();
    } catch (e) {
        return { error: e.message };
    }
});

ipcMain.handle('adb:listDir', async (event, path) => {
    try {
        return await adb.listDir(path);
    } catch (e) {
        throw e;
    }
});

ipcMain.handle('adb:pullFile', async (event, devicePath, localPath) => {
    // If localPath is not provided, show save dialog? 
    // For now assuming drag and drop provides path or we handle it on client
    if (!localPath) {
        // This logic usually belongs in renderer requesting a path, but we can do it here
        return { error: 'Local path required' };
    }
    return await adb.pullFile(devicePath, localPath);
});

ipcMain.handle('adb:pushFile', async (event, localPath, devicePath) => {
    return await adb.pushFile(localPath, devicePath);
});

ipcMain.handle('adb:deleteFile', async (event, devicePath) => {
    return await adb.deleteFile(devicePath);
});

ipcMain.handle('adb:openFile', async (event, devicePath) => {
    try {
        const fileName = path.basename(devicePath);
        const tempPath = path.join(os.tmpdir(), fileName);

        // Remove existing temp file if it exists to ensure fresh copy
        // fs.rmSync(tempPath, { force: true }); 
        // Actually runAdb('pull') will overwrite usually, but good to know locations.

        await adb.pullFile(devicePath, tempPath);

        // Open the file with default app
        const result = await shell.openPath(tempPath);
        if (result) {
            // result is error string if failed
            throw new Error(result);
        }
        return { success: true, path: tempPath };
    } catch (e) {
        console.error("Failed to open file", e);
        return { error: e.message };
    }
});
ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

ipcMain.handle('dialog:selectFiles', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths;
});
