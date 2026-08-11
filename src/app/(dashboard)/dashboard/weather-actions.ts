"use server";

import { auth } from "@/server/lib/auth";
import { headers } from "next/headers";
import { checkRateLimitDb } from "@/server/lib/security";
import { db } from "@/server/db/client";

const WEATHER_MAX = 30;
const WEATHER_WINDOW_MS = 60 * 60 * 1000;

export type WeatherResult =
  | { success: true; data: WeatherData }
  | { success: false; error: string };

export type WeatherData = {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  sunrise: number;
  sunset: number;
  timezone: number;
};

function getWeatherIcon(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

async function fetchWeather(
  lat: number,
  lon: number,
  apiKey: string
): Promise<WeatherData | null> {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    city: data.name,
    country: data.sys.country,
    temperature: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    description: data.weather[0]?.description || "Clear",
    icon: getWeatherIcon(data.weather[0]?.icon || "01d"),
    windSpeed: Math.round(data.wind.speed * 3.6),
    sunrise: data.sys.sunrise,
    sunset: data.sys.sunset,
    timezone: data.timezone,
  };
}

export async function getWeatherByCoords(
  lat: number,
  lon: number
): Promise<WeatherResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  const rate = await checkRateLimitDb(
    `weather:${session.user.id}`,
    WEATHER_MAX,
    WEATHER_WINDOW_MS,
  );
  if (!rate.allowed) {
    return { success: false, error: "Too many weather requests. Try again later." };
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Weather service not configured" };
  }

  try {
    const weather = await fetchWeather(lat, lon, apiKey);
    if (!weather) {
      return { success: false, error: "Failed to fetch weather data" };
    }

    return { success: true, data: weather };
  } catch (err) {
    console.error("[WEATHER]", err);
    return { success: false, error: "Could not fetch weather. Please try again." };
  }
}

function getClientIp(h: Headers): string | null {
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

// Best-effort IP geolocation with a fallback chain. The browser geolocation
// path (getWeatherByCoords) is preferred — this runs only when that permission
// is missing. We never show weather for a location the user isn't in, so a
// failed lookup ends as an honest error instead of a wrong hardcoded city.
async function locateByIp(clientIp: string | null): Promise<{ lat: number; lon: number } | null> {
  const targets = clientIp
    ? [
        `https://ipwho.is/${encodeURIComponent(clientIp)}`,
        `http://ip-api.com/json/${encodeURIComponent(clientIp)}?fields=status,lat,lon`,
      ]
    : ["https://ipwho.is/", "http://ip-api.com/json/?fields=status,lat,lon"];

  for (const url of targets) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const lat = data.latitude ?? data.lat;
      const lon = data.longitude ?? data.lon;
      if (typeof lat === "number" && typeof lon === "number") {
        return { lat, lon };
      }
    } catch {
      // Try the next service.
    }
  }
  return null;
}

// Locate the city the user entered in their profile (if any) via OpenWeather's
// free geocoding API.
async function locateByCity(city: string, apiKey: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 86_400 } });
    if (!res.ok) return null;
    const list = (await res.json()) as Array<{ lat: number; lon: number }>;
    const first = Array.isArray(list) ? list[0] : null;
    if (first && typeof first.lat === "number" && typeof first.lon === "number") {
      return { lat: first.lat, lon: first.lon };
    }
  } catch {
    // Fall through to the honest error below.
  }
  return null;
}

// IP-based fallback — approximate location from the CLIENT's IP (taken from the
// request headers), used when the browser denies geolocation permission.
export async function getWeatherByIp(): Promise<WeatherResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Unauthorized" };

  const rate = await checkRateLimitDb(
    `weather:${session.user.id}`,
    WEATHER_MAX,
    WEATHER_WINDOW_MS,
  );
  if (!rate.allowed) {
    return { success: false, error: "Too many weather requests. Try again later." };
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Weather service not configured" };
  }

  try {
    const h = await headers();
    const clientIp = getClientIp(h);

    // 1) Best effort from the client's IP (multi-service chain).
    const ipLoc = await locateByIp(clientIp);
    if (ipLoc) {
      const weather = await fetchWeather(ipLoc.lat, ipLoc.lon, apiKey);
      if (weather) return { success: true, data: weather };
    }

    // 2) Fall back to the city the user saved in their profile.
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { city: true },
    });
    if (user?.city) {
      const cityLoc = await locateByCity(user.city, apiKey);
      if (cityLoc) {
        const weather = await fetchWeather(cityLoc.lat, cityLoc.lon, apiKey);
        if (weather) return { success: true, data: weather };
      }
    }

    // 3) Honest failure — never show weather for a place the user isn't in.
    return {
      success: false,
      error: "Could not detect your location. Allow location access, or set your city in Profile.",
    };
  } catch (err) {
    console.error("[WEATHER_IP]", err);
    return { success: false, error: "Could not fetch weather. Please try again." };
  }
}