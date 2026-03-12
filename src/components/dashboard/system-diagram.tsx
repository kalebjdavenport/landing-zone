"use client";

import {
  Background,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
} from "@xyflow/react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ArchitectureNodeData = Record<string, unknown> & {
  title: string;
  subtitle: string;
  badge: string;
  tone: "teal" | "blue" | "amber" | "rose" | "slate";
};

type ArchitectureNode = Node<ArchitectureNodeData, "architecture">;

const toneClasses: Record<ArchitectureNodeData["tone"], string> = {
  teal: "border-teal-300 bg-teal-50 text-teal-900",
  blue: "border-cyan-300 bg-cyan-50 text-cyan-900",
  amber: "border-amber-300 bg-amber-50 text-amber-900",
  rose: "border-rose-300 bg-rose-50 text-rose-900",
  slate: "border-slate-300 bg-slate-100 text-slate-800",
};

const nodes: ArchitectureNode[] = [
  {
    id: "scheduler",
    type: "architecture",
    position: { x: 0, y: 20 },
    data: {
      title: "GitHub Actions",
      subtitle: "Cron every 10 min",
      badge: "Trigger",
      tone: "slate",
    },
  },
  {
    id: "nws",
    type: "architecture",
    position: { x: 400, y: -70 },
    data: {
      title: "NWS API",
      subtitle: "Alerts, forecasts, observations",
      badge: "External",
      tone: "teal",
    },
  },
  {
    id: "awc",
    type: "architecture",
    position: { x: 400, y: 130 },
    data: {
      title: "Aviation Weather Center",
      subtitle: "METAR, TAF, SIGMET",
      badge: "External",
      tone: "teal",
    },
  },
  {
    id: "ingest",
    type: "architecture",
    position: { x: 800, y: 20 },
    data: {
      title: "Ingest Pipeline",
      subtitle: "/api/ingest/nws + /api/ingest/aviation",
      badge: "Pipeline",
      tone: "blue",
    },
  },
  {
    id: "postgres",
    type: "architecture",
    position: { x: 1240, y: 20 },
    data: {
      title: "Supabase Postgres",
      subtitle: "nws_snapshots, overlays, event_log",
      badge: "Database",
      tone: "amber",
    },
  },
  {
    id: "realtime",
    type: "architecture",
    position: { x: 1680, y: 20 },
    data: {
      title: "Supabase Realtime",
      subtitle: "event_log postgres_changes",
      badge: "WebSocket",
      tone: "rose",
    },
  },
  {
    id: "react",
    type: "architecture",
    position: { x: 1680, y: 320 },
    data: {
      title: "React Dashboard",
      subtitle: "National, route board, location, map, delta feed",
      badge: "UI",
      tone: "blue",
    },
  },
  {
    id: "trpc",
    type: "architecture",
    position: { x: 1240, y: 320 },
    data: {
      title: "tRPC API",
      subtitle: "ops router (queries + ingest mutation)",
      badge: "API Layer",
      tone: "slate",
    },
  },
  {
    id: "zustand",
    type: "architecture",
    position: { x: 1680, y: 540 },
    data: {
      title: "Zustand Store",
      subtitle: "Location, route, overlay, view state",
      badge: "Client State",
      tone: "slate",
    },
  },
  {
    id: "airports",
    type: "architecture",
    position: { x: 1240, y: 540 },
    data: {
      title: "Airport Database",
      subtitle: "305 US airports, client-side search",
      badge: "Static Data",
      tone: "slate",
    },
  },
];

