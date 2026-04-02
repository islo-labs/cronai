import { createServer, type Socket } from "node:net";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { loadConfig, loadCredentials } from "./config.js";
import { Scheduler } from "./scheduler.js";

const DIR = resolve(homedir(), ".cronai");
const SOCK = resolve(DIR, "cronai.sock");
const PID_FILE = resolve(DIR, "pid");

export function startDaemon(configPath?: string) {
  mkdirSync(DIR, { recursive: true });

  // Clean up stale socket
  if (existsSync(SOCK)) unlinkSync(SOCK);

  const config = loadConfig(configPath);
  const credentials = loadCredentials();
  const scheduler = new Scheduler(config.crons, credentials, config.configPath);

  const clients = new Set<Socket>();

  function broadcast() {
    const state = JSON.stringify({
      type: "state",
      crons: scheduler.getCrons().map((s) => ({
        name: s.config.name,
        schedule: s.config.schedule,
        status: s.status,
        lastRun: s.lastRun?.toISOString() ?? null,
        nextRun: s.nextRun.toISOString(),
        output: s.lastResult?.output ?? "",
        error: s.lastResult?.error ?? null,
        success: s.lastResult?.success ?? null,
        durationMs: s.lastResult?.durationMs ?? 0,
        cost: s.lastResult?.cost ?? null,
        sessionId: s.lastResult?.sessionId ?? null,
      })),
    });
    for (const client of clients) {
      try { client.write(state + "\n"); } catch { clients.delete(client); }
    }
  }

  scheduler.onStateChange(broadcast);
  scheduler.start();

  const server = createServer((socket) => {
    clients.add(socket);
    // Send current state immediately
    broadcast();

    let buffer = "";
    socket.on("data", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const cmd = JSON.parse(line);
          if (cmd.cmd === "run") scheduler.runNow(cmd.name);
          if (cmd.cmd === "delete") scheduler.deleteCron(cmd.name);
        } catch {}
      }
    });

    socket.on("close", () => clients.delete(socket));
    socket.on("error", () => clients.delete(socket));
  });

  server.listen(SOCK, () => {
    writeFileSync(PID_FILE, process.pid.toString());
  });

  // Broadcast every 30s to update relative times
  setInterval(broadcast, 30_000);

  const cleanup = () => {
    scheduler.stop().then(() => {
      server.close();
      if (existsSync(SOCK)) unlinkSync(SOCK);
      if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
      process.exit(0);
    });
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}
