import { ImageResponse } from "next/og";

export const alt = "SlabVaultFi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #07040c 0%, #1a0f2e 45%, #07040c 100%)",
          color: "white",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
        }}
      >
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1.05,
          }}
        >
          SlabVaultFi
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 30,
            opacity: 0.92,
            maxWidth: 980,
            textAlign: "center",
            lineHeight: 1.25,
          }}
        >
          Community-owned collectible vault — live pulls, graded slabs,
          transparent treasury
        </div>
        <div
          style={{
            marginTop: 26,
            fontSize: 22,
            opacity: 0.75,
          }}
        >
          $SVF
        </div>
      </div>
    ),
    size,
  );
}
