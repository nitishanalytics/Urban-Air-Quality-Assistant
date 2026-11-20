import type {
  AirQualityPayload,
  CityOption,
  HourlyTelemetryPoint,
  SensitivityGroup,
} from "../types/airQuality";

export const PRESET_CITIES: CityOption[] = [
  {
    id: 5391959,
    name: "San Francisco",
    country: "United States",
    admin1: "California",
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: "America/Los_Angeles",
  },
  {
    id: 2643743,
    name: "London",
    country: "United Kingdom",
    admin1: "England",
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: "Europe/London",
  },
  {
    id: 1850147,
    name: "Tokyo",
    country: "Japan",
    admin1: "Tokyo",
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: "Asia/Tokyo",
  },
  {
    id: 1261481,
    name: "New Delhi",
    country: "India",
    admin1: "Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    timezone: "Asia/Kolkata",
  },
  {
    id: 2988507,
    name: "Paris",
    country: "France",
    admin1: "Île-de-France",
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: "Europe/Paris",
  },
  {
    id: 3448439,
    name: "São Paulo",
    country: "Brazil",
    admin1: "São Paulo",
    latitude: -23.5505,
    longitude: -46.6333,
    timezone: "America/Sao_Paulo",
  },
  {
    id: 1880252,
    name: "Singapore",
    country: "Singapore",
    admin1: "Central Singapore",
    latitude: 1.3521,
    longitude: 103.8198,
    timezone: "Asia/Singapore",
  },
  {
    id: 184745,
    name: "Nairobi",
    country: "Kenya",
    admin1: "Nairobi Area",
    latitude: -1.2921,
    longitude: 36.8219,
    timezone: "Africa/Nairobi",
  },
];

export interface AqiClassification {
  label: string;
  glyph: string;
  band: string;
  summary: string;
  textClass: string;
  surfaceClass: string;
  borderClass: string;
  strokeColor: string;
}

export function classifyUsAqi(aqi: number | null | undefined): AqiClassification {
  if (aqi === null || aqi === undefined || Number.isNaN(aqi)) {
    return {
      label: "Unavailable",
      glyph: "○",
      band: "No sensor data",
      summary: "Live US AQI reading is currently unavailable from the upstream atmospheric stream.",
      textClass: "text-slate-600 dark:text-slate-400",
      surfaceClass: "bg-slate-100 dark:bg-slate-800/70",
      borderClass: "border-slate-200 dark:border-slate-700",
      strokeColor: "#64748B",
    };
  }
  if (aqi <= 50) {
    return {
      label: "Good",
      glyph: "●",
      band: "0–50 US AQI",
      summary: "Air quality is satisfactory with minimal respiratory risk for all groups.",
      textClass: "text-emerald-700 dark:text-emerald-400",
      surfaceClass: "bg-emerald-50 dark:bg-emerald-950/40",
      borderClass: "border-emerald-200 dark:border-emerald-800/70",
      strokeColor: "#16A34A",
    };
  }
  if (aqi <= 100) {
    return {
      label: "Moderate",
      glyph: "▲",
      band: "51–100 US AQI",
      summary: "Acceptable air quality; unusually sensitive individuals should monitor prolonged exertion.",
      textClass: "text-amber-700 dark:text-amber-400",
      surfaceClass: "bg-amber-50 dark:bg-amber-950/40",
      borderClass: "border-amber-200 dark:border-amber-800/70",
      strokeColor: "#D97706",
    };
  }
  if (aqi <= 150) {
    return {
      label: "Sensitive Groups",
      glyph: "◆",
      band: "101–150 US AQI",
      summary: "Sensitive groups (asthma, children, seniors) may experience irritation; reduce intense outdoor exertion.",
      textClass: "text-orange-700 dark:text-orange-400",
      surfaceClass: "bg-orange-50 dark:bg-orange-950/40",
      borderClass: "border-orange-200 dark:border-orange-800/70",
      strokeColor: "#EA580C",
    };
  }
  if (aqi <= 200) {
    return {
      label: "Unhealthy",
      glyph: "■",
      band: "151–200 US AQI",
      summary: "Everyone may begin to experience respiratory effects; move strenuous exercise indoors.",
      textClass: "text-rose-700 dark:text-rose-400",
      surfaceClass: "bg-rose-50 dark:bg-rose-950/40",
      borderClass: "border-rose-200 dark:border-rose-800/70",
      strokeColor: "#DC2626",
    };
  }
  if (aqi <= 300) {
    return {
      label: "Very Unhealthy",
      glyph: "✖",
      band: "201–300 US AQI",
      summary: "Health alert: significant respiratory risk across the population. Limit outdoor exposure.",
      textClass: "text-fuchsia-700 dark:text-fuchsia-400",
      surfaceClass: "bg-fuchsia-50 dark:bg-fuchsia-950/40",
      borderClass: "border-fuchsia-200 dark:border-fuchsia-800/70",
      strokeColor: "#9333EA",
    };
  }
  return {
    label: "Hazardous",
    glyph: "✖",
    band: "301+ US AQI",
    summary: "Emergency conditions: remain indoors with HEPA filtration and sealed windows.",
    textClass: "text-red-800 dark:text-red-400",
    surfaceClass: "bg-red-50 dark:bg-red-950/50",
    borderClass: "border-red-300 dark:border-red-800",
    strokeColor: "#991B1B",
  };
}

