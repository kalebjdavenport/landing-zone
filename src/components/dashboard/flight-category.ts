import type { FlightCategory } from "@/server/types";

/**
 * Standard aviation color coding for flight categories.
 * Green = VFR, Blue = MVFR, Red = IFR, Magenta = LIFR.
 */
export function flightCategoryStyle(category: FlightCategory): {
  bg: string;
  text: string;
  border: string;
} {
  switch (category) {
    case "VFR":
      return { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" };
    case "MVFR":
      return { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" };
    case "IFR":
      return { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" };
    case "LIFR":
      return { bg: "bg-fuchsia-100", text: "text-fuchsia-800", border: "border-fuchsia-300" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300" };
  }
}
