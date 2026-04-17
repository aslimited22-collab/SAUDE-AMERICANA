"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#f8fafb",
          color: "#0a2540",
          padding: "24px",
          margin: 0,
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <p
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              fontSize: 12,
              fontWeight: 600,
              color: "#b91c1c",
              margin: 0,
            }}
          >
            Critical error
          </p>
          <h1
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            SlimRx is temporarily unavailable
          </h1>
          <p
            style={{
              marginTop: 12,
              fontSize: 14,
              color: "#475569",
            }}
          >
            Please reload the page. If this keeps happening, email{" "}
            <a href="mailto:support@slimrx.com">support@slimrx.com</a>.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#94a3b8",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "10px 20px",
              borderRadius: 12,
              backgroundColor: "#0a2540",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
