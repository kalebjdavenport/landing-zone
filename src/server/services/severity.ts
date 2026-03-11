import type { Severity } from "@/server/types";

const severeKeywords = [
  "tornado",
  "hurricane",
  "flash flood",
  "blizzard",
  "thunderstorm warning",
  "icing",
  "convective",
  "volcanic ash",
];

const moderateKeywords = [
  "wind advisory",
  "small craft",
  "winter weather",
  "flood advisory",
  "ifr",
  "mvfr",
  "airmet",
];

export function severityFromText(input: string): Severity {
  const value = input.toLowerCase();

  if (severeKeywords.some((term) => value.includes(term))) {
    return "high";
  }

  if (moderateKeywords.some((term) => value.includes(term))) {
    return "moderate";
  }

  return "low";
}

export function maxSeverity(values: Severity[]): Severity {
  if (values.includes("extreme")) {
    return "extreme";
  }

  if (values.includes("high")) {
    return "high";
  }

  if (values.includes("moderate")) {
    return "moderate";
  }

  return "low";
}
