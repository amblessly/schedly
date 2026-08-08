import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/schedule",
        "/todo",
        "/notifications",
        "/pomodoro",
        "/notes",
        "/gpa",
        "/upload",
        "/design",
        "/settings",
        "/feedback",
        "/admin",
        "/onboarding",
        "/verify",
        "/forgot-password",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}