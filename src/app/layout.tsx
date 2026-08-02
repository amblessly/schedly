import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Warmup } from "@/components/warmup";
import { CopyProtection } from "@/components/copy-protection";
import { InstallPrompt } from "@/components/install-prompt";
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
  title: "Schedly",
  description: "Smart schedule management",
  applicationName: "Schedly",
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
  maximumScale: 5,
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Warmup />
        <CopyProtection />
        <InstallPrompt />
        <ThemeProvider initialThemeId={initialThemeId}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
