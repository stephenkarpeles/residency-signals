import type { Metadata } from "next";
import { InstagramView } from "@/components/InstagramView";

export const metadata: Metadata = {
  title: "Instagram handles · private",
  robots: { index: false, follow: false },
};

export default function InstagramPage() {
  return <InstagramView />;
}