export interface PollutantBenchmark {
  key: "pm25" | "pm10" | "no2" | "o3" | "so2" | "co";
  name: string;
  formula: string;
  unit: string;
  whoGuideline: number;
  whoWindow: string;
  primarySource: string;
}

export const POLLUTANT_BENCHMARKS: PollutantBenchmark[] = [
  {
    key: "pm25",
    name: "Fine Particulates",
    formula: "PM₂.₅",
    unit: "µg/m³",
    whoGuideline: 15,
    whoWindow: "24h WHO",
    primarySource: "Combustion exhaust, wood smoke, secondary aerosols",
  },
  {
    key: "pm10",
    name: "Coarse Particulates",
    formula: "PM₁₀",
    unit: "µg/m³",
    whoGuideline: 45,
    whoWindow: "24h WHO",
    primarySource: "Road dust, construction, brake/tire wear",
  },
  {
    key: "no2",
    name: "Nitrogen Dioxide",
    formula: "NO₂",
    unit: "µg/m³",
    whoGuideline: 25,
    whoWindow: "24h WHO",
    primarySource: "Diesel & gasoline traffic, gas appliances",
  },
  {
    key: "o3",
    name: "Ground-Level Ozone",
    formula: "O₃",
    unit: "µg/m³",
    whoGuideline: 100,
    whoWindow: "8h WHO",
    primarySource: "Photochemical reaction of NOₓ + sunlight + VOCs",
  },
  {
    key: "so2",
    name: "Sulfur Dioxide",
    formula: "SO₂",
    unit: "µg/m³",
    whoGuideline: 40,
    whoWindow: "24h WHO",
    primarySource: "Power generation, shipping fuel, industry",
  },
  {
    key: "co",
    name: "Carbon Monoxide",
    formula: "CO",
    unit: "µg/m³",
    whoGuideline: 4000,
    whoWindow: "24h WHO",
    primarySource: "Incomplete fuel combustion in engines & heaters",
  },
];

export function formatHourLabel(isoTime: string): string {
  const parts = isoTime.split("T");
  if (parts.length < 2) return isoTime;
  return parts[1].slice(0, 5);
}

export function formatDateTimeCompact(isoTime: string | null | undefined): string {
  if (!isoTime) return "Unavailable";
  const cleaned = isoTime.replace("T", " ");
  return cleaned.length > 16 ? cleaned.slice(0, 16) : cleaned;
}

