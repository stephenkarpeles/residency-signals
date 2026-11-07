"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import { useApp } from "@/context/AppProvider";

const LINKS = [
  { href: "/picker/board", label: "Dashboard" },
  { href: "/picker", label: "Interviews" },
  { href: "/picker/rank", label: "Rank" },
  { href: "/picker/weights", label: "Weights" },
];

export function PickerNav() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useApp();

  return (
    <>
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close rankings panel"
          className="fixed inset-0 z-30 bg-stone-900/25 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed top-14 bottom-0 left-0 z-40 flex w-[300px] flex-col border-r border-stone-200/80 bg-[#FBF9F6] transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-stone-300/80 bg-stone-200 px-5 py-4">
          <h2 className="px-1.5 text-[15px] font-semibold tracking-tight text-stone-900">
            Residency Rankings
          </h2>
          <button
            type="button"
            className="rounded-xl p-2 text-stone-500 hover:bg-stone-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="space-y-1 px-3 pt-3">
          {LINKS.map((item) => {
            const active =
              item.href === "/picker" ? pathname === "/picker" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
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
        <div className="mt-3 border-t border-stone-300/80" />
        <AccountMenu />
      </aside>
    </>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
