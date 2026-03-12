"use client";

import { Database, RadioTower, RefreshCcw, Server, SatelliteDish, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type SourceKind = "NWS" | "Aviation";
type TriggerKind = "manual" | "poller";
type FlowStatus = "running" | "complete";

interface FlowEvent {
  id: number;
  source: SourceKind;
  trigger: TriggerKind;
  stage: number;
  status: FlowStatus;
  startedAt: string;
}

interface FlowMetrics {
  ingests: number;
  dbWrites: number;
  websocketPushes: number;
  uiRefreshes: number;
}

const AUTO_POLL_INTERVAL_MS = 10000;
const FLOW_STEP_MS = 700;

const STAGES = [
  {
    title: "1. Pull APIs",
    description: "NWS/AWC are queried by the server",
    icon: SatelliteDish,
  },
  {
    title: "2. Ingest",
    description: "Normalize, score, and map records",
    icon: Server,
  },
  {
    title: "3. Postgres",
    description: "Write snapshots + event_log",
    icon: Database,
  },
  {
    title: "4. WebSocket",
    description: "Supabase Realtime broadcasts insert",
    icon: RadioTower,
  },
  {
    title: "5. UI Refresh",
    description: "tRPC queries invalidate and rerender",
    icon: Sparkles,
  },
] as const;

const LAST_STAGE_INDEX = STAGES.length - 1;

export function ArchitectureSimulator() {
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [autoPoll, setAutoPoll] = useState(true);
  const [metrics, setMetrics] = useState<FlowMetrics>({
    ingests: 0,
    dbWrites: 0,
    websocketPushes: 0,
    uiRefreshes: 0,
  });

  const counterRef = useRef(0);
  const timersRef = useRef<Set<number>>(new Set());

  const activeEvent = useMemo(
    () => events.find((item) => item.status === "running") ?? null,
    [events],
  );

  const clearAllTimers = useCallback(() => {
    for (const timer of timersRef.current) {
      window.clearTimeout(timer);
      window.clearInterval(timer);
    }
    timersRef.current.clear();
  }, []);

  const scheduleTimeout = useCallback((callback: () => void, delayMs: number) => {
    const timeoutId = window.setTimeout(() => {
      timersRef.current.delete(timeoutId);
      callback();
    }, delayMs);

    timersRef.current.add(timeoutId);
  }, []);

  const launchFlow = useCallback(
    (source: SourceKind, trigger: TriggerKind) => {
      const id = counterRef.current + 1;
      counterRef.current = id;

      const startedAt = new Date().toISOString();

      setMetrics((previous) => ({
        ...previous,
        ingests: previous.ingests + 1,
      }));

      setEvents((previous) => {
        const next: FlowEvent = {
          id,
          source,
          trigger,
          stage: 0,
          status: "running",
          startedAt,
        };

        return [next, ...previous].slice(0, 14);
      });

      const advance = (stageIndex: number) => {
        setEvents((previous) =>
          previous.map((item) =>
            item.id === id
              ? {
                  ...item,
                  stage: stageIndex,
                  status: stageIndex >= LAST_STAGE_INDEX ? "complete" : "running",
                }
              : item,
          ),
        );

        if (stageIndex === 2) {
          setMetrics((previous) => ({
            ...previous,
            dbWrites: previous.dbWrites + 1,
          }));
        }

        if (stageIndex === 3) {
          setMetrics((previous) => ({
            ...previous,
            websocketPushes: previous.websocketPushes + 1,
          }));
        }

        if (stageIndex === 4) {
          setMetrics((previous) => ({
            ...previous,
            uiRefreshes: previous.uiRefreshes + 1,
          }));
        }

        if (stageIndex < LAST_STAGE_INDEX) {
          scheduleTimeout(() => advance(stageIndex + 1), FLOW_STEP_MS);
        }
      };

      advance(0);
    },
    [scheduleTimeout],
  );

  useEffect(() => {
    if (!autoPoll) {
      return;
    }

    const intervalId = window.setInterval(() => {
      launchFlow(Math.random() > 0.45 ? "NWS" : "Aviation", "poller");
    }, AUTO_POLL_INTERVAL_MS);

    const timers = timersRef.current;
    timers.add(intervalId);

    return () => {
      window.clearInterval(intervalId);
      timers.delete(intervalId);
    };
  }, [autoPoll, launchFlow]);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Architecture Toy Visualizer</CardTitle>
        <CardDescription>
          Demonstrates current runtime flow: upstream pull ingestion followed by downstream WebSocket UI updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => launchFlow("NWS", "manual")}>
            Trigger NWS Pull
          </Button>
          <Button size="sm" variant="outline" onClick={() => launchFlow("Aviation", "manual")}>
            Trigger Aviation Pull
          </Button>
          <Button size="sm" onClick={() => setAutoPoll((current) => !current)}>
            {autoPoll ? "Auto Poll: On" : "Auto Poll: Off"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              clearAllTimers();
              setEvents([]);
              setMetrics({
                ingests: 0,
                dbWrites: 0,
                websocketPushes: 0,
                uiRefreshes: 0,
              });
            }}
          >
            <RefreshCcw className="mr-1.5 h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Metric label="Ingest Runs" value={metrics.ingests} />
          <Metric label="DB Writes" value={metrics.dbWrites} />
          <Metric label="Socket Pushes" value={metrics.websocketPushes} />
          <Metric label="UI Refreshes" value={metrics.uiRefreshes} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="relative mb-4 h-2 rounded-full bg-slate-200">
            <motion.div
              className={cn(
                "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white",
                activeEvent ? "bg-cyan-500 shadow-[0_0_0_6px_rgba(6,182,212,0.18)]" : "bg-slate-400",
              )}
              animate={{
                left: `${
                  ((activeEvent?.stage ?? LAST_STAGE_INDEX) / LAST_STAGE_INDEX) * 100
                }%`,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              style={{ translateX: "-50%" }}
            />
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            {STAGES.map((stage, stageIndex) => {
              const Icon = stage.icon;
              const reached = activeEvent ? activeEvent.stage >= stageIndex : false;
              const current = activeEvent ? activeEvent.stage === stageIndex : false;

              return (
                <article
                  key={stage.title}
                  className={cn(
                    "rounded-lg border p-2 text-xs",
                    reached ? "border-cyan-300 bg-cyan-50" : "border-slate-200 bg-white",
                    current && "ring-2 ring-cyan-300",
                  )}
                >
                  <div className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                    <Icon className="h-3.5 w-3.5" />
                    {stage.title}
                  </div>
                  <p className="mt-1 text-slate-600">{stage.description}</p>
                </article>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800">Recent Flow Events</h3>
          <div className="space-y-2">
            {events.length ? (
              events.slice(0, 8).map((event) => (
                <div
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={event.source === "NWS" ? "moderate" : "low"}>{event.source}</Badge>
                    <Badge variant="neutral">{event.trigger}</Badge>
                    <span className="text-slate-700">{STAGES[event.stage].title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Badge variant={event.status === "complete" ? "low" : "moderate"}>{event.status}</Badge>
                    <span>
                      {formatDistanceToNow(new Date(event.startedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">No flow events yet. Trigger one to watch the architecture path.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
