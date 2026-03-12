import { Clock3, Eye, Gauge, MapPin, Thermometer, Wind } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { flightCategoryStyle } from "@/components/dashboard/flight-category";
import { severityBadgeVariant } from "@/components/dashboard/severity";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { LocationWeather } from "@/server/types";

interface LocationWeatherCardProps {
  weather: LocationWeather | null;
  /** Display label from the search bar (e.g. "KJFK — John F Kennedy …"). Falls back to NWS city. */
  label?: string | null;
}

/** Shorten NWS period names: "Thursday Night" → "Thu Night", "This Afternoon" → "This Aft" */
function shortenPeriodName(name: string): string {
  return name
    .replace("Monday", "Mon")
    .replace("Tuesday", "Tue")
    .replace("Wednesday", "Wed")
    .replace("Thursday", "Thu")
    .replace("Friday", "Fri")
    .replace("Saturday", "Sat")
    .replace("Sunday", "Sun")
    .replace("Afternoon", "Aft");
}

/** Cap forecast text at ~40 chars to prevent wrapping */
function truncateForecast(text: string): string {
  if (text.length <= 40) return text;
  // Cut at word boundary
  const cut = text.lastIndexOf(" ", 38);
  return `${text.slice(0, cut > 0 ? cut : 38)}…`;
}

function formatTemp(f: number | null): string {
  if (f === null) return "--";
  return `${Math.round(f)}°F`;
}

function formatWind(weather: LocationWeather): string {
  const { windDirection, windSpeedKt, windGustKt, windSpeed } = weather.current;
  // Prefer structured kt values; fall back to prose string from NWS
  if (windSpeedKt !== null) {
    const dir = windDirection ? `${windDirection} ` : "";
    const gust = windGustKt ? ` G${windGustKt}` : "";
    return `${dir}${windSpeedKt}${gust} kt`;
  }
  const dir = windDirection ? `${windDirection} ` : "";
  return `${dir}${windSpeed}`;
}

export function LocationWeatherCard({ weather, label }: LocationWeatherCardProps) {
  if (!weather) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Location Weather</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Use the search bar above to look up a US airport by code, name, or city.</p>
        </CardContent>
      </Card>
    );
  }

  const catStyle = flightCategoryStyle(weather.current.flightCategory);
  const tempSpread =
    weather.current.temperatureF !== null && weather.current.dewpointF !== null
      ? Math.round(weather.current.temperatureF - weather.current.dewpointF)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {label || `${weather.point.city}, ${weather.point.state}`}
          </span>
          <span
            className={`rounded-md border px-3 py-1 text-sm font-bold ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
          >
            {weather.current.flightCategory}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary operational fields */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-md border border-slate-200 p-2">
            <div className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Eye className="h-3 w-3" />
              Visibility
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {weather.current.visibilityMi !== null
                ? `${weather.current.visibilityMi} mi`
                : "--"}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <div className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Gauge className="h-3 w-3" />
              Ceiling
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {weather.current.ceilingFt !== null
                ? `${weather.current.ceilingFt.toLocaleString()} ft`
                : "CLR"}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <div className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Wind className="h-3 w-3" />
              Wind
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {formatWind(weather)}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <div className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Thermometer className="h-3 w-3" />
              Temp / Dewpoint
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {formatTemp(weather.current.temperatureF)} / {formatTemp(weather.current.dewpointF)}
              {tempSpread !== null && (
                <span className={`ml-1.5 text-xs font-normal ${tempSpread <= 3 ? "text-amber-600" : "text-slate-400"}`}>
                  (spread {tempSpread}°)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Altimeter */}
        {weather.current.altimeterInHg !== null && (
          <div className="text-xs text-slate-500">
            Altimeter: {weather.current.altimeterInHg.toFixed(2)} inHg
          </div>
        )}

        <Separator />

        {/* Alerts with expiration */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-900">Active local alerts</h4>
          <div className="flex flex-wrap gap-2">
            {weather.alerts.length ? (
              weather.alerts.map((alert) => (
                <Badge key={alert.id} variant={severityBadgeVariant(alert.severity)}>
                  {alert.event}
                  {alert.expires && (
                    <span className="ml-1 opacity-75">
                      — expires {formatDistanceToNow(new Date(alert.expires), { addSuffix: true })}
                    </span>
                  )}
                </Badge>
              ))
            ) : (
              <Badge variant="neutral">No active alerts</Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Forecast — compact table */}
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Forecast</h4>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="pb-1.5 pr-3 font-medium">Period</th>
                  <th className="pb-1.5 pr-3 font-medium">Conditions</th>
                  <th className="pb-1.5 pr-3 font-medium">Temp</th>
                  <th className="pb-1.5 font-medium">Wind</th>
                </tr>
              </thead>
              <tbody>
                {weather.forecast.slice(0, 4).map((period) => (
                  <tr key={period.startTime} className="border-b border-slate-100 last:border-0">
                    <td className="py-1.5 pr-3 font-medium text-slate-700">{shortenPeriodName(period.name)}</td>
                    <td className="py-1.5 pr-3 text-slate-600">{truncateForecast(period.shortForecast)}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap text-slate-700">{period.temperature}°{period.temperatureUnit}</td>
                    <td className="py-1.5 whitespace-nowrap text-slate-600">{period.windSpeed} {period.windDirection}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock3 className="h-3.5 w-3.5" />
          Last obs {formatDistanceToNow(new Date(weather.lastSuccessAt), { addSuffix: true })}
          {weather.stale ? " (stale)" : ""}
        </div>
      </CardContent>
    </Card>
  );
}
