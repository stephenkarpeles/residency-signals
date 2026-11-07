import { PickerNav } from "@/components/picker/PickerNav";
import type { ReactNode } from "react";

export default function PickerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl">
      <PickerNav />
      <div className="mt-8">{children}</div>
    </div>
  );
}
