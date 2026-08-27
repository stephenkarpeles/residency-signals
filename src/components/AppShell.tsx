"use client";

import { SignalSidebar } from "@/components/SignalSidebar";
import { ProgramModal } from "@/components/ProgramModal";
import { DndRoot } from "@/components/DndRoot";
import { AppProvider, useApp } from "@/context/AppProvider";
import { CONSIDERING_SLOTS, GOLD_SLOTS, SILVER_SLOTS } from "@/lib/factors";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <DndRoot>
        <Shell>{children}</Shell>
        <ProgramModal />
      </DndRoot>
    </AppProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { goldCount, silverCount, consideringCount, setSidebarOpen } = useApp();

  return (
    <div className="min-h-screen bg-[#F6F3EE] text-stone-900">
      <SignalSidebar />
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-stone-200/70 bg-[#F6F3EE]/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open signals panel"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-stone-800 shadow-sm ring-1 ring-stone-200"
        >
          <MenuIcon />
        </button>
        <p className="text-[13px] text-stone-500">
          <span className="font-medium text-[#8A6A2A]">{goldCount}/{GOLD_SLOTS} gold</span>
          <span className="mx-1.5 text-stone-300">·</span>
          <span className="font-medium text-stone-600">{silverCount}/{SILVER_SLOTS} silver</span>
          <span className="mx-1.5 text-stone-300">·</span>
          <span className="font-medium text-[#3F5C51]">{consideringCount}/{CONSIDERING_SLOTS} considering</span>
        </p>
      </header>
      <main className="px-4 py-8 sm:px-8 lg:pl-[332px] lg:pr-10 lg:py-10">{children}</main>
    </div>
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
