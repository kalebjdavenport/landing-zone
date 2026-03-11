import type { Severity } from "@/server/types";

export function severityBadgeVariant(severity: Severity) {
  return severity;
}

export function severityLabel(severity: Severity) {
  if (severity === "extreme") {
    return "Extreme";
  }

  if (severity === "high") {
    return "High";
  }

  if (severity === "moderate") {
    return "Moderate";
  }

  return "Low";
}
