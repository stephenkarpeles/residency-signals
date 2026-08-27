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
          className="rounded-xl bg-white px-3 py-2 text-[13px] font-medium shadow-sm ring-1 ring-stone-200"
        >
          Signals
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
