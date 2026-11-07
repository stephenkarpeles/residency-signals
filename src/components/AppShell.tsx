"use client";

import { SignalSidebar } from "@/components/SignalSidebar";
import { ProgramModal } from "@/components/ProgramModal";
import { DndRoot } from "@/components/DndRoot";
import { TopNav } from "@/components/TopNav";
import { AuthScreen, LoadingScreen, SetupScreen } from "@/components/AuthScreen";
import { AppProvider, useApp } from "@/context/AppProvider";
import { AuthProvider, useAuth } from "@/context/AuthProvider";
import { PickerProvider, usePicker } from "@/context/PickerProvider";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Gate>{children}</Gate>
    </AuthProvider>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const { ready, configured, user } = useAuth();
  if (!ready) return <LoadingScreen />;
  if (!configured) return <SetupScreen />;
  if (!user) return <AuthScreen />;
  return (
    <AppProvider userId={user.id}>
      <PickerProvider userId={user.id}>
        <ReadyShell>{children}</ReadyShell>
      </PickerProvider>
    </AppProvider>
  );
}

function ReadyShell({ children }: { children: ReactNode }) {
  const { hydrated } = useApp();
  const { hydrated: pickerReady } = usePicker();
  if (!hydrated || !pickerReady) return <LoadingScreen label="Loading your board…" />;
  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const picker = pathname.startsWith("/picker");

  return (
    <div className="min-h-screen bg-[#F6F3EE] text-stone-900">
      <TopNav />
      {picker ? (
        <main className="px-4 py-8 sm:px-8">{children}</main>
      ) : (
        <DndRoot>
          <SignalSidebar />
          <main className="px-4 py-8 sm:px-8 lg:py-10 lg:pr-10 lg:pl-[332px]">{children}</main>
          <ProgramModal />
        </DndRoot>
      )}
    </div>
  );
}
