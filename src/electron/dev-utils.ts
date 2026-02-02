import { execSync } from "child_process";
import { isDev, DEV_PORT } from "./util.js";

export function killViteDevServer(): void {
    if (!isDev()) return;
    try {
        const pids = new Set<number>();

        if (process.platform === "win32") {
            const output = execSync("netstat -ano -p tcp", { stdio: "pipe" }).toString();
            for (const line of output.split(/\r?\n/)) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                const parts = trimmed.split(/\s+/);
                if (parts.length < 4) continue;
                const localAddress = parts[1] || "";
                const pidValue = parts[parts.length - 1] || "";
                if (localAddress.endsWith(`:${DEV_PORT}`) || localAddress.includes(`]:${DEV_PORT}`)) {
                    const pid = Number(pidValue);
                    if (Number.isFinite(pid)) {
                        pids.add(pid);
                    }
                }
            }
        } else {
            const commands: Array<{ cmd: string; parser: (output: string) => number[] }> = [
                {
                    cmd: `lsof -ti:${DEV_PORT}`,
                    parser: (output) =>
                        output
                            .split(/\s+/)
                            .map((value) => Number(value))
                            .filter((value) => Number.isFinite(value))
                },
                {
                    cmd: `fuser ${DEV_PORT}/tcp`,
                    parser: (output) => {
                        const cleaned = output.replace(`${DEV_PORT}/tcp:`, "");
                        return cleaned
                            .split(/\s+/)
                            .map((value) => Number(value))
                            .filter((value) => Number.isFinite(value));
                    }
                },
                {
                    cmd: `ss -lptn "sport = :${DEV_PORT}"`,
                    parser: (output) => {
                        const matches = output.matchAll(/pid=(\d+)/g);
                        const ids: number[] = [];
                        for (const match of matches) {
                            const pid = Number(match[1]);
                            if (Number.isFinite(pid)) {
                                ids.push(pid);
                            }
                        }
                        return ids;
                    }
                }
            ];

            for (const { cmd, parser } of commands) {
                try {
                    const output = execSync(cmd, { stdio: "pipe" }).toString();
                    for (const pid of parser(output)) {
                        pids.add(pid);
                    }
                    if (pids.size > 0) break;
                } catch {
                    // Try next strategy
                }
            }
        }

        for (const pid of pids) {
            try {
                process.kill(pid);
            } catch {
                // Ignore permissions or already-exited processes
            }
        }
    } catch {
        // Process may already be dead
    }
}
