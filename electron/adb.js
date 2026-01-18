const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Hardcoded path based on discovery
const ADB_PATH = '/Users/maheshgupta/Library/Android/sdk/platform-tools/adb';

// Helper to run ADB commands
const runAdb = (args) => {
    return new Promise((resolve, reject) => {
        console.log(`[ADB] Running: ${ADB_PATH} ${args}`);
        exec(`${ADB_PATH} ${args}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`[ADB] Error: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr && !stderr.includes('daemon not running') && !stderr.includes('daemon started')) {
                console.warn(`[ADB] Stderr: ${stderr}`);
            }
            console.log(`[ADB] Output for ${args}:`, stdout);
            resolve(stdout.trim());
        });
    });
};

module.exports = {
    getDevices: async () => {
        const output = await runAdb('devices -l');
        const lines = output.split('\n').slice(1); // Skip header
        return lines
            .filter(line => line.trim() !== '')
            .map(line => {
                const parts = line.split(/\s+/);
                return {
                    id: parts[0],
                    type: parts[1],
                    details: line.substring(parts[0].length + parts[1].length + 2)
                };
            });
    },

    listDir: async (devicePath) => {
        // ls -l format: permissions links owner group size date time name
        // We force a specific format or parse carefully. 'ls -l' behaves differently on some androids.
        // Trying 'ls -l' first.
        try {
            const output = await runAdb(`shell ls -l "${devicePath}"`);
            const lines = output.split('\n');
            return lines.map(line => {
                // Very basic parser, might need robustifying for Android ls structure
                // Typical line: drwxrwx--x 28 root sdcard_rw 4096 2023-01-01 12:00 Alarms
                // Or: -rw-rw---- 1 root sdcard_rw 1234 2023-01-01 12:00 file.txt
                const parts = line.trim().split(/\s+/);
                if (parts.length < 8) return null;

                const isDir = line.startsWith('d');
                const name = parts.slice(7).join(' '); // Name starts after time, usually 8th token
                const size = parts[4];
                const date = `${parts[5]} ${parts[6]}`;

                return { name, isDir, size, date, path: path.posix.join(devicePath, name) };
            }).filter(item => item !== null && item.name !== '.' && item.name !== '..');
        } catch (e) {
            console.error("List dir failed", e);
            throw e;
        }
    },

    pullFile: (devicePath, localPath) => {
        return runAdb(`pull "${devicePath}" "${localPath}"`);
    },

    pushFile: (localPath, devicePath) => {
        return runAdb(`push "${localPath}" "${devicePath}"`);
    },

    deleteFile: (devicePath) => {
        // Use -f to force, -r for recursive (folders)
        // Need to be careful with quoting
        return runAdb(`shell rm -rf "${devicePath}"`);
    },

    // Expose raw command for other needs
    run: runAdb
};
