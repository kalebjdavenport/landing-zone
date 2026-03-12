import { CloudSun, MapPin, Thermometer, Wind } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {label || `${weather.point.city}, ${weather.point.state}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 p-2">
            <div className="text-xs text-slate-500">Temperature</div>
            <div className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
              <Thermometer className="h-3.5 w-3.5" />
              {weather.current.temperatureF ? `${Math.round(weather.current.temperatureF)} F` : "--"}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <div className="text-xs text-slate-500">Wind</div>
            <div className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
              <Wind className="h-3.5 w-3.5" />
              {weather.current.windSpeed}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-2">
            <div className="text-xs text-slate-500">Condition</div>
            <div className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
              <CloudSun className="h-3.5 w-3.5" />
              {weather.current.textDescription}
            </div>
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-900">Active local alerts</h4>
          <div className="flex flex-wrap gap-2">
            {weather.alerts.length ? (
              weather.alerts.map((alert) => (
                <Badge key={alert.id} variant={severityBadgeVariant(alert.severity)}>
                  {alert.event}
                </Badge>
              ))
            ) : (
              <Badge variant="neutral">No active alerts</Badge>
            )}
          </div>
        </div>
        <Separator />
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Forecast</h4>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            {weather.forecast.slice(0, 4).map((period) => (
              <div key={period.startTime} className="rounded-md border border-slate-200 p-2 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{period.name}</div>
                <div className="mt-0.5 font-medium text-slate-900">{period.shortForecast}</div>
                <div className="text-slate-600">
                  {period.temperature} {period.temperatureUnit} | {period.windSpeed} {period.windDirection}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Last success {formatDistanceToNow(new Date(weather.lastSuccessAt), { addSuffix: true })}
          {weather.stale ? " (stale)" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
