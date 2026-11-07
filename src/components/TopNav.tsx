"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppProvider";
import { useAuth } from "@/context/AuthProvider";
import { usePicker } from "@/context/PickerProvider";
import { specialtyLabel } from "@/lib/catalog";
import { CONSIDERING_SLOTS, GOLD_SLOTS, SILVER_SLOTS } from "@/lib/factors";

const LINKS = [
  { href: "/", label: "Signals" },
  { href: "/picker", label: "Residency Rankings" },
];

export function TopNav() {
  const pathname = usePathname();
  const picker = pathname.startsWith("/picker");
  const { user, signOut } = useAuth();
  const {
    goldCount,
    silverCount,
    consideringCount,
    setSidebarOpen,
    syncError,
    specialties,
    chooseSpecialty,
    setChooseSpecialty,
  } = useApp();
  const { syncError: pickerError } = usePicker();
  const problem = syncError || pickerError;
  const specialtyNames =
    specialties.length > 0
      ? specialties.map((name) => specialtyLabel(name)).join(", ")
      : "Choose";

  return (
    <header className="sticky top-0 z-50 border-b border-stone-300/80 bg-[#F6F3EE]/90 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label={picker ? "Open rankings panel" : "Open signals panel"}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-stone-800 shadow-sm ring-1 ring-stone-200 lg:hidden"
        >
          <MenuIcon />
        </button>
        <Link href="/" className="hidden items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-white/80 sm:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3F5C51] text-xs font-semibold text-white">
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
                onClick={() => setChooseSpecialty(false)}
                className={`inline-flex h-8 shrink-0 items-center rounded-xl border px-3 text-[13px] leading-none whitespace-nowrap transition-colors ${
                  active
                    ? "border-stone-300 bg-white font-medium text-stone-900 shadow-sm hover:border-[#E6D5A3] hover:bg-[#F3E6C0]"
                    : "border-transparent text-stone-600 hover:border-stone-200 hover:bg-white hover:text-stone-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <span className="mx-1 hidden h-5 w-px shrink-0 bg-stone-300 sm:block" aria-hidden />
        <button
          type="button"
          onClick={() => setChooseSpecialty(!chooseSpecialty)}
          title={specialtyNames}
          aria-label={`Specialty: ${specialtyNames}`}
          className={`flex h-9 shrink-0 items-center gap-2 rounded-xl border bg-white px-2.5 shadow-sm transition-colors sm:ml-2 sm:gap-2.5 sm:px-3 ${
            chooseSpecialty
              ? "border-[#C4A35A] ring-2 ring-[#C4A35A]/25"
              : "border-stone-300 hover:border-[#C4A35A]"
          }`}
        >
          <span className="shrink-0 text-[11px] font-semibold tracking-[0.14em] text-[#8A6A2A] uppercase">
            Specialty
          </span>
          <span
            className={`max-w-[9rem] truncate text-[13px] sm:max-w-[14rem] lg:max-w-[18rem] ${
              specialties.length > 0 ? "font-semibold text-stone-900" : "font-medium text-stone-400"
            }`}
          >
            {specialtyNames}
          </span>
          <ChevronIcon />
        </button>
        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          {picker ? null : (
            <p className="hidden shrink-0 text-[12px] text-stone-500 md:block lg:hidden">
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
            <span title={problem} className="shrink-0 text-[12px] font-medium text-[#8A6A2A]">
              Not saved
            </span>
          ) : null}
          <span className="hidden min-w-0 shrink truncate text-[12px] text-stone-500 lg:block">
            {user?.email}
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="hidden h-8 shrink-0 items-center rounded-xl border border-transparent px-3 text-[13px] leading-none font-medium whitespace-nowrap text-stone-600 transition-colors hover:border-stone-200 hover:bg-white hover:text-stone-900 lg:inline-flex"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-stone-400">
      <path d="M4.5 6.5 8 10l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
