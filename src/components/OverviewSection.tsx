import React from "react";
import { AlertTriangle, ArrowRight, Droplets, Thermometer, Wind } from "lucide-react";
import type { AirQualityPayload, CityOption, SensitivityGroup } from "../types/airQuality";
import {
  classifyUsAqi,
  deriveVentilationDecision,
  findBest24hWindow,
  formatDateTimeCompact,
  POLLUTANT_BENCHMARKS,
} from "../utils/airQualityHelpers";
import { HourlyTrendChart, PollutantGuidelineChart } from "./TelemetryCharts";

interface OverviewSectionProps {
  city: CityOption;
  data: AirQualityPayload | null;
  loading: boolean;
  error: string | null;
  sensitivity: SensitivityGroup;
  onRetry: () => void;
  onAskAiAboutCity: () => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  city,
  data,
  loading,
  error,
  sensitivity,
  onRetry,
  onAskAiAboutCity,
}) => {
  const current = data?.current ?? null;
  const weather = data?.weather ?? null;
  const aqiMeta = classifyUsAqi(current?.usAqi);
  const bestWindow = data ? findBest24hWindow(data.hourly, data.current.observedAt) : null;
  const vent = deriveVentilationDecision(data);

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center dark:border-rose-800/70 dark:bg-rose-950/30"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div>
              <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                Live Telemetry Request Failed
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="whitespace-nowrap shrink-0 rounded-lg bg-rose-700 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-rose-800"
          >
            Retry Telemetry
          </button>
        </div>
      )}

      {/* Primary Hero AQI & Atmospheric Context */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Primary AQI Telemetry */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {[city.name, city.admin1, city.country].filter(Boolean).join(", ")}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {city.latitude.toFixed(3)}°, {city.longitude.toFixed(3)}°
                </span>
                {current?.observedAt && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Observed {formatDateTimeCompact(current.observedAt)}
                    </span>
                  </>
                )}
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Profile: {sensitivity}
              </span>
            </div>

            {loading && !data ? (
              <div className="mt-8 space-y-4">
                <div className="h-14 w-44 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400">
                    Real-Time US EPA Air Quality Index
                  </p>
                  <div className="mt-2 flex items-baseline gap-4">
                    <span className="font-mono text-5xl font-bold tracking-tight tabular-nums text-slate-900 sm:text-6xl dark:text-slate-50">
                      {current?.usAqi !== null && current?.usAqi !== undefined
                        ? current.usAqi
                        : "N/A"}
                    </span>
                    <div className="space-y-0.5">
                      <div className={`text-base font-semibold ${aqiMeta.textClass}`}>
                        <span className="mr-1.5" aria-hidden="true">
                          {aqiMeta.glyph}
                        </span>
                        <span>{aqiMeta.label}</span>
                      </div>
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {aqiMeta.band}
                        {current?.europeanAqi !== null && current?.europeanAqi !== undefined
                          ? ` · EU AQI ${current.europeanAqi}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onAskAiAboutCity}
                  className="inline-flex whitespace-nowrap shrink-0 items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-sky-600"
                >
                  <span>Ask AI About {city.name}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {aqiMeta.summary}
            </p>
          </div>

          {/* Meteorological Context Strip */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Thermometer className="h-3.5 w-3.5" />
                <span>Temperature</span>
              </div>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {weather?.temperatureC !== null && weather?.temperatureC !== undefined
                  ? `${weather.temperatureC.toFixed(1)} °C`
                  : "Unavailable"}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Droplets className="h-3.5 w-3.5" />
                <span>Humidity</span>
              </div>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {weather?.humidityPct !== null && weather?.humidityPct !== undefined
                  ? `${weather.humidityPct} %`
                  : "Unavailable"}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Wind className="h-3.5 w-3.5" />
                <span>Wind Speed</span>
              </div>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {weather?.windSpeedKmh !== null && weather?.windSpeedKmh !== undefined
                  ? `${weather.windSpeedKmh.toFixed(1)} km/h`
                  : "Unavailable"}
              </p>
            </div>

            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">UV Index</div>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {current?.uvIndex !== null && current?.uvIndex !== undefined
                  ? current.uvIndex.toFixed(1)
                  : "Unavailable"}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Immediate Action Brief */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Immediate Exposure &amp; Timing Brief
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Derived directly from live atmospheric dispersion and 24-hour forecast
              </p>
            </div>

            <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    Indoor Ventilation Status
                  </span>
                  <span className={`font-semibold ${vent.toneClass}`}>
                    {vent.glyph} {vent.verdict}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {vent.explanation}
                </p>
              </div>

              <div className="pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    Lowest-AQI 2-Hour Window (Next 24h)
                  </span>
                  {bestWindow ? (
                    <span className="font-mono font-semibold tabular-nums text-sky-700 dark:text-sky-400">
                      {bestWindow.startTime}–{bestWindow.endTime}
                    </span>
                  ) : (
                    <span className="font-mono text-slate-400">Unavailable</span>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {bestWindow
                    ? `Forecasted average of ${bestWindow.avgAqi} US AQI (peak ${bestWindow.maxAqi}). Ideal slot for outdoor errands, jogging, or brief indoor cross-ventilation.`
                    : "Hourly forecast series is unavailable for window calculation."}
                </p>
              </div>

              <div className="pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    Telemetry Source
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {data?.timezoneAbbreviation || data?.timezone || "UTC"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {data?.source || "Open-Meteo Atmospheric Composition & CAMS"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Pollutant Metric Tiles */}
      <section aria-label="Measured Air Pollutants">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Pollutant Speciation
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Live surface concentrations compared to WHO Air Quality Guidelines
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POLLUTANT_BENCHMARKS.map((item) => {
            const val = current ? current[item.key] : null;
            const ratio = val !== null ? val / item.whoGuideline : null;
            const statusText =
              ratio === null
                ? "○ Unavailable"
                : ratio <= 0.75
                ? "● Within WHO"
                : ratio <= 1.25
                ? "▲ Near Limit"
                : "■ Above WHO";
            const statusTone =
              ratio === null
                ? "text-slate-400"
                : ratio <= 0.75
                ? "text-emerald-700 dark:text-emerald-400"
                : ratio <= 1.25
                ? "text-amber-700 dark:text-amber-400"
                : "text-rose-700 dark:text-rose-400";

            return (
              <div
                key={item.key}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {item.formula}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.name}
                    </h3>
                  </div>
                  <span className={`whitespace-nowrap text-xs font-semibold ${statusTone}`}>
                    {statusText}
                  </span>
                </div>

                <div className="my-3 flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                    {val !== null ? val.toFixed(1) : "—"}
                  </span>
                  <span className="font-mono text-xs text-slate-400">{item.unit}</span>
                  <span className="ml-auto font-mono text-[11px] tabular-nums text-slate-400">
                    {item.whoWindow}: {item.whoGuideline}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">{item.primarySource}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Telemetry Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <HourlyTrendChart
            hourly={data?.hourly ?? []}
            observedAt={data?.current.observedAt ?? null}
          />
        </div>
        <div className="lg:col-span-5">
          <PollutantGuidelineChart current={data?.current ?? null} />
        </div>
      </div>
    </div>
  );
};
