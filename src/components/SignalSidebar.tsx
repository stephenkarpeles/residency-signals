"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/context/AppProvider";
import { CONSIDERING_SLOTS, GOLD_SLOTS, SILVER_SLOTS } from "@/lib/factors";
import { AccountMenu } from "@/components/AccountMenu";
import { SignalSlot } from "@/components/SignalSlot";
import type { SignalTier } from "@/lib/types";

const NAV = [
  { href: "/", label: "Explore Programs" },
  { href: "/selections", label: "My Current Selections" },
  { href: "/factors", label: "Important Factors" },
];

export function SignalSidebar() {
  const {
    selections,
    goldCount,
    silverCount,
    consideringCount,
    sidebarOpen,
    setSidebarOpen,
  } = useApp();
  const pathname = usePathname();
  const [listScrolled, setListScrolled] = useState(false);

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
        className={`fixed top-14 bottom-0 left-0 z-40 flex w-[300px] flex-col border-r border-stone-200/80 bg-[#FBF9F6] transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-stone-300/80 bg-stone-200 px-5 py-4">
          <h2 className="px-1.5 text-[15px] font-semibold tracking-tight text-stone-900">
            Signals
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

        <div
          className={`mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pt-1 pb-6 ${
            listScrolled ? "border-t border-stone-300/90" : "border-t border-transparent"
          }`}
          onScroll={(event) => {
            const next = event.currentTarget.scrollTop > 2;
            setListScrolled((prev) => (prev === next ? prev : next));
          }}
        >
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
        <AccountMenu />
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
        <SortableContext
          items={ids.map((_, index) => `${tier}-${index}`)}
          strategy={verticalListSortingStrategy}
        >
          {ids.map((id, index) => (
            <SignalSlot key={`${tier}-${index}`} tier={tier} index={index} programId={id} />
          ))}
        </SortableContext>
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
