"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}

export function Switch({ checked, onCheckedChange, label }: SwitchProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onCheckedChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onCheckedChange(!checked);
          }
        }}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full border transition",
          checked ? "border-cyan-600 bg-cyan-500" : "border-slate-300 bg-slate-200",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}
