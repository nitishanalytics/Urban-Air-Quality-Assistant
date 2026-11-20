import React, { useEffect, useRef, useState } from "react";
import { Compass, Loader2, RefreshCw, Search, ShieldAlert } from "lucide-react";
import type { CityOption, SensitivityGroup } from "../types/airQuality";
import { PRESET_CITIES } from "../utils/airQualityHelpers";

interface CitySelectorBarProps {
  selectedCity: CityOption;
  onSelectCity: (city: CityOption) => void;
  sensitivity: SensitivityGroup;
  onChangeSensitivity: (group: SensitivityGroup) => void;
  onRefresh: () => void;
  loading: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

const SENSITIVITY_OPTIONS: SensitivityGroup[] = [
  "General Public",
  "Sensitive / Asthma",
  "Outdoor Athlete",
  "Children & Seniors",
];

export const CitySelectorBar: React.FC<CitySelectorBarProps> = ({
  selectedCity,
  onSelectCity,
  sensitivity,
  onChangeSensitivity,
  onRefresh,
  loading,
  searchInputRef,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const resp = await fetch(`/api/cities/search?q=${encodeURIComponent(trimmed)}`);
        const rawText = await resp.text();
        let data: { results?: CityOption[]; error?: string } | null = null;
        try {
          data = JSON.parse(rawText) as { results?: CityOption[]; error?: string };
        } catch {
          data = null;
        }
        if (!resp.ok || !data) {
          setSearchError(data?.error || "Unable to search cities right now.");
          setResults([]);
        } else {
          setResults(data.results || []);
          setDropdownOpen(true);
        }
      } catch {
        setSearchError("Network error while searching cities.");
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  const handleUseLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const resp = await fetch(`/api/cities/reverse?lat=${latitude}&lon=${longitude}`);
          const data = (await resp.json()) as { city?: CityOption };
          if (data.city) {
            onSelectCity(data.city);
            setQuery("");
            setDropdownOpen(false);
          }
        } catch {
          setGeoError("Detected coordinates, but failed to resolve city name.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === 1
            ? "Location permission was denied. Please search for your city manually."
            : "Could not acquire GPS coordinates."
        );
      },
      { timeout: 10000 }
    );
  };

  return (
    <section
      aria-label="Location and Profile Controls"
      className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* City Search + Presets */}
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div ref={containerRef} className="relative w-full sm:max-w-sm">
              <label htmlFor="city-search-input" className="sr-only">
                Search for a city
              </label>
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
                <input
                  id="city-search-input"
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onFocus={() => {
                    if (results.length > 0 || query.trim().length >= 2) setDropdownOpen(true);
                  }}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search any city (e.g. Delhi, Zurich, Seoul)..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-900"
                />
                {searching && (
                  <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>

              {dropdownOpen && (query.trim().length >= 2 || searchError) && (
                <div className="absolute left-0 right-0 top-11 z-30 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {searchError ? (
                    <div className="px-3.5 py-3 text-xs text-rose-600 dark:text-rose-400">
                      {searchError}
                    </div>
                  ) : results.length === 0 && !searching ? (
                    <div className="px-3.5 py-3 text-xs text-slate-500 dark:text-slate-400">
                      No matching cities found for &ldquo;{query.trim()}&rdquo;.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {results.map((city) => (
                        <li key={city.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCity(city);
                              setQuery("");
                              setDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <div>
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {city.name}
                              </span>
                              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                                {[city.admin1, city.country].filter(Boolean).join(", ")}
                              </span>
                            </div>
                            <span className="font-mono text-[11px] tabular-nums text-slate-400">
                              {city.latitude.toFixed(2)}, {city.longitude.toFixed(2)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={locating}
                className="inline-flex h-10 whitespace-nowrap shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {locating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Compass className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                )}
                <span>Use My Location</span>
              </button>

              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                aria-label="Refresh live air quality telemetry"
                className="inline-flex h-10 whitespace-nowrap shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-sky-600" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Sensitivity Selector */}
          <div className="flex items-center gap-2.5">
            <label
              htmlFor="sensitivity-select"
              className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Sensitivity Profile</span>
            </label>
            <select
              id="sensitivity-select"
              value={sensitivity}
              onChange={(e) => onChangeSensitivity(e.target.value as SensitivityGroup)}
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 transition-colors focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {SENSITIVITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Global Monitoring Cities */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-slate-400 dark:text-slate-500">Quick cities:</span>
          {PRESET_CITIES.map((city) => {
            const isSelected =
              city.name === selectedCity.name &&
              Math.abs(city.latitude - selectedCity.latitude) < 0.05;
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => onSelectCity(city)}
                className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-sky-600 dark:text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {city.name}
              </button>
            );
          })}
        </div>

        {geoError && (
          <p className="mt-2 text-xs text-rose-600 dark:text-rose-400" role="alert">
            {geoError}
          </p>
        )}
      </div>
    </section>
  );
};
