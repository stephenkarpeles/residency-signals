"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/picker/board", label: "Dashboard" },
  { href: "/picker", label: "Interviews" },
  { href: "/picker/rank", label: "Rank" },
  { href: "/picker/weights", label: "Weights" },
];

export function PickerNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {LINKS.map((item) => {
        const active = item.href === "/picker" ? pathname === "/picker" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-3 py-1.5 text-[13px] transition-colors ${
              active
                ? "bg-white font-medium text-stone-900 shadow-sm ring-1 ring-stone-200/70 hover:bg-[#F3E6C0] hover:ring-[#E6D5A3]"
                : "text-stone-600 hover:bg-white hover:text-stone-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
