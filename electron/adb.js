const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

// State for ADB Path
let adbPath = null;

// Helper to check if a path works
const checkAdb = (pathToCheck) => {
    return new Promise((resolve) => {
        execFile(pathToCheck, ['version'], (error) => {
            resolve(!error);
        });
    });
};

const init = async (userDataPath) => {
    const configPath = path.join(userDataPath, 'config.json');
    let foundPath = null;

    // 1. Check existing config
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.adbPath && await checkAdb(config.adbPath)) {
                foundPath = config.adbPath;
                console.log("[ADB] Using configured path:", foundPath);
            }
        } catch (e) {
            console.error("[ADB] Failed to read config:", e);
        }
    }

    if (!foundPath) {
        // 2. Check system PATH (try 'adb')
        if (await checkAdb('adb')) {
            foundPath = 'adb';
            console.log("[ADB] Found in system PATH");
        } else {
            // 3. Check common locations
            const os = require('os');
            const commonPaths = [
                path.join(os.homedir(), 'Library/Android/sdk/platform-tools/adb'), // macOS User SDK
                '/opt/homebrew/bin/adb',
                '/usr/local/bin/adb'
            ];

            for (const p of commonPaths) {
                if (fs.existsSync(p) && await checkAdb(p)) {
                    foundPath = p;
                    console.log("[ADB] Found in common location:", p);
                    break;
                }
            }
        }
    }

    if (foundPath) {
        adbPath = foundPath;
        // Save to config
        try {
            fs.writeFileSync(configPath, JSON.stringify({ adbPath: foundPath }, null, 2));
        } catch (e) {
            console.error("[ADB] Failed to save config", e);
        }
    } else {
        console.error("[ADB] Could not find ADB executable!");
        // Fallback to 'adb' and hope for the best? Or throw?
        // Let's set it to 'adb' so at least it attempts if path is fixed later
        adbPath = 'adb';
    }
};

// Helper to run ADB commands securely
const runAdb = (args) => {
    return new Promise((resolve, reject) => {
        if (!adbPath) {
            reject(new Error("ADB not initialized. Call init() first."));
            return;
        }

        // args must be an array
        if (!Array.isArray(args)) {
            reject(new Error("Internal Error: ADB arguments must be an array"));
            return;
        }

        console.log(`[ADB] Running: ${adbPath} ${args.join(' ')}`);
        execFile(adbPath, args, { encoding: 'utf8' }, (error, stdout, stderr) => {
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
            // Safe execution with array args.
            // NOTE: For 'adb shell', we MUST quote paths because adb passes them to the remote shell.
            // execFile passes args to adb, but adb constructs a shell command string.
            const output = await runAdb(['shell', 'ls', '-l', `"${devicePath}"`]);
            const lines = output.split('\n');
            return lines.map(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 8) return null;

                const isDir = line.startsWith('d');
                // Name starts after time.
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
        // 'pull' is not a shell command, so execFile handles args correctly without extra quotes
        return runAdb(['pull', devicePath, localPath]);
    },

    pushFile: (localPath, devicePath) => {
        // 'push' is not a shell command
        return runAdb(['push', localPath, devicePath]);
    },

    deleteFile: (devicePath) => {
        // 'shell rm' needs quotes
        return runAdb(['shell', 'rm', '-rf', `"${devicePath}"`]);
    },

    deleteFiles: async (devicePaths) => {
        if (!devicePaths || devicePaths.length === 0) return;

        // Batch size tailored for rough command length limit
        const BATCH_SIZE = 50;

        for (let i = 0; i < devicePaths.length; i += BATCH_SIZE) {
            const batch = devicePaths.slice(i, i + BATCH_SIZE);
            // Quote all paths for shell
            const quotedBatch = batch.map(p => `"${p}"`);
            await runAdb(['shell', 'rm', '-rf', ...quotedBatch]);
        }
        return true;
    },

    // Expose raw command for other needs - MUST PASS ARRAY
    run: runAdb,
    init: init
};