export interface BestWindowResult {
  startTime: string;
  endTime: string;
  avgAqi: number;
  maxAqi: number;
}

export function findBest24hWindow(
  hourly: HourlyTelemetryPoint[],
  observedAt: string | null
): BestWindowResult | null {
  if (!hourly || hourly.length === 0) return null;

  let startIndex = 0;
  if (observedAt) {
    const obsPrefix = observedAt.slice(0, 13);
    const found = hourly.findIndex((p) => p.time.startsWith(obsPrefix));
    if (found >= 0) startIndex = found;
  }

  const next24 = hourly.slice(startIndex, startIndex + 24);
  if (next24.length < 2) return null;

  let bestAvg = Infinity;
  let bestPair: BestWindowResult | null = null;

  for (let i = 0; i < next24.length - 1; i++) {
    const a = next24[i].usAqi;
    const b = next24[i + 1].usAqi;
    if (a === null || b === null) continue;
    const avg = (a + b) / 2;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestPair = {
        startTime: formatHourLabel(next24[i].time),
        endTime: formatHourLabel(next24[i + 1].time),
        avgAqi: Math.round(avg),
        maxAqi: Math.max(a, b),
      };
    }
  }

  return bestPair;
}

export interface ActivityRecommendation {
  id: string;
  activity: string;
  intensity: string;
  status: "Recommended" | "Modify" | "Avoid Outdoor" | "Unavailable";
  glyph: string;
  statusTone: string;
  guidance: string;
}

