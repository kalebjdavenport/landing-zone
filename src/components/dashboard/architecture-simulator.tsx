"use client";

import { Database, RadioTower, Server, SatelliteDish, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type SourceKind = "NWS" | "Aviation";

interface RunEntry {
  id: number;
  source: SourceKind;
  startedAt: string;
  done: boolean;
}

const STAGES = [
  { label: "Fetch", desc: "NWS + AWC APIs", icon: SatelliteDish },
  { label: "Normalize", desc: "Parse & score severity", icon: Server },
  { label: "Persist", desc: "Postgres upsert + event_log", icon: Database },
  { label: "Push", desc: "Realtime broadcast", icon: RadioTower },
  { label: "Refresh", desc: "tRPC invalidate → rerender", icon: Sparkles },
] as const;

const STEP_MS = 1400;
const AUTO_INTERVAL_MS = 12_000;
const MAX_HISTORY = 5;

export function ArchitectureSimulator() {
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [activeSource, setActiveSource] = useState<SourceKind | null>(null);
  const [history, setHistory] = useState<RunEntry[]>([]);
  const [autoPoll, setAutoPoll] = useState(true);
  const counterRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runFlow = useCallback((source: SourceKind) => {
    if (activeStage !== null) return;

    const id = ++counterRef.current;
    const startedAt = new Date().toISOString();

    setActiveSource(source);
    setActiveStage(0);
    setHistory((prev) => [{ id, source, startedAt, done: false }, ...prev].slice(0, MAX_HISTORY));

    let step = 0;
    const advance = () => {
      step += 1;
      if (step < STAGES.length) {
        setActiveStage(step);
        timerRef.current = setTimeout(advance, STEP_MS);
      } else {
        timerRef.current = setTimeout(() => {
          setActiveStage(null);
          setActiveSource(null);
          setHistory((prev) =>
            prev.map((r) => (r.id === id ? { ...r, done: true } : r)),
          );
        }, STEP_MS);
      }
    };
    timerRef.current = setTimeout(advance, STEP_MS);
  }, [activeStage]);

  // Auto-poll alternates between NWS and Aviation
  useEffect(() => {
    if (!autoPoll) return;
    let tick = 0;
    const id = setInterval(() => {
      runFlow(tick % 2 === 0 ? "NWS" : "Aviation");
      tick += 1;
    }, AUTO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoPoll, runFlow]);

  // Kick off one run on mount
  useEffect(() => {
    const id = setTimeout(() => runFlow("NWS"), 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const totalRuns = history.length;
  const completedRuns = history.filter((r) => r.done).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingest Pipeline</CardTitle>
        <CardDescription>
          How data flows from external APIs to the dashboard UI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pipeline stages */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          {/* Source indicator */}
          {activeSource && (
            <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
              <span>Source:</span>
              <Badge variant={activeSource === "NWS" ? "moderate" : "low"}>
                {activeSource === "NWS" ? "NWS — alerts, forecasts, observations" : "AWC — METAR, TAF, SIGMET"}
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between gap-1">
            {STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const isActive = activeStage === i;
              const isReached = activeStage !== null && activeStage >= i;

              return (
                <div key={stage.label} className="flex flex-1 items-center">
                  <motion.div
                    className={cn(
                      "flex w-full flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center text-xs transition-colors",
                      isActive
                        ? "border-cyan-400 bg-cyan-50 ring-2 ring-cyan-200"
                        : isReached
                          ? "border-cyan-300 bg-cyan-50"
                          : "border-slate-200 bg-white",
                    )}
                    animate={isActive ? { scale: 1.05 } : { scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Icon className={cn("h-4 w-4", isReached ? "text-cyan-600" : "text-slate-400")} />
                    <span className={cn("font-semibold", isReached ? "text-cyan-800" : "text-slate-600")}>
                      {stage.label}
                    </span>
                    <span className="hidden text-[10px] leading-tight text-slate-500 sm:block">
                      {stage.desc}
                    </span>
                  </motion.div>
                  {i < STAGES.length - 1 && (
                    <div className="mx-1 flex-shrink-0">
                      <div className={cn(
                        "h-0.5 w-3 transition-colors duration-500",
                        activeStage !== null && activeStage > i ? "bg-cyan-400" : "bg-slate-200",
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-xs text-slate-500">Total runs</p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{totalRuns}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-xs text-slate-500">Completed</p>
            <p className="mt-0.5 text-lg font-semibold text-emerald-700">{completedRuns}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-xs text-slate-500">Status</p>
            <p className={cn("mt-0.5 text-lg font-semibold", activeStage !== null ? "text-cyan-600" : "text-slate-400")}>
              {activeStage !== null ? "Running" : "Idle"}
            </p>
          </div>
        </div>

        <Separator />

        {/* Controls + history */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => runFlow("NWS")} disabled={activeStage !== null}>
            Trigger NWS
          </Button>
          <Button size="sm" variant="outline" onClick={() => runFlow("Aviation")} disabled={activeStage !== null}>
            Trigger Aviation
          </Button>
          <Button size="sm" variant={autoPoll ? "default" : "outline"} onClick={() => setAutoPoll((c) => !c)}>
            Auto: {autoPoll ? "on" : "off"}
          </Button>
        </div>

        {history.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-medium text-slate-500">Recent runs</h4>
            {history.map((run) => (
              <div key={run.id} className="flex items-center justify-between rounded-md border border-slate-100 bg-white px-3 py-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant={run.source === "NWS" ? "moderate" : "low"} className="text-[10px]">
                    {run.source}
                  </Badge>
                  <span className={run.done ? "text-emerald-600" : "text-cyan-600"}>
                    {run.done ? "Complete" : "Running…"}
                  </span>
                </div>
                <span className="text-slate-400">
                  {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
