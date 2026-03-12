"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";

import { useDashboardStore } from "@/store/dashboard-store";
import { trpc } from "@/lib/trpc/client";

export function SearchBar() {
  const setLocation = useDashboardStore((s) => s.setLocation);
  const locationLabel = useDashboardStore((s) => s.locationLabel);

  const [searchInput, setSearchInput] = useState(locationLabel ?? "");
  const [searchTerm, setSearchTerm] = useState(locationLabel ?? "");
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

  const locationSearch = trpc.ops.searchLocation.useQuery(
    { query: searchTerm },
    { enabled: searchTerm.length > 2 },
  );

  function handleSubmit() {
    setSearchTerm(searchInput.trim());
    setSearchOpen(true);
  }

  return (
    <div ref={searchRef} className="relative flex flex-1 max-w-2xl">
      <div className="flex items-center whitespace-nowrap rounded-l-md bg-slate-600/80 px-3 text-xs font-medium text-slate-300 select-none">
        <MapPin className="mr-1.5 h-3.5 w-3.5" />
        <span className="hidden sm:inline">US Location</span>
      </div>
      <input
        id="search"
        type="text"
        value={searchInput}
        onChange={(e) => {
          setSearchInput(e.target.value);
          setSearchOpen(true);
        }}
        onFocus={() => setSearchOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
        placeholder="City, state or lat,lon …"
        className="h-10 w-full border-0 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
      <button
        type="button"
        onClick={handleSubmit}
        className="flex cursor-pointer items-center rounded-r-md bg-cyan-600 px-4 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* Dropdown results */}
      {searchOpen && locationSearch.data && locationSearch.data.length > 0 && (
        <ul className="absolute left-0 top-full mt-1 w-full rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {locationSearch.data.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
                onClick={() => {
                  setLocation(result.lat, result.lon, result.displayName);
                  setSearchInput(result.displayName);
                  setSearchOpen(false);
                }}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {result.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
