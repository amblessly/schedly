import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { siteConfig } from "@/config/site";
import { Warmup } from "@/components/warmup";
import { CopyProtection } from "@/components/copy-protection";
import { InstallPrompt } from "@/components/install-prompt";
import { ZoomLock } from "@/components/zoom-lock";
import { ThemeProvider } from "@/features/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Schedly — AI-Powered Student Planner",
    template: "%s · Schedly",
  },
  description: siteConfig.description,
  applicationName: "Schedly",
  keywords: [
    "student planner",
    "class schedule",
    "timetable",
    "AI schedule",
    "college planner",
    "school app",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: "Schedly",
    title: "Schedly — AI-Powered Student Planner",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Schedly — AI-Powered Student Planner",
    description: siteConfig.description,
  },
  icons: {
    icon: "/images/logo.jpg",
    apple: "/images/logo.jpg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Schedly",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdeef0" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1416" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialThemeId = cookieStore.get("schedly-theme")?.value;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta
          name="google-site-verification"
          content="IO2A9lf6gXvDGTZN9Lc6hj6Zk1WIoDqojV9OJgCyjC4"
        />
        {/* Applies the zoom-lock before first paint, so refreshes don't flash
            the page at the browser's raw zoom level. Same math as ZoomLock —
            on native (Capacitor) the runtime is injected before this script. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())return;var o=window.outerWidth,i=window.innerWidth;var z=o&&i?o/i:1;var c=0.9/Math.max(0.1,z);c=Math.min(1.5,Math.max(0.5,c));var s=Math.abs(c-1)<0.001?"":c.toFixed(4);var h=document.documentElement;if(h.style.zoom!==s)h.style.zoom=s;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Warmup />
        <CopyProtection />
        <InstallPrompt />
        <ZoomLock />
        <ThemeProvider initialThemeId={initialThemeId}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
