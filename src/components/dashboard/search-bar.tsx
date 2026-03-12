"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Loader2, Plane, Search } from "lucide-react";

import { type Airport, formatAirportLabel } from "@/data/us-airports";
import { searchAirports } from "@/data/search-airports";
import { useDashboardStore } from "@/store/dashboard-store";
import { trpc } from "@/lib/trpc/client";

export const SearchBar = forwardRef<HTMLInputElement>(function SearchBar(_props, ref) {
  const setLocation = useDashboardStore((s) => s.setLocation);
  const locationLabel = useDashboardStore((s) => s.locationLabel);
  const selectedLocation = useDashboardStore((s) => s.selectedLocation);

  const [searchInput, setSearchInput] = useState(locationLabel ?? "");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => inputRef.current!, []);
  const listRef = useRef<HTMLUListElement>(null);

  // Prefetch weather for the highlighted result so it's ready when they select
  const results = useMemo(() => searchAirports(searchInput), [searchInput]);
  const activeAirport = results[activeIndex] ?? null;

  trpc.ops.getLocationWeather.useQuery(
    { lat: activeAirport?.lat ?? 0, lon: activeAirport?.lon ?? 0 },
    { enabled: activeAirport !== null && searchOpen },
  );

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results.length, searchInput]);

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

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleSelect = useCallback(
    (airport: Airport) => {
      const label = formatAirportLabel(airport);
      setLocation(airport.lat, airport.lon, label);
      setSearchInput(label);
      setSearchOpen(false);
      inputRef.current?.blur();
    },
    [setLocation],
  );

  // Check if weather is currently loading for the selected location
  const weatherQuery = trpc.ops.getLocationWeather.useQuery(
    selectedLocation!,
    { enabled: selectedLocation !== null },
  );
  const isLoadingWeather = selectedLocation !== null && weatherQuery.isLoading;

  return (
    <div ref={searchRef} className="relative flex flex-1 max-w-2xl">
      <label htmlFor="search" className="flex items-center whitespace-nowrap rounded-l-md bg-slate-600/80 px-3 text-xs font-medium text-slate-300 select-none">
        <Plane aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
        <span className="hidden sm:inline">US Airport</span>
        <span className="sr-only sm:hidden">Search US airports</span>
      </label>
      <input
        ref={inputRef}
        id="search"
        type="text"
        value={searchInput}
        onChange={(e) => {
          setSearchInput(e.target.value);
          setSearchOpen(true);
        }}
        onFocus={(e) => {
          e.target.select();
          setSearchOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (results.length > 0) handleSelect(results[activeIndex]);
          } else if (e.key === "Escape") {
            setSearchOpen(false);
            inputRef.current?.blur();
          }
        }}
        placeholder="KATL, JFK, Atlanta …"
        aria-label="Search US airports by code, name, or city"
        className="h-10 w-full border-0 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-600"
        role="combobox"
        aria-expanded={searchOpen && results.length > 0}
        aria-activedescendant={activeAirport ? `airport-${activeAirport.icao}` : undefined}
        aria-autocomplete="list"
        aria-controls="airport-listbox"
      />
      <button
        type="button"
        aria-label="Search"
        onClick={() => {
          if (results.length > 0) handleSelect(results[activeIndex]);
        }}
        className="flex cursor-pointer items-center rounded-r-md bg-cyan-600 px-4 text-sm font-medium text-white transition-colors hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2"
      >
        {isLoadingWeather ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Search aria-hidden="true" className="h-4 w-4" />
        )}
      </button>

      {/* Dropdown results */}
      {searchOpen && results.length > 0 && (
        <ul
          ref={listRef}
          id="airport-listbox"
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.map((airport, i) => (
            <li
              key={airport.icao}
              id={`airport-${airport.icao}`}
              role="option"
              aria-selected={i === activeIndex}
            >
              <button
                type="button"
                tabIndex={-1}
                className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400 ${
                  i === activeIndex
                    ? "bg-cyan-50 text-cyan-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => handleSelect(airport)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className={`shrink-0 font-mono text-xs font-bold ${
                  i === activeIndex ? "text-cyan-700" : "text-slate-500"
                }`}>
                  {airport.icao}
                </span>
                <span className="truncate">
                  {airport.name}
                </span>
                <span className="ml-auto shrink-0 text-xs text-slate-400">
                  {airport.city}, {airport.state}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
