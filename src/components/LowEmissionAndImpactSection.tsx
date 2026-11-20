import React, { useMemo, useState } from "react";
import { Bike, CheckCircle2, Circle, Loader2, Sparkles, TrendingDown } from "lucide-react";
import type {
  AirQualityPayload,
  CityOption,
  PersonalizedAiPlan,
  SensitivityGroup,
} from "../types/airQuality";
import { calculateEmissionImpact } from "../utils/airQualityHelpers";
import { EmissionBreakdownChart } from "./TelemetryCharts";

interface LowEmissionAndImpactSectionProps {
  city: CityOption;
  data: AirQualityPayload | null;
  sensitivity: SensitivityGroup;
}

const DAILY_HABIT_IDEAS = [
  {
    id: "transit-swap",
    title: "Replace solo car commutes with metro, bus, or rail 3+ days/week",
    mechanism: "Cuts tailpipe NOₓ and brake/tire particulate resuspension along urban corridors.",
    savingNote: "~45–65% lower CO₂e per passenger-km",
  },
  {
    id: "micro-mobility",
    title: "Walk or cycle errands under 3 km during clean-air windows",
    mechanism: "Eliminates cold-start engine emissions, where catalytic converters run inefficiently and emit peak hydrocarbons.",
    savingNote: "Up to 0.58 kg CO₂e saved per 3 km trip",
  },
  {
    id: "no-idling",
    title: "Zero engine idling at pickups, crossings, and warm-ups",
    mechanism: "10 minutes of idling wastes ~0.25L fuel and creates localized PM2.5/CO hotspots at pedestrian breathing height.",
    savingNote: "~120 kg CO₂e/yr avoided",
  },
  {
    id: "off-peak-appliances",
    title: "Shift laundry, dishwashing & EV charging to off-peak clean-grid hours",
    mechanism: "Reduces demand on peaking fossil-fuel power plants that release SO₂ and regional ozone precursors.",
    savingNote: "15–25% lower marginal grid emissions",
  },
  {
    id: "eco-thermostat",
    title: "Adjust HVAC setpoint by 1.5 °C and clean filters every 60 days",
    mechanism: "Reduces building combustion heating load and keeps air handler pressure drop minimal.",
    savingNote: "~10% heating/cooling energy saved",
  },
];