export function deriveActivityMatrix(
  aq: AirQualityPayload | null,
  sensitivity: SensitivityGroup
): ActivityRecommendation[] {
  const aqi = aq?.current.usAqi ?? null;
  if (aqi === null) {
    return [
      {
        id: "run",
        activity: "Vigorous Running & Tempo Cycling",
        intensity: "High ventilation rate",
        status: "Unavailable",
        glyph: "○",
        statusTone: "text-slate-500 dark:text-slate-400",
        guidance: "Awaiting live AQI telemetry before rating high-exertion outdoor cardio.",
      },
      {
        id: "walk",
        activity: "Brisk Walking & Active Commute",
        intensity: "Moderate breathing rate",
        status: "Unavailable",
        glyph: "○",
        statusTone: "text-slate-500 dark:text-slate-400",
        guidance: "Awaiting live AQI telemetry for this location.",
      },
      {
        id: "family",
        activity: "Children's Outdoor Play & Parks",
        intensity: "Developing lungs / higher intake",
        status: "Unavailable",
        glyph: "○",
        statusTone: "text-slate-500 dark:text-slate-400",
        guidance: "Awaiting live AQI telemetry for this location.",
      },
      {
        id: "indoor",
        activity: "Indoor Strength, Mobility & Zone-2 Trainer",
        intensity: "Controlled environment",
        status: "Recommended",
        glyph: "●",
        statusTone: "text-emerald-700 dark:text-emerald-400",
        guidance: "Indoor sessions remain safe when outdoor telemetry is pending.",
      },
    ];
  }

  const sensitivityOffset =
    sensitivity === "Sensitive / Asthma" || sensitivity === "Children & Seniors"
      ? 25
      : sensitivity === "Outdoor Athlete"
      ? 15
      : 0;
  const effectiveAqi = aqi + sensitivityOffset;

  const runStatus: ActivityRecommendation["status"] =
    effectiveAqi <= 65 ? "Recommended" : effectiveAqi <= 120 ? "Modify" : "Avoid Outdoor";

  const walkStatus: ActivityRecommendation["status"] =
    effectiveAqi <= 105 ? "Recommended" : effectiveAqi <= 165 ? "Modify" : "Avoid Outdoor";

  const familyStatus: ActivityRecommendation["status"] =
    aqi <= 65 ? "Recommended" : aqi <= 115 ? "Modify" : "Avoid Outdoor";

  const toneFor = (status: ActivityRecommendation["status"]) => {
    if (status === "Recommended") return { glyph: "●", tone: "text-emerald-700 dark:text-emerald-400" };
    if (status === "Modify") return { glyph: "▲", tone: "text-amber-700 dark:text-amber-400" };
    return { glyph: "■", tone: "text-rose-700 dark:text-rose-400" };
  };

  const runMeta = toneFor(runStatus);
  const walkMeta = toneFor(walkStatus);
  const familyMeta = toneFor(familyStatus);

  return [
    {
      id: "run",
      activity: "Vigorous Running & Tempo Cycling",
      intensity: "High respiratory minute volume",
      status: runStatus,
      glyph: runMeta.glyph,
      statusTone: runMeta.tone,
      guidance:
        runStatus === "Recommended"
          ? `Observed US AQI (${aqi}) supports sustained outdoor cardio. Prefer parks or low-traffic corridors away from diesel intersections.`
          : runStatus === "Modify"
          ? `At US AQI ${aqi} for ${sensitivity}, shorten high-intensity intervals by 30–40% or shift to the lowest-AQI hourly window.`
          : `At US AQI ${aqi}, deep mouth breathing during high exertion pulls fine particulates deep into alveoli. Shift cardio indoors.`,
    },
    {
      id: "walk",
      activity: "Brisk Walking & Active Commute",
      intensity: "Moderate breathing rate",
      status: walkStatus,
      glyph: walkMeta.glyph,
      statusTone: walkMeta.tone,
      guidance:
        walkStatus === "Recommended"
          ? `Safe for daily walking or relaxed cycling errands. Side streets can cut roadside NO₂ exposure by up to 40%.`
          : walkStatus === "Modify"
          ? `Keep pace steady to maintain nasal breathing, avoid arterial roads, and consider a well-fitted N95/FFP2 respirator.`
          : `Wear a properly sealed N95/FFP2 mask for essential transit walks and minimize time beside congested roadways.`,
    },
    {
      id: "family",
      activity: "Children's Outdoor Play & Parks",
      intensity: "Higher air intake per kg body weight",
      status: familyStatus,
      glyph: familyMeta.glyph,
      statusTone: familyMeta.tone,
      guidance:
        familyStatus === "Recommended"
          ? `Good conditions for playground play, school sports, and outdoor social time.`
          : familyStatus === "Modify"
          ? `Limit vigorous outdoor play to 30–45 minute blocks with hydration breaks; monitor sensitive children for coughing.`
          : `Move youth athletics and recess indoors until particulate levels fall below 100 US AQI.`,
    },
    {
      id: "indoor",
      activity: "Indoor Strength, Mobility & Filtered Cardio",
      intensity: "Clean-air controlled training",
      status: "Recommended",
      glyph: "●",
      statusTone: "text-emerald-700 dark:text-emerald-400",
      guidance:
        aqi > 100
          ? `Ideal primary workout choice today while outdoor US AQI sits at ${aqi}. Run a HEPA purifier in the training room.`
          : `Always available as a baseline option; pair with cross-ventilation when outdoor AQI stays low.`,
    },
  ];
}

export interface VentilationDecision {
  verdict: "Open Windows" | "Timed Cross-Ventilation" | "Keep Sealed & Filter" | "Telemetry Pending";
  glyph: string;
  toneClass: string;
  explanation: string;
}

