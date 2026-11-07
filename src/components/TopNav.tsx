"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppProvider";
import { useAuth } from "@/context/AuthProvider";
import { usePicker } from "@/context/PickerProvider";
import { CONSIDERING_SLOTS, GOLD_SLOTS, SILVER_SLOTS } from "@/lib/factors";

const LINKS = [
  { href: "/", label: "Signals" },
  { href: "/picker", label: "Interview Picker" },
];

export function TopNav() {
  const pathname = usePathname();
  const picker = pathname.startsWith("/picker");
  const { user, signOut } = useAuth();
  const { goldCount, silverCount, consideringCount, setSidebarOpen, syncError } = useApp();
  const { syncError: pickerError } = usePicker();
  const problem = syncError || pickerError;

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/70 bg-[#F6F3EE]/90 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        {picker ? null : (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open signals panel"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-stone-800 shadow-sm ring-1 ring-stone-200 lg:hidden"
          >
            <MenuIcon />
          </button>
        )}
        <Link href="/" className="hidden items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-white/80 sm:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#6E8B80] to-[#3F5C51] text-xs font-semibold text-white">
            RF
          </span>
          <span className="text-[14px] font-semibold tracking-tight text-stone-900">Residency Finder</span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((item) => {
            const active = item.href === "/" ? !picker : picker;
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
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {picker ? null : (
            <p className="hidden text-[12px] text-stone-500 md:block lg:hidden">
              <span className="font-medium text-[#8A6A2A]">
                {goldCount}/{GOLD_SLOTS} gold
              </span>
              <span className="mx-1.5 text-stone-300">·</span>
              <span className="font-medium text-stone-600">
                {silverCount}/{SILVER_SLOTS} silver
              </span>
              <span className="mx-1.5 text-stone-300">·</span>
              <span className="font-medium text-[#3F5C51]">
                {consideringCount}/{CONSIDERING_SLOTS} considering
              </span>
            </p>
          )}
          {problem ? (
            <span title={problem} className="text-[12px] font-medium text-[#8A6A2A]">
              Not saved
            </span>
          ) : null}
          <span className="hidden max-w-[180px] truncate text-[12px] text-stone-500 sm:block">
            {user?.email}
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-xl px-3 py-1.5 text-[13px] font-medium text-stone-600 transition-colors hover:bg-white hover:text-stone-900"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 4.5h10M3 8h10M3 11.5h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
