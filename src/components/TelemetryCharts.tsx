import React, { useMemo, useState } from "react";
import type { AirQualityPayload, HourlyTelemetryPoint } from "../types/airQuality";
import { formatHourLabel, POLLUTANT_BENCHMARKS } from "../utils/airQualityHelpers";

interface HourlyTrendChartProps {
  hourly: HourlyTelemetryPoint[];
  observedAt: string | null;
}

export const HourlyTrendChart: React.FC<HourlyTrendChartProps> = ({ hourly, observedAt }) => {
  const [horizon, setHorizon] = useState<"24h" | "48h">("24h");
  const [metric, setMetric] = useState<"usAqi" | "pm25" | "pm10">("usAqi");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const sliceData = useMemo(() => {
    if (!hourly || hourly.length === 0) return [];
    let startIdx = 0;
    if (observedAt) {
      const prefix = observedAt.slice(0, 13);
      const found = hourly.findIndex((p) => p.time.startsWith(prefix));
      if (found >= 0) startIdx = found;
    }
    const count = horizon === "24h" ? 24 : 48;
    return hourly.slice(startIdx, startIdx + count);
  }, [hourly, observedAt, horizon]);

  const width = 760;
  const height = 248;
  const padLeft = 44;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const values = sliceData.map((d) => d[metric]);
  const validValues = values.filter((v): v is number => v !== null && Number.isFinite(v));

  const guidelineVal = metric === "usAqi" ? 50 : metric === "pm25" ? 15 : 45;
  const maxVal = validValues.length > 0 ? Math.max(...validValues, guidelineVal * 1.35, 25) : 100;
  const yMax = Math.ceil(maxVal / 10) * 10;

  const points = sliceData.map((d, idx) => {
    const x = sliceData.length > 1 ? padLeft + (idx / (sliceData.length - 1)) * plotW : padLeft;
    const raw = d[metric];
    const y = raw !== null ? padTop + plotH - (raw / yMax) * plotH : null;
    return { x, y, raw, point: d, idx };
  });

  const pathD = useMemo(() => {
    let dStr = "";
    let started = false;
    for (const pt of points) {
      if (pt.y === null) {
        started = false;
        continue;
      }
      dStr += `${started ? "L" : "M"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)} `;
      started = true;
    }
    return dStr.trim();
  }, [points]);

  const areaD = useMemo(() => {
    const validPts = points.filter((p) => p.y !== null);
    if (validPts.length < 2) return "";
    const base = padTop + plotH;
    const first = validPts[0];
    const last = validPts[validPts.length - 1];
    return `${pathD} L ${last.x.toFixed(1)} ${base} L ${first.x.toFixed(1)} ${base} Z`;
  }, [points, pathD, padTop, plotH]);

  const guidelineY = padTop + plotH - (guidelineVal / yMax) * plotH;
  const activePoint = hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : null;
  const metricLabel = metric === "usAqi" ? "US AQI" : metric === "pm25" ? "PM2.5 (µg/m³)" : "PM10 (µg/m³)";
  const guidelineLabel =
    metric === "usAqi" ? "Good threshold (50)" : metric === "pm25" ? "WHO 24h (15 µg/m³)" : "WHO 24h (45 µg/m³)";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Hourly Dispersion &amp; Forecast Curve
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hover across the timeline to inspect exact hourly {metricLabel} readings
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(
              [
                { id: "usAqi", label: "US AQI" },
                { id: "pm25", label: "PM2.5" },
                { id: "pm10", label: "PM10" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMetric(opt.id)}
                className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  metric === opt.id
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(["24h", "48h"] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  horizon === h
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      </div>

      {validValues.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Hourly forecast telemetry is unavailable for this selection.
        </div>
      ) : (
        <div className="relative w-full">
          {activePoint && (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800/80">
              <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                {activePoint.point.time.replace("T", " ")}
              </span>
              <div className="flex items-center gap-4 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                <span>US AQI: {activePoint.point.usAqi ?? "N/A"}</span>
                <span>PM2.5: {activePoint.point.pm25 ?? "N/A"} µg/m³</span>
                <span>PM10: {activePoint.point.pm10 ?? "N/A"} µg/m³</span>
                <span>O₃: {activePoint.point.o3 ?? "N/A"} µg/m³</span>
              </div>
            </div>
          )}

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-56 w-full overflow-visible select-none"
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="aqAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284C7" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Y-axis grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = padTop + plotH - t * plotH;
              const val = Math.round(t * yMax);
              return (
                <g key={t}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    className="stroke-slate-200 dark:stroke-slate-800"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 font-mono text-[10px]"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* WHO / Good Guideline reference line */}
            {guidelineY >= padTop && guidelineY <= padTop + plotH && (
              <g>
                <line
                  x1={padLeft}
                  y1={guidelineY}
                  x2={width - padRight}
                  y2={guidelineY}
                  stroke="#16A34A"
                  strokeWidth="1.25"
                  strokeDasharray="4 4"
                />
                <text
                  x={width - padRight}
                  y={guidelineY - 5}
                  textAnchor="end"
                  className="fill-emerald-600 font-mono text-[10px] dark:fill-emerald-400"
                >
                  {guidelineLabel}
                </text>
              </g>
            )}

            {/* Area & Line */}
            {areaD && <path d={areaD} fill="url(#aqAreaFill)" />}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#0284C7"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* X-axis labels every 4 or 8 hours */}
            {points.map((pt, i) => {
              const step = horizon === "24h" ? 4 : 8;
              if (i % step !== 0 && i !== points.length - 1) return null;
              return (
                <text
                  key={pt.point.time}
                  x={pt.x}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-slate-400 font-mono text-[10px]"
                >
                  {formatHourLabel(pt.point.time)}
                </text>
              );
            })}

            {/* Active crosshair */}
            {activePoint && activePoint.y !== null && (
              <g>
                <line
                  x1={activePoint.x}
                  y1={padTop}
                  x2={activePoint.x}
                  y2={padTop + plotH}
                  className="stroke-slate-400 dark:stroke-slate-500"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="4.5"
                  fill="#0284C7"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Invisible hover columns */}
            {points.map((pt, i) => {
              const colW = plotW / Math.max(points.length, 1);
              return (
                <rect
                  key={pt.point.time}
                  x={pt.x - colW / 2}
                  y={padTop}
                  width={colW}
                  height={plotH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoverIdx(i)}
                />
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
};

interface PollutantGuidelineChartProps {
  current: AirQualityPayload["current"] | null;
}

export const PollutantGuidelineChart: React.FC<PollutantGuidelineChartProps> = ({ current }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Pollutant Load vs. WHO Guidelines
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Live concentrations normalized against World Health Organization reference thresholds
        </p>
      </div>

      <div className="space-y-3.5">
        {POLLUTANT_BENCHMARKS.map((item) => {
          const val = current ? current[item.key] : null;
          const pct = val !== null ? Math.round((val / item.whoGuideline) * 100) : null;
          const barWidth = pct !== null ? Math.min(pct, 100) : 0;
          const barColor =
            pct === null
              ? "bg-slate-300 dark:bg-slate-700"
              : pct <= 75
              ? "bg-emerald-600"
              : pct <= 125
              ? "bg-amber-500"
              : "bg-rose-600";

          return (
            <div key={item.key} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {item.formula}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">{item.name}</span>
                </div>
                <div className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                  {val !== null ? (
                    <>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {val.toFixed(1)}
                      </span>{" "}
                      <span className="text-slate-400">{item.unit}</span>
                      <span className="mx-1.5 text-slate-300 dark:text-slate-600">/</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {item.whoGuideline} ({pct}%)
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400">Unavailable</span>
                  )}
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface EmissionBreakdownChartProps {
  commuteSavingsKg: number;
  activeMobilityKg: number;
  energySavingsKg: number;
  dietSavingsKg: number;
}

export const EmissionBreakdownChart: React.FC<EmissionBreakdownChartProps> = ({
  commuteSavingsKg,
  activeMobilityKg,
  energySavingsKg,
  dietSavingsKg,
}) => {
  const rows = [
    { label: "Transit Commute Swaps", value: Math.round(commuteSavingsKg), color: "bg-sky-600" },
    { label: "Walking & Cycling Errands", value: Math.round(activeMobilityKg), color: "bg-emerald-600" },
    { label: "Home Energy & Off-Peak Shift", value: Math.round(energySavingsKg), color: "bg-teal-600" },
    { label: "Low-Carbon Meal Choices", value: Math.round(dietSavingsKg), color: "bg-amber-600" },
  ];
  const maxVal = Math.max(...rows.map((r) => r.value), 100);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Annual CO₂e Reduction Breakdown
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Projected annual greenhouse gas avoided (kg CO₂e / year) from your active lifestyle shifts
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const pct = Math.round((row.value / maxVal) * 100);
          return (
            <div key={row.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">{row.label}</span>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {row.value.toLocaleString()} kg/yr
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-md transition-all duration-300 ${row.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
