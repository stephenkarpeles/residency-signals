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
          background: "linear-gradient(135deg, #6E8B80 0%, #3F5C51 100%)",
          color: "white",
          fontSize: 78,
          fontWeight: 700,
          letterSpacing: "-0.06em",
        }}
      >
        RF
      </div>
    ),
    { ...size },
  );
}
