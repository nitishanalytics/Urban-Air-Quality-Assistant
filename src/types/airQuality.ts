export interface CityOption {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population?: number | null;
}

export interface HourlyTelemetryPoint {
  time: string;
  usAqi: number | null;
  europeanAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  co: number | null;
  so2: number | null;
}

export interface AirQualityPayload {
  source: string;
  fetchedAt: string;
  timezone: string;
  timezoneAbbreviation: string;
  elevation: number | null;
  current: {
    observedAt: string | null;
    usAqi: number | null;
    europeanAqi: number | null;
    pm25: number | null;
    pm10: number | null;
    no2: number | null;
    o3: number | null;
    so2: number | null;
    co: number | null;
    dust: number | null;
    ammonia: number | null;
    uvIndex: number | null;
  };
  weather: {
    temperatureC: number | null;
    apparentTempC: number | null;
    humidityPct: number | null;
    windSpeedKmh: number | null;
    windDirectionDeg: number | null;
    pressureHpa: number | null;
  } | null;
  hourly: HourlyTelemetryPoint[];
}

export type SensitivityGroup =
  | "General Public"
  | "Sensitive / Asthma"
  | "Outdoor Athlete"
  | "Children & Seniors";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isError?: boolean;
}

export interface PersonalizedAiPlan {
  headline: string;
  outdoorVerdict: string;
  lowEmissionRoutines: {
    title: string;
    action: string;
    impactNote: string;
  }[];
  indoorProtocol: {
    title: string;
    action: string;
  }[];
}
