import React, { useMemo, useState } from "react";
import { CheckSquare, Fan, Home, Square, SunMedium } from "lucide-react";
import type { AirQualityPayload, CityOption, SensitivityGroup } from "../types/airQuality";
import {
  deriveActivityMatrix,
  deriveVentilationDecision,
  findBest24hWindow,
} from "../utils/airQualityHelpers";

interface ActivitiesAndIndoorSectionProps {
  city: CityOption;
  data: AirQualityPayload | null;
  sensitivity: SensitivityGroup;
  onAskAi: (promptText: string) => void;
}

const INDOOR_CHECKLIST_ITEMS = [
  {
    id: "range-hood",
    category: "Cooking Emissions",
    title: "Run range hood exhaust during & 15 min after cooking",
    detail: "Gas burners and high-heat frying generate sharp indoor NO₂ and ultrafine PM2.5 spikes.",
  },
  {
    id: "hepa-placement",
    category: "Particulate Filtration",
    title: "Position HEPA purifier 1m from walls in main living/sleeping zone",
    detail: "Avoid corners or drapes that block intake airflow; run continuously on low/medium rather than burst high.",
  },
  {
    id: "wet-dusting",
    category: "Dust Control",
    title: "Damp-wipe hard surfaces & use HEPA-sealed vacuuming weekly",
    detail: "Dry feather dusting resuspends settled PM10, pollen, and heavy-metal dust back into breathing zones.",
  },
  {
    id: "zero-combustion",
    category: "Source Reduction",
    title: "Eliminate indoor incense, paraffin candles, and aerosol sprays",
    detail: "Swap combustion fragrances for essential-oil waterless diffusers or beeswax only when windows can stay open.",
  },
  {
    id: "humidity-band",
    category: "Mold & Allergen Control",
    title: "Maintain indoor relative humidity between 40% and 55%",
    detail: "Prevents dust-mite proliferation and mold spores while keeping nasal airways hydrated.",
  },
  {
    id: "entry-zone",
    category: "Track-In Prevention",
    title: "Enforce shoe-free entry mat & wipe pet coats after high-AQI walks",
    detail: "Road dust, PAHs, and heavy particulates adhere to shoe soles and fur.",
  },
];

