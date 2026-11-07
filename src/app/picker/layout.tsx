import type { ReactNode } from "react";

export default function PickerLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-w-0 max-w-6xl">{children}</div>;
}
