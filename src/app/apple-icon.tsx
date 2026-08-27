import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #E8C872 0%, #C4A35A 100%)",
          color: "white",
          fontSize: 78,
          fontWeight: 700,
          letterSpacing: "-0.06em",
        }}
      >
        OB
      </div>
    ),
    { ...size },
  );
}
