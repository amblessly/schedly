"use server";

import { auth } from "@/server/lib/auth";
import { headers } from "next/headers";
import { checkRateLimitDb } from "@/server/lib/security";

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