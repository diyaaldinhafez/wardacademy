import { ImageResponse } from "next/og";

/**
 * Social share card (WhatsApp, Twitter, etc.) — generated at the edge.
 * White Platycodon flower + wordmark on the brand purple gradient.
 * Latin wordmark only (Satori has no bundled Arabic font).
 */
export const alt = "Ward Academy — Confident English, teacher-led & AI-supported";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PETAL =
  "M50,50 C38,46 30,34 33,22 C35,12 42,6 50,2 C58,6 65,12 67,22 C70,34 62,46 50,50 Z";

const flowerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="190" height="190">
  <g fill="#FFFFFF">
    ${[0, 72, 144, 216, 288]
      .map((d) => `<path d="${PETAL}" transform="rotate(${d} 50 50)"/>`)
      .join("")}
  </g>
  <circle cx="50" cy="50" r="9" fill="#C8ABFF"/>
  <circle cx="50" cy="50" r="3.5" fill="#3D2371"/>
</svg>`;

const flowerDataUri = `data:image/svg+xml;base64,${Buffer.from(flowerSvg).toString("base64")}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          backgroundImage: "linear-gradient(135deg, #9f7de7 0%, #6840bd 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={flowerDataUri} width={190} height={190} alt="" />
        <div style={{ fontSize: 78, fontWeight: 800, color: "#FFFFFF", letterSpacing: -1 }}>
          Ward Academy
        </div>
        <div style={{ fontSize: 32, fontWeight: 600, color: "#E9DEFF" }}>
          Confident English · teacher-led &amp; AI-supported
        </div>
        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.16)",
            color: "#FFFFFF",
            fontSize: 26,
            fontWeight: 700,
            padding: "10px 26px",
            borderRadius: 999,
          }}
        >
          Free trial · Ages 8–15
        </div>
      </div>
    ),
    { ...size },
  );
}
