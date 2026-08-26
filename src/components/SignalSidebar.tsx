"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppProvider";
import { CONSIDERING_SLOTS, GOLD_SLOTS, SILVER_SLOTS } from "@/lib/factors";
import { SignalSlot } from "@/components/SignalSlot";
import type { SignalTier } from "@/lib/types";

const NAV = [
  { href: "/", label: "Explore Programs" },
  { href: "/selections", label: "My Current Selections" },
  { href: "/factors", label: "Important Factors" },
];

export function SignalSidebar() {
  const { selections, goldCount, silverCount, consideringCount, sidebarOpen, setSidebarOpen } =
    useApp();
  const pathname = usePathname();

  return (
    <>
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close signals panel"
          className="fixed inset-0 z-30 bg-stone-900/25 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[300px] flex-col border-r border-stone-200/80 bg-[#FBF9F6] transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8C872] to-[#C4A35A] text-sm font-semibold text-white shadow-sm">
              OB
            </span>
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-stone-900">
                Signal Board
              </p>
              <p className="text-[11px] text-stone-500">OB/GYN 2027 Match</p>
            </div>
          </Link>
          <button
            type="button"
            className="rounded-xl p-2 text-stone-500 hover:bg-stone-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="space-y-1 px-3">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`block rounded-xl px-3 py-2 text-[13px] transition-colors ${
                  active
                    ? "bg-white font-medium text-stone-900 shadow-sm ring-1 ring-stone-200/70"
                    : "text-stone-600 hover:bg-white/70 hover:text-stone-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 flex-1 space-y-5 overflow-y-auto px-3 pt-1 pb-6">
          <SlotGroup
            tier="gold"
            title="Gold signals"
            count={goldCount}
            max={GOLD_SLOTS}
            ids={selections.gold}
          />
          <SlotGroup
            tier="silver"
            title="Silver signals"
            count={silverCount}
            max={SILVER_SLOTS}
            ids={selections.silver}
          />
          <SlotGroup
            tier="considering"
            title="Considering"
            count={consideringCount}
            max={CONSIDERING_SLOTS}
            ids={selections.considering}
          />
        </div>
      </aside>
    </>
  );
}

function SlotGroup({
  tier,
  title,
  count,
  max,
  ids,
}: {
  tier: SignalTier;
  title: string;
  count: number;
  max: number;
  ids: (string | null)[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${tier}-group` });
  const { over } = useDndContext();
  const gold = tier === "gold";
  const considering = tier === "considering";
  const overId = typeof over?.id === "string" ? over.id : "";
  const highlighted =
    isOver || overId === `${tier}-group` || new RegExp(`^${tier}-\\d+$`).test(overId);

  return (
    <section
      ref={setNodeRef}
      className={`rounded-2xl p-3 transition-colors ${
        highlighted
          ? gold
            ? "bg-[#F3E6C0] ring-2 ring-inset ring-[#C4A35A]"
            : considering
              ? "bg-[#DCE8E2] ring-2 ring-inset ring-[#3F5C51]"
              : "bg-stone-200/70 ring-2 ring-inset ring-stone-400"
          : gold
            ? "bg-[#F7F1E1]/70"
            : considering
              ? "bg-[#F3F7F5]"
              : "bg-white/60"
      }`}
    >
      <div className="mb-2.5 flex items-baseline justify-between px-0.5">
        <h2
          className={`text-[11px] font-semibold tracking-[0.14em] uppercase ${
            gold ? "text-[#8A6A2A]" : considering ? "text-[#3F5C51]" : "text-stone-500"
          }`}
        >
          {title}
        </h2>
        <span
          className={`text-[11px] tabular-nums ${
            gold ? "text-[#8A6A2A]" : considering ? "text-[#3F5C51]" : "text-stone-500"
          }`}
        >
          {count}/{max}
        </span>
      </div>
      <div className="space-y-1.5">
        {ids.map((id, index) => (
          <SignalSlot key={`${tier}-${index}`} tier={tier} index={index} programId={id} />
        ))}
      </div>
    </section>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
