"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plane, Search } from "lucide-react";

import { type Airport, US_AIRPORTS } from "@/data/us-airports";
import { useDashboardStore } from "@/store/dashboard-store";

const MAX_RESULTS = 8;

function searchAirports(query: string): Airport[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  // Exact ICAO or IATA match first
  const exactIcao = US_AIRPORTS.filter((a) => a.icao.toLowerCase() === q);
  if (exactIcao.length > 0) return exactIcao;
  const exactIata = US_AIRPORTS.filter((a) => a.iata.toLowerCase() === q);
  if (exactIata.length > 0) return exactIata;

  // Prefix match on codes (highest priority)
  const codePrefix = US_AIRPORTS.filter(
    (a) => a.icao.toLowerCase().startsWith(q) || a.iata.toLowerCase().startsWith(q),
  );

  // Contains match on name, city, state
  const textMatch = US_AIRPORTS.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.state.toLowerCase().includes(q),
  );

  // Deduplicate: code matches first, then text matches
  const seen = new Set<string>();
  const results: Airport[] = [];
  for (const a of [...codePrefix, ...textMatch]) {
    if (!seen.has(a.icao)) {
      seen.add(a.icao);
      results.push(a);
    }
    if (results.length >= MAX_RESULTS) break;
  }

  return results;
}

function formatAirportLabel(a: Airport): string {
  return `${a.icao} — ${a.name}, ${a.city}, ${a.state}`;
}

export function SearchBar() {
  const setLocation = useDashboardStore((s) => s.setLocation);
  const locationLabel = useDashboardStore((s) => s.locationLabel);

  const [searchInput, setSearchInput] = useState(locationLabel ?? "");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Sync input when location changes externally (e.g. URL hydration)
  useEffect(() => {
    if (locationLabel) {
      setSearchInput(locationLabel);
    }
  }, [locationLabel]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = useMemo(() => searchAirports(searchInput), [searchInput]);

  function handleSelect(airport: Airport) {
    const label = formatAirportLabel(airport);
    setLocation(airport.lat, airport.lon, label);
    setSearchInput(label);
    setSearchOpen(false);
  }

  return (
    <div ref={searchRef} className="relative flex flex-1 max-w-2xl">
      <div className="flex items-center whitespace-nowrap rounded-l-md bg-slate-600/80 px-3 text-xs font-medium text-slate-300 select-none">
        <Plane className="mr-1.5 h-3.5 w-3.5" />
        <span className="hidden sm:inline">US Airport</span>
      </div>
      <input
        id="search"
        type="text"
        value={searchInput}
        onChange={(e) => {
          setSearchInput(e.target.value);
          setSearchOpen(true);
        }}
        onFocus={() => {
          setSearchInput("");
          setSearchOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results.length > 0) {
            handleSelect(results[0]);
          }
          if (e.key === "Escape") {
            setSearchOpen(false);
          }
        }}
        placeholder="KATL, JFK, Atlanta …"
        className="h-10 w-full border-0 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => {
          if (results.length > 0) handleSelect(results[0]);
        }}
        className="flex cursor-pointer items-center rounded-r-md bg-cyan-600 px-4 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* Dropdown results */}
      {searchOpen && results.length > 0 && (
        <ul className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {results.map((airport) => (
            <li key={airport.icao}>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
                onClick={() => handleSelect(airport)}
              >
                <span className="shrink-0 font-mono text-xs font-bold text-cyan-700">
                  {airport.icao}
                </span>
                <span className="truncate">
                  {airport.name}, {airport.city}, {airport.state}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
