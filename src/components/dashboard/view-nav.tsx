"use client";

import { LayoutDashboard, Workflow } from "lucide-react";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export type DashboardView = "operations" | "architecture";

const VIEWS: Array<{
  value: DashboardView;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    value: "operations",
    label: "Weather",
    icon: LayoutDashboard,
  },
  {
    value: "architecture",
    label: "System",
    icon: Workflow,
  },
];

interface ViewNavProps {
  value: DashboardView;
  onChange: (next: DashboardView) => void;
}

export function ViewNav({ value, onChange }: ViewNavProps) {
  return (
    <div className="-mb-px flex gap-1" role="tablist" aria-label="Dashboard views">
      {VIEWS.map((item) => {
        const Icon = item.icon;
        const isActive = value === item.value;

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2",
              isActive
                ? "border-cyan-400 text-white"
                : "border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-200",
            )}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => {
              const currentIdx = VIEWS.findIndex((v) => v.value === value);
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const nextIdx = e.key === "ArrowRight"
                  ? (currentIdx + 1) % VIEWS.length
                  : (currentIdx - 1 + VIEWS.length) % VIEWS.length;
                onChange(VIEWS[nextIdx].value);
              }
            }}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
