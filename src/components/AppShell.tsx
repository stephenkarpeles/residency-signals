"use client";

import { SignalSidebar } from "@/components/SignalSidebar";
import { SpecialtyPicker } from "@/components/SpecialtyPicker";
import { PickerNav } from "@/components/picker/PickerNav";
import { ProgramModal } from "@/components/ProgramModal";
import { DndRoot } from "@/components/DndRoot";
import { TopNav } from "@/components/TopNav";
import { AuthScreen, LoadingScreen, SetupScreen } from "@/components/AuthScreen";
import { AppProvider, useApp } from "@/context/AppProvider";
import { AuthProvider, useAuth } from "@/context/AuthProvider";
import { PickerProvider, usePicker } from "@/context/PickerProvider";
import { OBGYN_SPECIALTY, isEnrichedProgram } from "@/lib/programs";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";

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
  const { specialties, chooseSpecialty } = useApp();
  const needsSpecialty = specialties.length === 0;
  const content = needsSpecialty ? <SpecialtyPrompt /> : children;

  return (
    <div className="min-h-screen bg-[#F6F3EE] text-stone-900">
      <TopNav />
      {picker ? (
        <>
          <PickerNav />
          <main className="px-4 py-8 sm:px-8 lg:py-10 lg:pr-10 lg:pl-[332px]">{content}</main>
        </>
      ) : (
        <DndRoot>
          <SignalSidebar />
          <main className="px-4 py-8 sm:px-8 lg:py-10 lg:pr-10 lg:pl-[332px]">{content}</main>
          <ProgramModal />
        </DndRoot>
      )}
      {chooseSpecialty && !needsSpecialty ? <SpecialtyOverlay /> : null}
    </div>
  );
}

function useSpecialtyInitial() {
  const { specialties, selections } = useApp();
  return useMemo(() => {
    if (specialties.length > 0) return specialties;
    const ids = [...selections.gold, ...selections.silver, ...selections.considering].filter(
      (id): id is string => Boolean(id),
    );
    if (ids.some((id) => isEnrichedProgram(id))) return [OBGYN_SPECIALTY];
    return [];
  }, [selections, specialties]);
}

function SpecialtyPrompt() {
  const initial = useSpecialtyInitial();
  const { setSpecialties } = useApp();
  return (
    <SpecialtyPicker key={initial.join("|") || "new"} initial={initial} onSave={setSpecialties} />
  );
}

function SpecialtyOverlay() {
  const { specialties, setSpecialties, setChooseSpecialty } = useApp();
  const initial = useSpecialtyInitial();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setChooseSpecialty(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setChooseSpecialty]);

  return (
    <div className="fixed top-14 right-0 bottom-0 left-0 z-[45] overflow-y-auto bg-[#F6F3EE] px-4 py-8 sm:px-8 lg:left-[300px] lg:py-10 lg:pr-10 lg:pl-8">
      <SpecialtyPicker
        key={specialties.join("|")}
        autoFocus
        initial={initial}
        onSave={setSpecialties}
        onCancel={() => setChooseSpecialty(false)}
      />
    </div>
  );
}
