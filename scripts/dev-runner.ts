import { spawn } from "bun";

console.log("Starting development environment...");

// Start React Dev Server
const reactProcess = spawn(["bun", "run", "dev:react"], {
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env },
});

// Start Electron
// We add a small delay to allow React to start, although Electron handles loading delays gracefully usually
// Or relying on manual refresh if it fails first time. 
// But since we are replacing 'sleep 1', let's just run it immediately or with a tiny timeout if we could.
// For simplicity and robustness, we just run it. The parallel execution is what we want.

const electronProcess = spawn(["bun", "run", "dev:electron"], {
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env },
});

// Handle exit
const cleanup = () => {
    console.log("\nStopping processes...");
    reactProcess.kill();
    electronProcess.kill();
    process.exit(0);
};

// Trap signals
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

// If Electron exits (window closed), we should stop React too
electronProcess.exited.then((code: number) => {
    console.log(`Electron exited with code ${code}`);
    cleanup();
});

// Keep the script running until processes exit
await Promise.all([reactProcess.exited, electronProcess.exited]);
