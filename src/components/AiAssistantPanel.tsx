import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Bot, Loader2, RotateCcw, Send, User } from "lucide-react";
import type { AirQualityPayload, ChatMessage, CityOption, SensitivityGroup } from "../types/airQuality";

interface AiAssistantPanelProps {
  city: CityOption;
  data: AirQualityPayload | null;
  sensitivity: SensitivityGroup;
  queuedPrompt: string | null;
  onConsumeQueuedPrompt: () => void;
}

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  city,
  data,
  sensitivity,
  queuedPrompt,
  onConsumeQueuedPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I am AeroPulse AI, connected to your selected city's live atmospheric telemetry. Ask me to interpret current AQI and pollutant levels, plan safe outdoor exercise windows, optimize indoor air quality, or design low-emission daily commutes.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const nextHistory = [...messages.filter((m) => !m.isError), userMsg];
    setMessages(nextHistory);
    setInput("");
    setSending(true);

    try {
      const resp = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextHistory
            .filter((m) => !m.isError)
            .map((m) => ({ role: m.role, content: m.content })),
          sensitivityGroup: sensitivity,
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
        }),
      });

      const rawText = await resp.text();
      let json: { reply?: string; error?: string } | null = null;
      try {
        json = JSON.parse(rawText) as { reply?: string; error?: string };
      } catch {
        json = null;
      }
      if (!resp.ok || !json?.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: json?.error || `Unable to receive a response from the AI assistant (HTTP ${resp.status}).`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isError: true,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: json.reply!,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Network error reaching the AI service. Please verify your connection and retry.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (queuedPrompt && queuedPrompt.trim()) {
      const prompt = queuedPrompt;
      onConsumeQueuedPrompt();
      void sendMessage(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedPrompt]);

  const starterPrompts = [
    `Explain ${city.name}'s current AQI and which pollutant is most concerning right now.`,
    `Should I open my windows or run an air purifier in ${city.name} today?`,
    `Suggest a low-emission commute & outdoor exercise routine for ${sensitivity}.`,
    `How do PM2.5 and NO₂ affect respiratory health over time?`,
  ];

  const handleReset = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: `Conversation reset. Live telemetry for ${city.name} (US AQI: ${data?.current.usAqi ?? "Unavailable"}) is attached. How can I help?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Attached Live Context + Quick Prompts */}
      <aside className="space-y-4 lg:col-span-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Live Telemetry Context
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Automatically grounded in every AI response
          </p>

          <dl className="mt-4 space-y-2.5 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">City</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{city.name}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">Sensitivity</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{sensitivity}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">US AQI</dt>
              <dd className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {data?.current.usAqi ?? "Unavailable"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">PM₂.₅</dt>
              <dd className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {data?.current.pm25 !== null && data?.current.pm25 !== undefined
                  ? `${data.current.pm25.toFixed(1)} µg/m³`
                  : "Unavailable"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">PM₁₀</dt>
              <dd className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {data?.current.pm10 !== null && data?.current.pm10 !== undefined
                  ? `${data.current.pm10.toFixed(1)} µg/m³`
                  : "Unavailable"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">NO₂ / O₃</dt>
              <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {data?.current.no2 !== null && data?.current.no2 !== undefined
                  ? `${data.current.no2.toFixed(1)}`
                  : "—"}{" "}
                /{" "}
                {data?.current.o3 !== null && data?.current.o3 !== undefined
                  ? `${data.current.o3.toFixed(1)} µg/m³`
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Suggested Questions
          </h3>
          <div className="mt-3 space-y-2">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={sending}
                onClick={() => sendMessage(prompt)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs leading-snug text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50/60 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-sky-700 dark:hover:bg-slate-800"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Right: Conversational Chat Window */}
      <div className="flex h-[460px] flex-col rounded-xl border border-slate-200 bg-white sm:h-[560px] lg:col-span-8 lg:h-[600px] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Bot className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              AI Pollution &amp; Health Assistant
            </h2>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex whitespace-nowrap shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Chat</span>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                    msg.isError
                      ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400"
                      : "border-slate-200 bg-slate-50 text-sky-600 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-400"
                  }`}
                >
                  {msg.isError ? <AlertCircle className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed break-words sm:max-w-[82%] ${
                  msg.role === "user"
                    ? "bg-slate-900 text-white dark:bg-sky-600"
                    : msg.isError
                    ? "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                    : "border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <span
                    className={`font-mono text-[10px] ${
                      msg.role === "user" ? "text-slate-300 dark:text-sky-100" : "text-slate-400"
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                  {msg.isError && (
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => {
                        const lastUser = [...messages].reverse().find((m) => m.role === "user");
                        if (lastUser) void sendMessage(lastUser.content);
                      }}
                      className="rounded border border-rose-300 bg-white px-2 py-0.5 text-[11px] font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sky-600 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-400">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-400">
                Analyzing {city.name} air quality telemetry...
              </div>
            </div>
          )}
          <div ref={scrollEndRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
          className="border-t border-slate-200 p-4 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <label htmlFor="ai-chat-input" className="sr-only">
              Ask the AI Pollution Assistant
            </label>
            <input
              id="ai-chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              placeholder={`Ask about ${city.name}'s air quality, health protection, or eco-commutes...`}
              className="h-11 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-900"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex h-11 whitespace-nowrap shrink-0 items-center gap-2 rounded-lg bg-sky-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
