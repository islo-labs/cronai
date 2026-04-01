import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "ink";
import { Scheduler } from "./scheduler.js";
import type { ShiftState } from "./scheduler.js";
import { Dashboard } from "./ui.js";

export function App({
  scheduler,
  onResume,
}: {
  scheduler: Scheduler;
  onResume: (sessionId: string, shiftName: string) => void;
}) {
  const { exit } = useApp();
  const [shifts, setShifts] = useState<ShiftState[]>(scheduler.getShifts());

  useEffect(() => {
    scheduler.start();
    const unsubscribe = scheduler.onStateChange(() => {
      setShifts([...scheduler.getShifts()]);
    });
    return () => { unsubscribe(); scheduler.stop(); };
  }, [scheduler]);

  useEffect(() => {
    const timer = setInterval(() => {
      setShifts([...scheduler.getShifts()]);
    }, 30_000);
    return () => clearInterval(timer);
  }, [scheduler]);

  const handleRun = useCallback((name: string) => {
    scheduler.runNow(name);
  }, [scheduler]);

  const handleDelete = useCallback((name: string) => {
    scheduler.deleteShift(name);
  }, [scheduler]);

  const handleResume = useCallback((name: string) => {
    const sessionId = scheduler.getSessionId(name);
    if (!sessionId) return;
    exit();
    setTimeout(() => onResume(sessionId, name), 100);
  }, [scheduler, exit, onResume]);

  const handleQuit = useCallback(() => {
    scheduler.stop();
  }, [scheduler]);

  return (
    <Dashboard
      shifts={shifts}
      onRun={handleRun}
      onDelete={handleDelete}
      onResume={handleResume}
      onQuit={handleQuit}
    />
  );
}