const edges: Edge[] = [
  // Ingest path (teal, animated)
  {
    id: "e-scheduler-ingest",
    source: "scheduler",
    sourceHandle: "source-right",
    target: "ingest",
    targetHandle: "target-left",
    label: "POST every 10 min",
    animated: true,
    style: { stroke: "#0891b2", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#0891b2" },
    type: "smoothstep",
  },
  {
    id: "e-nws-ingest",
    source: "nws",
    sourceHandle: "source-right",
    target: "ingest",
    targetHandle: "target-top",
    label: "alerts, forecasts, obs",
    animated: true,
    style: { stroke: "#0891b2", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#0891b2" },
    type: "smoothstep",
  },
  {
    id: "e-awc-ingest",
    source: "awc",
    sourceHandle: "source-right",
    target: "ingest",
    targetHandle: "target-bottom",
    label: "METAR, TAF, SIGMET",
    animated: true,
    style: { stroke: "#0891b2", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#0891b2" },
    type: "smoothstep",
  },
  {
    id: "e-ingest-postgres",
    source: "ingest",
    sourceHandle: "source-right",
    target: "postgres",
    targetHandle: "target-left",
    label: "upsert + event_log",
    animated: true,
    style: { stroke: "#0891b2", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#0891b2" },
    type: "smoothstep",
  },
  {
    id: "e-postgres-realtime",
    source: "postgres",
    sourceHandle: "source-right",
    target: "realtime",
    targetHandle: "target-left",
    label: "postgres_changes",
    animated: true,
    style: { stroke: "#0891b2", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#0891b2" },
    type: "smoothstep",
  },
  {
    id: "e-realtime-react",
    source: "realtime",
    sourceHandle: "source-bottom",
    target: "react",
    targetHandle: "target-top",
    label: "WebSocket push",
    animated: true,
    style: { stroke: "#0891b2", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#0891b2" },
    type: "smoothstep",
  },
  // Query path (amber)
  {
    id: "e-react-trpc",
    source: "react",
    sourceHandle: "source-left",
    target: "trpc",
    targetHandle: "target-right",
    label: "tRPC queries + mutations",
    style: { stroke: "#d97706", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#d97706" },
    type: "smoothstep",
  },
  {
    id: "e-trpc-postgres",
    source: "trpc",
    sourceHandle: "source-top",
    target: "postgres",
    targetHandle: "target-bottom",
    label: "read via repos",
    style: { stroke: "#d97706", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#d97706" },
    type: "smoothstep",
  },
  // Client-side path (slate)
  {
    id: "e-airports-zustand",
    source: "airports",
    sourceHandle: "source-right",
    target: "zustand",
    targetHandle: "target-left",
    label: "search → setLocation",
    style: { stroke: "#64748b", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
    type: "smoothstep",
  },
  {
    id: "e-zustand-react",
    source: "zustand",
    sourceHandle: "source-top",
    target: "react",
    targetHandle: "target-bottom",
    label: "state + URL sync",
    style: { stroke: "#64748b", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
    type: "smoothstep",
  },
];

const nodeTypes = {
  architecture: ArchitectureNodeCard,
};

export function SystemDiagram() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>High-Level System Diagram</CardTitle>
        <CardDescription>
          Blue: ingest + realtime push. Amber: query path. Gray: client-side state.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[400px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white md:h-[500px]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.04, minZoom: 0.5, maxZoom: 1.1 }}
            minZoom={0.35}
            maxZoom={1.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnScroll
            panOnDrag
            zoomOnPinch
            zoomOnScroll
            proOptions={{ hideAttribution: true }}
          >
            <Controls showInteractive={false} />
            <Background color="#cbd5e1" gap={20} />
          </ReactFlow>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="moderate" className="font-medium">
            Blue: ingest + realtime push
          </Badge>
          <Badge variant="neutral" className="font-medium">
            Amber: query path
          </Badge>
          <Badge variant="neutral" className="font-medium">
            Gray: client-side state
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function ArchitectureNodeCard({ data }: NodeProps<ArchitectureNode>) {
  return (
    <article className="relative w-[220px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <Handle type="target" position={Position.Left} id="target-left" className="!h-2 !w-2 !bg-slate-400" />
      <Handle type="source" position={Position.Left} id="source-left" className="!h-2 !w-2 !bg-slate-400" />
      <Handle type="target" position={Position.Right} id="target-right" className="!h-2 !w-2 !bg-slate-400" />
      <Handle type="source" position={Position.Right} id="source-right" className="!h-2 !w-2 !bg-slate-400" />
      <Handle type="target" position={Position.Top} id="target-top" className="!h-2 !w-2 !bg-slate-400" />
      <Handle type="source" position={Position.Top} id="source-top" className="!h-2 !w-2 !bg-slate-400" />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className="!h-2 !w-2 !bg-slate-400" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className="!h-2 !w-2 !bg-slate-400" />

      <h4 className="text-sm font-semibold text-slate-900">{data.title}</h4>
      <p className="mt-1 text-xs text-slate-600">{data.subtitle}</p>
      <span
        className={cn(
          "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
          toneClasses[data.tone],
        )}
      >
        {data.badge}
      </span>
    </article>
  );
}
