const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

// Hardcoded path based on discovery
const ADB_PATH = '/Users/maheshgupta/Library/Android/sdk/platform-tools/adb';

// Helper to run ADB commands securely
const runAdb = (args) => {
    return new Promise((resolve, reject) => {
        // args must be an array
        if (!Array.isArray(args)) {
            reject(new Error("Internal Error: ADB arguments must be an array"));
            return;
        }

        console.log(`[ADB] Running: ${ADB_PATH} ${args.join(' ')}`);
        execFile(ADB_PATH, args, { encoding: 'utf8' }, (error, stdout, stderr) => {
            if (error) {
                console.error(`[ADB] Error: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr && !stderr.includes('daemon not running') && !stderr.includes('daemon started')) {
                console.warn(`[ADB] Stderr: ${stderr}`);
            }
            // console.log(`[ADB] Output:`, stdout); // Verbose logging
            resolve(stdout.trim());
        });
    });
};

module.exports = {
    getDevices: async () => {
        const output = await runAdb(['devices', '-l']);
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
        try {
            // Safe execution with array args
            const output = await runAdb(['shell', 'ls', '-l', devicePath]);
            const lines = output.split('\n');
            return lines.map(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 8) return null;

                const isDir = line.startsWith('d');
                // Name starts after time.
                // Depending on ls -l format, date/time might take 2 or 3 columns.
                // Assuming standard android ls -l:
                // drwxrwx--x 28 root sdcard_rw 4096 2023-01-01 12:00 Alarms
                // parts[0]...parts[7] is "12:00"
                const nameStartIndex = 7;
                const name = parts.slice(nameStartIndex).join(' ');
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
        return runAdb(['pull', devicePath, localPath]);
    },

    pushFile: (localPath, devicePath) => {
        return runAdb(['push', localPath, devicePath]);
    },

    deleteFile: (devicePath) => {
        return runAdb(['shell', 'rm', '-rf', devicePath]);
    },

    // Expose raw command for other needs - MUST PASS ARRAY
    run: runAdb
};