export const LowEmissionAndImpactSection: React.FC<LowEmissionAndImpactSectionProps> = ({
  city,
  data,
  sensitivity,
}) => {
  const [commuteKmPerDay, setCommuteKmPerDay] = useState(14);
  const [carDaysSwappedPerWeek, setCarDaysSwappedPerWeek] = useState(3);
  const [activeMobilityKmWeek, setActiveMobilityKmWeek] = useState(12);
  const [homeEnergyReductionPct, setHomeEnergyReductionPct] = useState(15);
  const [plantForwardDaysWeek, setPlantForwardDaysWeek] = useState(3);

  const [currentTransport, setCurrentTransport] = useState("Gasoline Car");
  const [homeSetting, setHomeSetting] = useState("Urban Apartment");
  const [completedHabits, setCompletedHabits] = useState<Record<string, boolean>>({
    "transit-swap": true,
    "micro-mobility": true,
    "no-idling": false,
    "off-peak-appliances": false,
    "eco-thermostat": true,
  });

  const [aiPlan, setAiPlan] = useState<PersonalizedAiPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const impact = useMemo(
    () =>
      calculateEmissionImpact({
        commuteKmPerDay,
        carDaysSwappedPerWeek,
        activeMobilityKmWeek,
        homeEnergyReductionPct,
        plantForwardDaysWeek,
      }),
    [
      commuteKmPerDay,
      carDaysSwappedPerWeek,
      activeMobilityKmWeek,
      homeEnergyReductionPct,
      plantForwardDaysWeek,
    ]
  );

  const commuteSavingsKg = commuteKmPerDay * carDaysSwappedPerWeek * 0.115 * 52;
  const activeMobilityKg = activeMobilityKmWeek * 0.192 * 52;
  const energySavingsKg = (homeEnergyReductionPct / 100) * 28.5 * 52;
  const dietSavingsKg = plantForwardDaysWeek * 2.4 * 52;

  const toggleHabit = (id: string) => {
    setCompletedHabits((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGenerateAiPlan = async () => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const resp = await fetch("/api/assistant/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityContext: {
            cityName: city.name,
            country: city.country,
            latitude: city.latitude,
            longitude: city.longitude,
            observedAt: data?.current.observedAt ?? null,
            usAqi: data?.current.usAqi ?? null,
            europeanAqi: data?.current.europeanAqi ?? null,
            pm25: data?.current.pm25 ?? null,
            pm10: data?.current.pm10 ?? null,
            no2: data?.current.no2 ?? null,
            o3: data?.current.o3 ?? null,
            so2: data?.current.so2 ?? null,
            co: data?.current.co ?? null,
            uvIndex: data?.current.uvIndex ?? null,
            temperatureC: data?.weather?.temperatureC ?? null,
            humidityPct: data?.weather?.humidityPct ?? null,
            windSpeedKmh: data?.weather?.windSpeedKmh ?? null,
          },
          sensitivityGroup: sensitivity,
          commuteKmPerDay,
          currentTransport,
          homeSetting,
        }),
      });
      const rawText = await resp.text();
      let json: { plan?: PersonalizedAiPlan; error?: string } | null = null;
      try {
        json = JSON.parse(rawText) as { plan?: PersonalizedAiPlan; error?: string };
      } catch {
        json = null;
      }
      if (!resp.ok || !json?.plan) {
        setPlanError(json?.error || `Unable to generate personalized plan (HTTP ${resp.status}).`);
      } else {
        setAiPlan(json.plan);
      }
    } catch {
      setPlanError("Network error contacting AI planning service.");
    } finally {
      setPlanLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section Header + AI Personalized Plan Trigger */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 lg:flex-row lg:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <Bike className="h-4 w-4" />
            <span>Personalized Low-Emission Routines &amp; Impact Dashboard</span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            Reduce Personal Emissions &amp; Urban Particulate Load
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Adjust your weekly commute and household habits below to model avoided CO₂e, NOₓ, and PM₂.₅, or generate an AI-tailored routine matched to {city.name}&apos;s live AQI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Primary commute mode"
            value={currentTransport}
            onChange={(e) => setCurrentTransport(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="Gasoline Car">Gasoline Car</option>
            <option value="Hybrid / EV">Hybrid / EV</option>
            <option value="Motorbike / Scooter">Motorbike / Scooter</option>
            <option value="Public Transit">Public Transit</option>
            <option value="Bicycle / Walk">Bicycle / Walk</option>
          </select>

          <select
            aria-label="Home environment"
            value={homeSetting}
            onChange={(e) => setHomeSetting(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="Urban Apartment">Urban Apartment</option>
            <option value="Suburban House">Suburban House</option>
            <option value="Roadside Flat">Roadside Flat</option>
          </select>

          <button
            type="button"
            onClick={handleGenerateAiPlan}
            disabled={planLoading}
            className="inline-flex h-10 whitespace-nowrap shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-700"
          >
            {planLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>{planLoading ? "Generating Plan..." : "Generate AI Routine Plan"}</span>
          </button>
        </div>
      </div>

      {planError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
        >
          <span>{planError}</span>
          <button
            type="button"
            disabled={planLoading}
            onClick={handleGenerateAiPlan}
            className="whitespace-nowrap shrink-0 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-800 disabled:opacity-50"
          >
            Retry Plan
          </button>
        </div>
      )}

      {aiPlan && (
        <div className="space-y-5 rounded-xl border border-sky-200 bg-white p-6 dark:border-sky-900/70 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <p className="text-xs font-medium text-sky-700 dark:text-sky-400">
              AI-Tailored Briefing for {city.name} · {sensitivity}
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
              {aiPlan.headline}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {aiPlan.outdoorVerdict}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Low-Emission Daily Habits
              </h4>
              <div className="mt-3 space-y-3">
                {aiPlan.lowEmissionRoutines.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {r.title}
                      </span>
                      <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                        {r.impactNote}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {r.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Indoor Protection Protocol ({homeSetting})
              </h4>
              <div className="mt-3 space-y-3">
                {aiPlan.indoorProtocol.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {p.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {p.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Impact KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500 dark:text-slate-400">Annual CO₂e Avoided</span>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
            {impact.annualCo2KgSaved.toLocaleString()}
            <span className="ml-1.5 text-xs font-normal text-slate-400">kg/yr</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {impact.weeklyCo2KgSaved} kg CO₂e saved per week
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500 dark:text-slate-400">Urban NOₓ Prevented</span>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-sky-700 dark:text-sky-400">
            {impact.annualNoxGramsSaved.toLocaleString()}
            <span className="ml-1.5 text-xs font-normal text-slate-400">g/yr</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Reduces ground-level ozone &amp; smog formation
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500 dark:text-slate-400">Direct PM₂.₅ Avoided</span>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {impact.annualPm25GramsSaved}
            <span className="ml-1.5 text-xs font-normal text-slate-400">g/yr</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tailpipe exhaust &amp; brake-wear particulates
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500 dark:text-slate-400">Carbon Absorption Equiv.</span>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {impact.treesEquivalent}
            <span className="ml-1.5 text-xs font-normal text-slate-400">trees</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Mature urban trees absorbing CO₂ annually
          </p>
        </div>
      </div>

      {/* Simulator Controls + Impact Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Lifestyle Impact Simulator
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs">
                <label htmlFor="sim-commute" className="font-medium text-slate-700 dark:text-slate-300">
                  Daily Round-Trip Commute
                </label>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {commuteKmPerDay} km/day
                </span>
              </div>
              <input
                id="sim-commute"
                type="range"
                min={2}
                max={60}
                value={commuteKmPerDay}
                onChange={(e) => setCommuteKmPerDay(Number(e.target.value))}
                className="mt-1.5 w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs">
                <label htmlFor="sim-transit" className="font-medium text-slate-700 dark:text-slate-300">
                  Car Commutes Swapped to Public Transit
                </label>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {carDaysSwappedPerWeek} days/wk
                </span>
              </div>
              <input
                id="sim-transit"
                type="range"
                min={0}
                max={7}
                value={carDaysSwappedPerWeek}
                onChange={(e) => setCarDaysSwappedPerWeek(Number(e.target.value))}
                className="mt-1.5 w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs">
                <label htmlFor="sim-active" className="font-medium text-slate-700 dark:text-slate-300">
                  Walking / Cycling Instead of Driving
                </label>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {activeMobilityKmWeek} km/wk
                </span>
              </div>
              <input
                id="sim-active"
                type="range"
                min={0}
                max={60}
                step={2}
                value={activeMobilityKmWeek}
                onChange={(e) => setActiveMobilityKmWeek(Number(e.target.value))}
                className="mt-1.5 w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs">
                <label htmlFor="sim-energy" className="font-medium text-slate-700 dark:text-slate-300">
                  Home Electricity &amp; Heating Efficiency
                </label>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  -{homeEnergyReductionPct}%
                </span>
              </div>
              <input
                id="sim-energy"
                type="range"
                min={0}
                max={45}
                step={5}
                value={homeEnergyReductionPct}
                onChange={(e) => setHomeEnergyReductionPct(Number(e.target.value))}
                className="mt-1.5 w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs">
                <label htmlFor="sim-diet" className="font-medium text-slate-700 dark:text-slate-300">
                  Plant-Forward Days / Week
                </label>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {plantForwardDaysWeek} days/wk
                </span>
              </div>
              <input
                id="sim-diet"
                type="range"
                min={0}
                max={7}
                value={plantForwardDaysWeek}
                onChange={(e) => setPlantForwardDaysWeek(Number(e.target.value))}
                className="mt-1.5 w-full accent-emerald-600"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-7">
          <EmissionBreakdownChart
            commuteSavingsKg={commuteSavingsKg}
            activeMobilityKg={activeMobilityKg}
            energySavingsKg={energySavingsKg}
            dietSavingsKg={dietSavingsKg}
          />

          {/* Scientific Explanation + Habit Tracker */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              How Individual Habits Lower Urban Air Pollution
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Urban PM₂.₅ isn&apos;t only tailpipe soot — nitrogen oxides (NOₓ) from vehicles and gas heaters chemically react in sunlight to form secondary nitrates and ground-level ozone (O₃). Check off the routines you commit to this week:
            </p>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {DAILY_HABIT_IDEAS.map((habit) => {
                const active = !!completedHabits[habit.id];
                return (
                  <button
                    key={habit.id}
                    type="button"
                    onClick={() => toggleHabit(habit.id)}
                    className="flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    {active ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {habit.title}
                        </span>
                        <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                          {habit.savingNote}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {habit.mechanism}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
