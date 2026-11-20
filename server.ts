import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

interface CityResult {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  population?: number;
}

interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
}

interface LiveAirContext {
  cityName: string;
  country?: string;
  latitude: number;
  longitude: number;
  observedAt?: string | null;
  usAqi?: number | null;
  europeanAqi?: number | null;
  pm25?: number | null;
  pm10?: number | null;
  no2?: number | null;
  o3?: number | null;
  so2?: number | null;
  co?: number | null;
  uvIndex?: number | null;
  temperatureC?: number | null;
  humidityPct?: number | null;
  windSpeedKmh?: number | null;
}

function formatMetric(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Unavailable";
  }
  return `${value} ${unit}`.trim();
}

function buildLiveContextSummary(ctx: LiveAirContext | undefined, sensitivityGroup: string): string {
  if (!ctx) {
    return `No city telemetry is currently loaded. User sensitivity profile: ${sensitivityGroup}.`;
  }
  return [
    `Selected City: ${ctx.cityName}${ctx.country ? `, ${ctx.country}` : ""} (${ctx.latitude.toFixed(3)}, ${ctx.longitude.toFixed(3)})`,
    `Observation Time: ${ctx.observedAt || "Current"}`,
    `User Sensitivity Profile: ${sensitivityGroup}`,
    `US AQI: ${ctx.usAqi ?? "Unavailable"}`,
    `European AQI: ${ctx.europeanAqi ?? "Unavailable"}`,
    `PM2.5: ${formatMetric(ctx.pm25, "µg/m³")}`,
    `PM10: ${formatMetric(ctx.pm10, "µg/m³")}`,
    `NO2 (Nitrogen Dioxide): ${formatMetric(ctx.no2, "µg/m³")}`,
    `O3 (Ozone): ${formatMetric(ctx.o3, "µg/m³")}`,
    `SO2 (Sulfur Dioxide): ${formatMetric(ctx.so2, "µg/m³")}`,
    `CO (Carbon Monoxide): ${formatMetric(ctx.co, "µg/m³")}`,
    `UV Index: ${ctx.uvIndex ?? "Unavailable"}`,
    `Temperature: ${formatMetric(ctx.temperatureC, "°C")}`,
    `Relative Humidity: ${formatMetric(ctx.humidityPct, "%")}`,
    `Wind Speed: ${formatMetric(ctx.windSpeedKmh, "km/h")}`,
  ].join("\n");
}

function extractGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("API_KEY_INVALID") || raw.includes("400")) {
    return {
      status: 400,
      message: "The configured Gemini API key appears invalid. Please verify GEMINI_API_KEY in Settings > Secrets.",
    };
  }
  if (raw.includes("PERMISSION_DENIED") || raw.includes("403")) {
    return {
      status: 403,
      message: "Gemini API access was denied. Please check your API key permissions in Settings > Secrets.",
    };
  }
  if (raw.includes("RESOURCE_EXHAUSTED") || raw.includes("429")) {
    return {
      status: 429,
      message: "Gemini API rate limit reached. Please wait a moment and try again.",
    };
  }
  if (raw.includes("NOT_FOUND") || raw.includes("404")) {
    return {
      status: 404,
      message: "The requested Gemini model was not found or is currently unavailable.",
    };
  }
  if (raw.includes("UNAVAILABLE") || raw.includes("503")) {
    return {
      status: 503,
      message: "The AI model is temporarily experiencing high demand. Please retry in a few seconds.",
    };
  }
  return {
    status: 502,
    message: `AI service error: ${raw}`,
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`503 UNAVAILABLE: ${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

let hydrogenCooldownUntil = 0;

async function generateWithFallback(
  ai: GoogleGenAI,
  buildParams: (model: string, useLowThinking: boolean) => Parameters<GoogleGenAI["models"]["generateContent"]>[0]
) {
  const now = Date.now();
  const candidates: { model: string; useLowThinking: boolean; timeoutMs: number }[] = [];

  if (now >= hydrogenCooldownUntil) {
    candidates.push({ model: "gemini-4-hydrogen", useLowThinking: true, timeoutMs: 5000 });
  }
  candidates.push({ model: "gemini-3.1-flash-lite", useLowThinking: false, timeoutMs: 15000 });
  candidates.push({ model: "gemini-2.5-flash", useLowThinking: false, timeoutMs: 15000 });

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const result = await withTimeout(
        ai.models.generateContent(buildParams(candidate.model, candidate.useLowThinking)),
        candidate.timeoutMs,
        candidate.model
      );
      return result;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (candidate.model === "gemini-4-hydrogen") {
        hydrogenCooldownUntil = Date.now() + 120_000;
      }
      const isRetryable =
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("500") ||
        msg.includes("404") ||
        msg.includes("NOT_FOUND") ||
        msg.includes("timed out");
      if (!isRetryable) {
        throw err;
      }
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Live city search via Open-Meteo Geocoding API
  app.get("/api/cities/search", async (req, res) => {
    const query = String(req.query.q ?? "").trim();
    if (query.length < 2) {
      res.status(400).json({ error: "Please enter at least 2 characters to search for a city." });
      return;
    }

    try {
      const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
      url.searchParams.set("name", query);
      url.searchParams.set("count", "8");
      url.searchParams.set("language", "en");
      url.searchParams.set("format", "json");

      const upstream = await fetch(url.toString(), {
        signal: AbortSignal.timeout(8000),
      });
      if (!upstream.ok) {
        res.status(502).json({ error: `Geocoding service returned HTTP ${upstream.status}.` });
        return;
      }

      const payload = (await upstream.json()) as { results?: CityResult[] };
      const results = (payload.results ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        country: item.country || "",
        admin1: item.admin1 || "",
        latitude: item.latitude,
        longitude: item.longitude,
        timezone: item.timezone || "auto",
        population: item.population ?? null,
      }));

      res.json({ results });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reach geocoding service.";
      res.status(502).json({ error: `Unable to search cities: ${message}` });
    }
  });

  // Reverse geocoding for browser geolocation
  app.get("/api/cities/reverse", async (req, res) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      res.status(400).json({ error: "Valid numeric lat and lon coordinates are required." });
      return;
    }

    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lon));
      url.searchParams.set("zoom", "10");
      url.searchParams.set("accept-language", "en");

      const upstream = await fetch(url.toString(), {
        headers: {
          "User-Agent": "AeroPulse-UrbanAirQualityAssistant/1.0",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(7000),
      });

      if (!upstream.ok) {
        res.json({
          city: {
            id: Math.round((lat + 90) * 10000 + (lon + 180)),
            name: `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
            country: "",
            admin1: "",
            latitude: lat,
            longitude: lon,
            timezone: "auto",
          },
        });
        return;
      }

      const data = (await upstream.json()) as {
        address?: {
          city?: string;
          town?: string;
          village?: string;
          municipality?: string;
          county?: string;
          state?: string;
          country?: string;
        };
      };
      const addr = data.address ?? {};
      const cityName =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.county ||
        `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`;

      res.json({
        city: {
          id: Math.round((lat + 90) * 10000 + (lon + 180)),
          name: cityName,
          country: addr.country || "",
          admin1: addr.state || "",
          latitude: lat,
          longitude: lon,
          timezone: "auto",
        },
      });
    } catch {
      res.json({
        city: {
          id: Math.round((lat + 90) * 10000 + (lon + 180)),
          name: `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
          country: "",
          admin1: "",
          latitude: lat,
          longitude: lon,
          timezone: "auto",
        },
      });
    }
  });

  // Live Air Quality + Weather telemetry via Open-Meteo
  app.get("/api/air-quality", async (req, res) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const timezone = String(req.query.timezone || "auto");

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({ error: "Valid latitude and longitude coordinates are required." });
      return;
    }

    try {
      const aqUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
      aqUrl.searchParams.set("latitude", String(lat));
      aqUrl.searchParams.set("longitude", String(lon));
      aqUrl.searchParams.set(
        "current",
        "us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,uv_index,ammonia"
      );
      aqUrl.searchParams.set(
        "hourly",
        "us_aqi,european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide"
      );
      aqUrl.searchParams.set("timezone", timezone);
      aqUrl.searchParams.set("forecast_days", "3");

      const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
      weatherUrl.searchParams.set("latitude", String(lat));
      weatherUrl.searchParams.set("longitude", String(lon));
      weatherUrl.searchParams.set(
        "current",
        "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code"
      );
      weatherUrl.searchParams.set("timezone", timezone);

      const [aqResp, weatherResp] = await Promise.all([
        fetch(aqUrl.toString(), { signal: AbortSignal.timeout(10000) }),
        fetch(weatherUrl.toString(), { signal: AbortSignal.timeout(10000) }),
      ]);

      if (!aqResp.ok) {
        const errText = await aqResp.text();
        res.status(502).json({
          error: `Air quality telemetry service returned HTTP ${aqResp.status}. ${errText.slice(0, 140)}`,
        });
        return;
      }

      const aqJson = (await aqResp.json()) as {
        timezone?: string;
        timezone_abbreviation?: string;
        elevation?: number;
        current?: Record<string, number | string | null>;
        hourly?: {
          time?: string[];
          us_aqi?: (number | null)[];
          european_aqi?: (number | null)[];
          pm2_5?: (number | null)[];
          pm10?: (number | null)[];
          nitrogen_dioxide?: (number | null)[];
          ozone?: (number | null)[];
          carbon_monoxide?: (number | null)[];
          sulphur_dioxide?: (number | null)[];
        };
      };

      let weatherCurrent: Record<string, number | string | null> | null = null;
      if (weatherResp.ok) {
        const weatherJson = (await weatherResp.json()) as {
          current?: Record<string, number | string | null>;
        };
        weatherCurrent = weatherJson.current ?? null;
      }

      const currentAq = aqJson.current ?? {};
      const hourly = aqJson.hourly ?? {};
      const times = hourly.time ?? [];

      const hourlySeries = times.map((time, idx) => ({
        time,
        usAqi: hourly.us_aqi?.[idx] ?? null,
        europeanAqi: hourly.european_aqi?.[idx] ?? null,
        pm25: hourly.pm2_5?.[idx] ?? null,
        pm10: hourly.pm10?.[idx] ?? null,
        no2: hourly.nitrogen_dioxide?.[idx] ?? null,
        o3: hourly.ozone?.[idx] ?? null,
        co: hourly.carbon_monoxide?.[idx] ?? null,
        so2: hourly.sulphur_dioxide?.[idx] ?? null,
      }));

      res.json({
        source: "Open-Meteo Atmospheric Composition & CAMS Forecast",
        fetchedAt: new Date().toISOString(),
        timezone: aqJson.timezone ?? timezone,
        timezoneAbbreviation: aqJson.timezone_abbreviation ?? "",
        elevation: aqJson.elevation ?? null,
        current: {
          observedAt: typeof currentAq.time === "string" ? currentAq.time : null,
          usAqi: typeof currentAq.us_aqi === "number" ? currentAq.us_aqi : null,
          europeanAqi: typeof currentAq.european_aqi === "number" ? currentAq.european_aqi : null,
          pm25: typeof currentAq.pm2_5 === "number" ? currentAq.pm2_5 : null,
          pm10: typeof currentAq.pm10 === "number" ? currentAq.pm10 : null,
          no2: typeof currentAq.nitrogen_dioxide === "number" ? currentAq.nitrogen_dioxide : null,
          o3: typeof currentAq.ozone === "number" ? currentAq.ozone : null,
          so2: typeof currentAq.sulphur_dioxide === "number" ? currentAq.sulphur_dioxide : null,
          co: typeof currentAq.carbon_monoxide === "number" ? currentAq.carbon_monoxide : null,
          dust: typeof currentAq.dust === "number" ? currentAq.dust : null,
          ammonia: typeof currentAq.ammonia === "number" ? currentAq.ammonia : null,
          uvIndex: typeof currentAq.uv_index === "number" ? currentAq.uv_index : null,
        },
        weather: weatherCurrent
          ? {
              temperatureC: typeof weatherCurrent.temperature_2m === "number" ? weatherCurrent.temperature_2m : null,
              apparentTempC:
                typeof weatherCurrent.apparent_temperature === "number" ? weatherCurrent.apparent_temperature : null,
              humidityPct:
                typeof weatherCurrent.relative_humidity_2m === "number" ? weatherCurrent.relative_humidity_2m : null,
              windSpeedKmh: typeof weatherCurrent.wind_speed_10m === "number" ? weatherCurrent.wind_speed_10m : null,
              windDirectionDeg:
                typeof weatherCurrent.wind_direction_10m === "number" ? weatherCurrent.wind_direction_10m : null,
              pressureHpa:
                typeof weatherCurrent.surface_pressure === "number" ? weatherCurrent.surface_pressure : null,
            }
          : null,
        hourly: hourlySeries,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network timeout reaching telemetry provider.";
      res.status(502).json({ error: `Failed to retrieve live air quality data: ${message}` });
    }
  });

  // AI Pollution Assistant conversational endpoint
  app.post("/api/assistant/chat", async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: "Gemini API key is not configured on the server. Please add GEMINI_API_KEY in Settings > Secrets.",
      });
      return;
    }

    const body = req.body as {
      messages?: ChatMessageInput[];
      cityContext?: LiveAirContext;
      sensitivityGroup?: string;
    };

    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (messages.length === 0) {
      res.status(400).json({ error: "At least one message is required." });
      return;
    }

    const sensitivityGroup = body.sensitivityGroup || "General Public";
    const contextBlock = buildLiveContextSummary(body.cityContext, sensitivityGroup);

    const systemInstruction = `You are AeroPulse AI, an urban air quality scientist, environmental health advisor, and sustainable mobility coach.
Your answers must be grounded in the user's LIVE city atmospheric telemetry provided below.
Never fabricate or guess pollutant readings: if a reading is marked "Unavailable", explicitly say it is unavailable from the sensor stream.
Be concise, practical, medically cautious (remind sensitive users to consult clinicians for acute symptoms), and format responses cleanly with short paragraphs or numbered action items.

LIVE ATMOSPHERIC TELEMETRY:
${contextBlock}`;

    try {
      const contents = messages.slice(-12).map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const response = await generateWithFallback(ai, (model, useLowThinking) => ({
        model,
        contents,
        config: {
          systemInstruction,
          ...(useLowThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
        },
      }));

      const reply = response.text?.trim();
      if (!reply) {
        res.status(502).json({ error: "Received an empty response from the AI model." });
        return;
      }

      res.json({ reply });
    } catch (err) {
      const parsed = extractGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  // AI Personalized Low-Emission, Indoor & Activity Plan generator
  app.post("/api/assistant/plan", async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: "Gemini API key is not configured on the server. Please add GEMINI_API_KEY in Settings > Secrets.",
      });
      return;
    }

    const body = req.body as {
      cityContext?: LiveAirContext;
      sensitivityGroup?: string;
      commuteKmPerDay?: number;
      currentTransport?: string;
      homeSetting?: string;
    };

    const sensitivityGroup = body.sensitivityGroup || "General Public";
    const commuteKm = Number.isFinite(body.commuteKmPerDay) ? Number(body.commuteKmPerDay) : 12;
    const currentTransport = body.currentTransport || "Gasoline Car";
    const homeSetting = body.homeSetting || "Urban Apartment";
    const contextBlock = buildLiveContextSummary(body.cityContext, sensitivityGroup);

    const prompt = `Generate a tailored urban air quality protection and low-emission action plan based on the real telemetry and user profile below.

${contextBlock}

USER PROFILE:
- Daily round-trip commute: ${commuteKm} km
- Current primary transport: ${currentTransport}
- Home environment: ${homeSetting}

Requirements:
1. Reference the actual observed AQI / PM2.5 / Ozone / weather conditions (never invent numbers if unavailable).
2. Provide 3 specific low-emission routine adjustments suited to this city's air quality today (e.g., if AQI is high, advise transit/masking rather than unmasked vigorous cycling; if AQI is good, encourage active mobility).
3. Provide 3 practical indoor air quality steps tailored to the home environment and outdoor PM2.5/humidity.
4. Provide a concise, actionable outdoor activity verdict and 24-hour timing strategy.`;

    try {
      const response = await generateWithFallback(ai, (model, useLowThinking) => ({
        model,
        contents: prompt,
        config: {
          systemInstruction:
            "You are an environmental health & urban sustainability specialist. Return strictly structured JSON matching the requested schema.",
          responseMimeType: "application/json",
          ...(useLowThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: {
                type: Type.STRING,
                description: "Short 1-sentence synthesis of today's air quality and key priority.",
              },
              outdoorVerdict: {
                type: Type.STRING,
                description: "Clear guidance on outdoor exercise, masking, and timing.",
              },
              lowEmissionRoutines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    action: { type: Type.STRING },
                    impactNote: { type: Type.STRING },
                  },
                  required: ["title", "action", "impactNote"],
                },
              },
              indoorProtocol: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    action: { type: Type.STRING },
                  },
                  required: ["title", "action"],
                },
              },
            },
            required: ["headline", "outdoorVerdict", "lowEmissionRoutines", "indoorProtocol"],
          },
        },
      }));

      const rawText = (response.text ?? "{}").trim();
      const parsedPlan = JSON.parse(rawText);
      res.json({ plan: parsedPlan });
    } catch (err) {
      const parsed = extractGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  // Mount Vite middleware in development or static dist in production
  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AeroPulse server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
