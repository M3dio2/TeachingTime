import { ImageResponse } from "next/og";

// The home-screen icon on iPhones and iPads: the "T" tile of app/icon.svg.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#3B2A1E", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 90, height: 96, display: "flex" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 90, height: 25, borderRadius: 8, background: "#F4D35E" }} />
          <div style={{ position: "absolute", left: 32.5, top: 0, width: 25, height: 96, borderRadius: 8, background: "#F4D35E" }} />
        </div>
      </div>
    ),
    size,
  );
}
