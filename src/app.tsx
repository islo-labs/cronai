import React, { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "ink";
import { createConnection, type Socket } from "node:net";
import { resolve } from "node:path";
import { homedir } from "node:os";
import type { CronStatus } from "./scheduler.js";
import { Dashboard } from "./ui.js";

const SOCK = resolve(homedir(), ".cronai", "cronai.sock");

interface DaemonCron {
  name: string;
  schedule: string;
  status: CronStatus;
  lastRun: string | null;
  nextRun: string;
  output: string;
  error: string | null;
  success: boolean | null;
  durationMs: number;
  cost: number | null;
  sessionId: string | null;
}

// Convert daemon state to the shape the TUI expects
function toCronState(s: DaemonCron) {
  return {
    config: { name: s.name, schedule: s.schedule } as any,
    status: s.status,
    lastResult: s.status !== "idle" ? {
      success: s.success ?? false,
      output: s.output,
      error: s.error ?? undefined,
      durationMs: s.durationMs,
      exitCode: null as number | null,
      cost: s.cost ?? undefined,
      sessionId: s.sessionId ?? undefined,
    } : undefined,
    lastRun: s.lastRun ? new Date(s.lastRun) : undefined,
    nextRun: new Date(s.nextRun),
  };
}

export function App({ onResume }: { onResume: (sessionId: string, name: string) => void }) {
  const { exit } = useApp();
  const socketRef = useRef<Socket | null>(null);
  const [crons, setCrons] = useState<ReturnType<typeof toCronState>[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = createConnection(SOCK);
    socketRef.current = socket;
    let buffer = "";

    socket.on("connect", () => setConnected(true));

    socket.on("data", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.type === "state") {
            setCrons(msg.crons.map(toCronState));
          }
        } catch {}
      }
    });

    socket.on("error", () => setConnected(false));
    socket.on("close", () => { setConnected(false); exit(); });

    return () => { socket.destroy(); };
  }, []);

  const send = useCallback((cmd: object) => {
    socketRef.current?.write(JSON.stringify(cmd) + "\n");
  }, []);

  const handleRun = useCallback((name: string) => send({ cmd: "run", name }), [send]);
  const handleDelete = useCallback((name: string) => send({ cmd: "delete", name }), [send]);

  const handleResume = useCallback((name: string) => {
    const cron = crons.find((s) => s.config.name === name);
    const sessionId = cron?.lastResult?.sessionId;
    if (!sessionId) return;
    socketRef.current?.destroy();
    exit();
    setTimeout(() => onResume(sessionId, name), 100);
  }, [crons, exit, onResume]);

  const handleQuit = useCallback(() => {
    socketRef.current?.destroy();
  }, []);

  if (!connected) return null;

  return (
    <Dashboard
      crons={crons}
      onRun={handleRun}
      onDelete={handleDelete}
      onResume={handleResume}
      onQuit={handleQuit}
    />
  );
}
