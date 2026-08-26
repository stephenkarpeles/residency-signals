import type { Metadata, Viewport } from "next";
import { Work_Sans } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Signal Board · OB/GYN Residency",
  description:
    "Compare OB/GYN residency programs and choose 3 gold and 15 silver signals.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#F6F3EE",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${workSans.variable} h-full antialiased`}
      style={{ colorScheme: "light only" }}
    >
      <body className="min-h-full bg-[#F6F3EE] font-sans text-stone-900">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