export function deriveVentilationDecision(aq: AirQualityPayload | null): VentilationDecision {
  const aqi = aq?.current.usAqi ?? null;
  const pm25 = aq?.current.pm25 ?? null;
  const humidity = aq?.weather?.humidityPct ?? null;

  if (aqi === null) {
    return {
      verdict: "Telemetry Pending",
      glyph: "○",
      toneClass: "text-slate-600 dark:text-slate-400",
      explanation: "Waiting for live outdoor AQI and particulate readings to compute safe ventilation guidance.",
    };
  }

  if (aqi <= 50 && (pm25 === null || pm25 <= 12)) {
    const humNote =
      humidity !== null && humidity > 75
        ? ` Outdoor humidity is ${humidity}%, so limit opening to 15–20 minutes to prevent indoor dampness.`
        : "";
    return {
      verdict: "Open Windows",
      glyph: "●",
      toneClass: "text-emerald-700 dark:text-emerald-400",
      explanation: `Outdoor air is clean (${aqi} US AQI${pm25 !== null ? `, ${pm25} µg/m³ PM2.5` : ""}). Cross-ventilate rooms to flush indoor CO₂ and cooking VOCs.${humNote}`,
    };
  }

  if (aqi <= 100) {
    return {
      verdict: "Timed Cross-Ventilation",
      glyph: "▲",
      toneClass: "text-amber-700 dark:text-amber-400",
      explanation: `Moderate outdoor air (${aqi} US AQI). Ventilate briefly for 10–15 minutes during the lowest-AQI window, away from peak rush-hour traffic, then run indoor filtration.`,
    };
  }

  return {
    verdict: "Keep Sealed & Filter",
    glyph: "■",
    toneClass: "text-rose-700 dark:text-rose-400",
    explanation: `Elevated outdoor pollution (${aqi} US AQI${pm25 !== null ? `, ${pm25} µg/m³ PM2.5` : ""}). Keep windows closed, seal door gaps, use kitchen range hoods on recirculate/exhaust, and run HEPA H13 filtration.`,
  };
}

export interface EmissionImpactMetrics {
  annualCo2KgSaved: number;
  annualNoxGramsSaved: number;
  annualPm25GramsSaved: number;
  weeklyCo2KgSaved: number;
  treesEquivalent: number;
}

export function calculateEmissionImpact(params: {
  commuteKmPerDay: number;
  carDaysSwappedPerWeek: number;
  activeMobilityKmWeek: number;
  homeEnergyReductionPct: number;
  plantForwardDaysWeek: number;
}): EmissionImpactMetrics {
  // Real-world lifecycle & tailpipe emission factors (DEFRA / US EPA averages):
  // Average passenger gasoline car: ~0.192 kg CO2e/km, ~0.28 g NOx/km, ~0.018 g PM2.5 (exhaust+brake/tire)/km
  // Switching to transit/bus saves ~58% CO2e; walking/cycling saves ~98% tailpipe emissions.
  const carKmReplacedPerWeek = params.commuteKmPerDay * params.carDaysSwappedPerWeek;
  const transitCo2PerWeek = carKmReplacedPerWeek * 0.115;
  const activeCo2PerWeek = params.activeMobilityKmWeek * 0.192;
  const energyCo2PerWeek = (params.homeEnergyReductionPct / 100) * 28.5; // ~1,480 kg/yr baseline household electricity/gas
  const dietCo2PerWeek = params.plantForwardDaysWeek * 2.4;

  const weeklyCo2KgSaved = transitCo2PerWeek + activeCo2PerWeek + energyCo2PerWeek + dietCo2PerWeek;
  const annualCo2KgSaved = weeklyCo2KgSaved * 52;

  const totalCarKmAvoidedAnnual = (carKmReplacedPerWeek * 0.65 + params.activeMobilityKmWeek) * 52;
  const annualNoxGramsSaved = totalCarKmAvoidedAnnual * 0.28 + (params.homeEnergyReductionPct / 100) * 650;
  const annualPm25GramsSaved = totalCarKmAvoidedAnnual * 0.018 + (params.homeEnergyReductionPct / 100) * 45;

  return {
    annualCo2KgSaved: Math.round(annualCo2KgSaved),
    annualNoxGramsSaved: Math.round(annualNoxGramsSaved),
    annualPm25GramsSaved: Math.round(annualPm25GramsSaved * 10) / 10,
    weeklyCo2KgSaved: Math.round(weeklyCo2KgSaved * 10) / 10,
    treesEquivalent: Math.round((annualCo2KgSaved / 21.77) * 10) / 10,
  };
}