export const ActivitiesAndIndoorSection: React.FC<ActivitiesAndIndoorSectionProps> = ({
  city,
  data,
  sensitivity,
  onAskAi,
}) => {
  const [roomAreaSqm, setRoomAreaSqm] = useState(28);
  const [ceilingHeightM, setCeilingHeightM] = useState(2.7);
  const [checkedIndoor, setCheckedIndoor] = useState<Record<string, boolean>>({
    "range-hood": true,
    "hepa-placement": false,
    "wet-dusting": true,
    "zero-combustion": false,
    "humidity-band": false,
    "entry-zone": true,
  });

  const activities = useMemo(() => deriveActivityMatrix(data, sensitivity), [data, sensitivity]);
  const ventilation = useMemo(() => deriveVentilationDecision(data), [data]);
  const bestWindow = useMemo(
    () => (data ? findBest24hWindow(data.hourly, data.current.observedAt) : null),
    [data]
  );

  // Required CADR calculation for 4.8 Air Changes per Hour (ACH) - AHAM / Harvard healthy indoor standard
  const targetAch = (data?.current.usAqi ?? 0) > 100 ? 5 : 4;
  const roomVolumeM3 = roomAreaSqm * ceilingHeightM;
  const requiredCadrM3h = Math.round(roomVolumeM3 * targetAch);
  const requiredCadrCfm = Math.round(requiredCadrM3h * 0.5886);

  const toggleChecklist = (id: string) => {
    setCheckedIndoor((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = Object.values(checkedIndoor).filter(Boolean).length;

  return (
    <div className="space-y-8">
      {/* Smart Activity Recommendations */}
      <section aria-label="Smart Activity Recommendations" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-sky-700 dark:text-sky-400">
              <SunMedium className="h-4 w-4" />
              <span>Smart Activity Planner · {city.name}</span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
              Outdoor &amp; Exercise Guidance
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tailored for <span className="font-medium text-slate-800 dark:text-slate-200">{sensitivity}</span>{" "}
              using live US AQI ({data?.current.usAqi ?? "Unavailable"}) and 24-hour dispersion forecasts.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onAskAi(
                `Based on ${city.name}'s current air quality (${data?.current.usAqi ?? "unavailable"} US AQI, PM2.5 ${data?.current.pm25 ?? "unavailable"} µg/m³), what specific outdoor workouts or protective precautions do you recommend for my profile (${sensitivity}) today?`
              )
            }
            className="whitespace-nowrap shrink-0 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Ask AI for Custom Workout Plan
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {activities.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.intensity}</p>
                    <h3 className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-100">
                      {item.activity}
                    </h3>
                  </div>
                  <span className={`whitespace-nowrap text-xs font-semibold ${item.statusTone}`}>
                    {item.glyph} {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {item.guidance}
                </p>
              </div>
            </div>
          ))}
        </div>

        {bestWindow && (
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Optimal Outdoor Window:
              </span>{" "}
              Schedule strenuous outdoor activity between{" "}
              <span className="font-mono font-semibold text-sky-700 dark:text-sky-400">
                {bestWindow.startTime} and {bestWindow.endTime}
              </span>{" "}
              (forecast average {bestWindow.avgAqi} US AQI).
            </div>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              Peak in window: {bestWindow.maxAqi} AQI
            </span>
          </div>
        )}
      </section>

      {/* Indoor Air Quality Assistant */}
      <section aria-label="Indoor Air Quality Assistant" className="space-y-4 border-t border-slate-200 pt-8 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-teal-700 dark:text-teal-400">
            <Home className="h-4 w-4" />
            <span>Indoor Air Quality Assistant</span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            Ventilation, Filtration &amp; Indoor Source Control
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Practical indoor air decisions synchronized with live outdoor PM2.5 and humidity in {city.name}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Live Ventilation Decision + HEPA CADR Calculator */}
          <div className="space-y-5 lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Live Window &amp; Ventilation Advisor
                </span>
                <span className={`text-xs font-semibold ${ventilation.toneClass}`}>
                  {ventilation.glyph} {ventilation.verdict}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {ventilation.explanation}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <div>
                  <span className="text-slate-400">Outdoor AQI</span>
                  <p className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {data?.current.usAqi ?? "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Outdoor PM2.5</span>
                  <p className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {data?.current.pm25 !== null && data?.current.pm25 !== undefined
                      ? `${data.current.pm25.toFixed(1)} µg/m³`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Outdoor RH</span>
                  <p className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {data?.weather?.humidityPct !== null && data?.weather?.humidityPct !== undefined
                      ? `${data.weather.humidityPct}%`
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Room HEPA CADR Calculator */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Fan className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  HEPA Purifier Sizing (CADR)
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Calculates minimum Clean Air Delivery Rate for {targetAch} air changes/hour
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-xs">
                    <label htmlFor="room-area" className="font-medium text-slate-700 dark:text-slate-300">
                      Room Floor Area
                    </label>
                    <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {roomAreaSqm} m² ({Math.round(roomAreaSqm * 10.764)} sq ft)
                    </span>
                  </div>
                  <input
                    id="room-area"
                    type="range"
                    min={10}
                    max={90}
                    step={2}
                    value={roomAreaSqm}
                    onChange={(e) => setRoomAreaSqm(Number(e.target.value))}
                    className="mt-1.5 w-full accent-sky-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <label htmlFor="ceiling-height" className="font-medium text-slate-700 dark:text-slate-300">
                      Ceiling Height
                    </label>
                    <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {ceilingHeightM.toFixed(1)} m
                    </span>
                  </div>
                  <input
                    id="ceiling-height"
                    type="range"
                    min={2.2}
                    max={4.0}
                    step={0.1}
                    value={ceilingHeightM}
                    onChange={(e) => setCeilingHeightM(Number(e.target.value))}
                    className="mt-1.5 w-full accent-sky-600"
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Minimum CADR (Metric)</span>
                  <p className="mt-0.5 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                    {requiredCadrM3h} <span className="text-xs font-normal text-slate-400">m³/h</span>
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Minimum CADR (US)</span>
                  <p className="mt-0.5 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                    {requiredCadrCfm} <span className="text-xs font-normal text-slate-400">CFM</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Practical Indoor Control Checklist */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Indoor Pollutant Reduction Checklist
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track daily dust, VOC, NO₂, and moisture controls inside your home
                </p>
              </div>
              <span className="font-mono text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                {completedCount} / {INDOOR_CHECKLIST_ITEMS.length} active
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {INDOOR_CHECKLIST_ITEMS.map((item) => {
                const checked = !!checkedIndoor[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleChecklist(item.id)}
                    className="flex w-full items-start gap-3.5 py-3.5 text-left transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    {checked ? (
                      <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" />
                    ) : (
                      <Square className="mt-0.5 h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>{item.category}</span>
                      </div>
                      <p
                        className={`mt-0.5 text-sm font-medium ${
                          checked
                            ? "text-slate-500 line-through dark:text-slate-400"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {item.detail}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
