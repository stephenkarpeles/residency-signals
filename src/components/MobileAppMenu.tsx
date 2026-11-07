"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppProvider";

const SECTIONS = [
  { href: "/", label: "Signals" },
  { href: "/picker", label: "Residency Rankings" },
];

export function MobileAppMenu() {
  const pathname = usePathname();
  const picker = pathname.startsWith("/picker");
  const { setSidebarOpen, setChooseSpecialty } = useApp();

  function close() {
    setSidebarOpen(false);
    setChooseSpecialty(false);
  }

  return (
    <div className="border-b border-stone-300/80 lg:hidden">
      <div className="flex items-center justify-between bg-stone-200 px-5 py-4">
        <div className="flex items-center gap-2 px-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-[#3F5C51] text-xs font-semibold text-white">
            RF
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-stone-900">Residency Finder</span>
        </div>
        <button
          type="button"
          className="rounded-xl p-2 text-stone-500 hover:bg-stone-100"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close"
        >
          <CloseIcon />
        </button>
      </div>
      <nav className="space-y-1 px-3 py-3">
        {SECTIONS.map((item) => {
          const active = item.href === "/" ? !picker : picker;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={`block rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                active
                  ? "bg-stone-200/80 font-medium text-stone-900"
                  : "text-stone-600 hover:bg-stone-200/50 hover:text-stone-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
