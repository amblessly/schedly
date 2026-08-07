"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "0 1.5rem",
            textAlign: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
            backgroundColor: "#fff7fb",
            color: "#1a1416",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
              color: "#fff",
              background:
                "linear-gradient(135deg, var(--primary, #ec4899), color-mix(in srgb, var(--primary, #ec4899) 60%, #a21caf))",
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ maxWidth: 360, fontSize: 14, lineHeight: 1.6, color: "#71717a", margin: 0 }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              border: 0,
              borderRadius: 9999,
              padding: "0.75rem 1.75rem",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background:
                "linear-gradient(135deg, var(--primary, #ec4899), color-mix(in srgb, var(--primary, #ec4899) 60%, #a21caf))",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}