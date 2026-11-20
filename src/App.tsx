/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { ActivitiesAndIndoorSection } from "./components/ActivitiesAndIndoorSection";
import { AiAssistantPanel } from "./components/AiAssistantPanel";
import { CitySelectorBar } from "./components/CitySelectorBar";
import { LowEmissionAndImpactSection } from "./components/LowEmissionAndImpactSection";
import { OverviewSection } from "./components/OverviewSection";
import type { AirQualityPayload, CityOption, SensitivityGroup } from "./types/airQuality";
import { PRESET_CITIES } from "./utils/airQualityHelpers";

type ActiveTab = "overview" | "activities" | "impact" | "assistant";

const NAV_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: "overview", label: "Live Telemetry" },
  { id: "activities", label: "Activities & Indoor" },
  { id: "impact", label: "Low-Emission & Impact" },
  { id: "assistant", label: "AI Assistant" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [selectedCity, setSelectedCity] = useState<CityOption>(PRESET_CITIES[0]);
  const [sensitivity, setSensitivity] = useState<SensitivityGroup>("General Public");
  const [aqData, setAqData] = useState<AirQualityPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [queuedAiPrompt, setQueuedAiPrompt] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  const fetchAirQuality = useCallback(async (city: CityOption) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        lat: String(city.latitude),
        lon: String(city.longitude),
        timezone: city.timezone || "auto",
      });
      const resp = await fetch(`/api/air-quality?${params.toString()}`);
      const rawText = await resp.text();
      let payload: (AirQualityPayload & { error?: string }) | null = null;
      try {
        payload = JSON.parse(rawText) as AirQualityPayload & { error?: string };
      } catch {
        payload = null;
      }

      if (!resp.ok || !payload) {
        setError(payload?.error || `Telemetry service returned HTTP ${resp.status}.`);
        setAqData(null);
      } else {
        setAqData(payload);
      }
    } catch {
      setError("Unable to connect to the live air quality telemetry server.");
      setAqData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAirQuality(selectedCity);
  }, [selectedCity, fetchAirQuality]);

  const handleAskAi = (promptText?: string) => {
    if (promptText) {
      setQueuedAiPrompt(promptText);
    }
    setActiveTab("assistant");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* Strict 3-Zone Top Bar */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className="font-display whitespace-nowrap shrink-0 text-lg font-bold tracking-tight text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-600 dark:text-slate-50"
          >
            AeroPulse
          </button>

          {/* Zone 2: 4 concise single-line navigation links */}
          <nav aria-label="Primary Navigation" className="hidden items-center gap-7 md:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`whitespace-nowrap shrink-0 border-b-2 py-5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 ${
                    isActive
                      ? "border-sky-600 text-slate-900 dark:border-sky-400 dark:text-slate-50"
                      : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab("overview");
                window.setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className="whitespace-nowrap shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700"
            >
              Check City
            </button>
          </div>
        </div>

        {/* Mobile navigation row */}
        <nav
          aria-label="Mobile Navigation"
          className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden dark:border-slate-800"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-sky-600"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Workspace Location & Profile Controls */}
      <CitySelectorBar
        selectedCity={selectedCity}
        onSelectCity={(city) => {
          setSelectedCity(city);
        }}
        sensitivity={sensitivity}
        onChangeSensitivity={setSensitivity}
        onRefresh={() => void fetchAirQuality(selectedCity)}
        loading={loading}
        searchInputRef={searchInputRef}
      />

      {/* Main Content Viewport */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {activeTab === "overview" && (
          <OverviewSection
            city={selectedCity}
            data={aqData}
            loading={loading}
            error={error}
            sensitivity={sensitivity}
            onRetry={() => void fetchAirQuality(selectedCity)}
            onAskAiAboutCity={() =>
              handleAskAi(
                `Analyze ${selectedCity.name}'s current live air quality (${aqData?.current.usAqi ?? "unavailable"} US AQI, PM2.5 ${aqData?.current.pm25 ?? "unavailable"} µg/m³) for a ${sensitivity} user. Highlight key risks and practical actions for today.`
              )
            }
          />
        )}

        {activeTab === "activities" && (
          <ActivitiesAndIndoorSection
            city={selectedCity}
            data={aqData}
            sensitivity={sensitivity}
            onAskAi={(prompt) => handleAskAi(prompt)}
          />
        )}

        {activeTab === "impact" && (
          <LowEmissionAndImpactSection
            city={selectedCity}
            data={aqData}
            sensitivity={sensitivity}
          />
        )}

        {activeTab === "assistant" && (
          <AiAssistantPanel
            city={selectedCity}
            data={aqData}
            sensitivity={sensitivity}
            queuedPrompt={queuedAiPrompt}
            onConsumeQueuedPrompt={() => setQueuedAiPrompt(null)}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              AeroPulse Urban Air Quality Assistant
            </span>
            <span aria-hidden="true">·</span>
            <span>Live atmospheric data via Open-Meteo &amp; Copernicus CAMS</span>
            <span aria-hidden="true">·</span>
            <span>WHO 2021 Air Quality Guidelines</span>
          </div>

          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            className="inline-flex whitespace-nowrap shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
