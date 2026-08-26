"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addSuggestedFactor,
  defaultWeights,
  GOLD_SLOTS,
  CONSIDERING_SLOTS,
  normalizeWeights,
  removeFactor,
  setWeightKeepingTotal,
  SILVER_SLOTS,
} from "@/lib/factors";
import { getProgram } from "@/lib/programs";
import { matchScore } from "@/lib/scoring";
import {
  emptySelections,
  loadSelections,
  loadWeights,
  normalizeSelections,
  saveSelections,
  saveWeights,
} from "@/lib/storage";
import type { FactorId, Program, Selections, SignalTier, Weights } from "@/lib/types";

type AppState = {
  hydrated: boolean;
  selections: Selections;
  weights: Weights;
  sidebarOpen: boolean;
  detailId: string | null;
  setSidebarOpen: (open: boolean) => void;
  setDetailId: (id: string | null) => void;
  setWeight: (id: FactorId, value: number) => void;
  addFactor: (id: FactorId) => void;
  dropFactor: (id: FactorId) => void;
  resetWeights: () => void;
  assign: (programId: string, tier: SignalTier, index?: number) => boolean;
  unassign: (programId: string) => void;
  clearAll: () => void;
  findSlot: (programId: string) => { tier: SignalTier; index: number } | null;
  goldCount: number;
  silverCount: number;
  consideringCount: number;
};

const AppContext = createContext<AppState | null>(null);

function withoutProgram(selections: Selections, programId: string): Selections {
  const current = normalizeSelections(selections);
  return {
    gold: current.gold.map((id) => (id === programId ? null : id)),
    silver: current.silver.map((id) => (id === programId ? null : id)),
    considering: current.considering.map((id) => (id === programId ? null : id)),
  };
}

function firstEmpty(slots: (string | null)[]) {
  return slots.findIndex((id) => id === null);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [selections, setSelections] = useState<Selections>(emptySelections);
  const [weights, setWeights] = useState<Weights>(defaultWeights);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    setSelections(loadSelections());
    setWeights(normalizeWeights(loadWeights()));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveSelections(normalizeSelections(selections));
  }, [hydrated, selections]);

  useEffect(() => {
    if (hydrated) saveWeights(weights);
  }, [hydrated, weights]);

  const findSlot = useCallback(
    (programId: string) => {
      const current = normalizeSelections(selections);
      const goldIndex = current.gold.indexOf(programId);
      if (goldIndex >= 0) return { tier: "gold" as const, index: goldIndex };
      const silverIndex = current.silver.indexOf(programId);
      if (silverIndex >= 0) return { tier: "silver" as const, index: silverIndex };
      const consideringIndex = current.considering.indexOf(programId);
      if (consideringIndex >= 0) return { tier: "considering" as const, index: consideringIndex };
      return null;
    },
    [selections],
  );

  const assign = useCallback(
    (programId: string, tier: SignalTier, index?: number) => {
      if (!getProgram(programId)) return false;
      let placed = false;
      setSelections((current) => {
        const cleared = withoutProgram(current, programId);
        const slots = [...cleared[tier]];
        let target = index;
        if (target == null || target < 0 || target >= slots.length) {
          target = firstEmpty(slots);
        }
        if (target < 0) return current;
        slots[target] = programId;
        placed = true;
        return { ...cleared, [tier]: slots };
      });
      return placed;
    },
    [],
  );

  const unassign = useCallback((programId: string) => {
    setSelections((current) => withoutProgram(current, programId));
  }, []);

  const clearAll = useCallback(() => setSelections(emptySelections()), []);

  const setWeight = useCallback((id: FactorId, value: number) => {
    setWeights((current) => setWeightKeepingTotal(current, id, value));
  }, []);

  const addFactor = useCallback((id: FactorId) => {
    setWeights((current) => addSuggestedFactor(current, id));
  }, []);

  const dropFactor = useCallback((id: FactorId) => {
    setWeights((current) => removeFactor(current, id));
  }, []);

  const resetWeights = useCallback(() => setWeights(defaultWeights()), []);

  const value = useMemo<AppState>(() => {
    const next = normalizeSelections(selections);
    return {
      hydrated,
      selections: next,
      weights,
      sidebarOpen,
      detailId,
      setSidebarOpen,
      setDetailId,
      setWeight,
      addFactor,
      dropFactor,
      resetWeights,
      assign,
      unassign,
      clearAll,
      findSlot,
      goldCount: next.gold.filter(Boolean).length,
      silverCount: next.silver.filter(Boolean).length,
      consideringCount: next.considering.filter(Boolean).length,
    };
  }, [
    hydrated,
    selections,
    weights,
    sidebarOpen,
    detailId,
    setWeight,
    addFactor,
    dropFactor,
    resetWeights,
    assign,
    unassign,
    clearAll,
    findSlot,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function useProgramSlot(programId: string) {
  const { findSlot } = useApp();
  return findSlot(programId);
}

export function rankedSelected(selections: Selections, weights: Weights) {
  const current = normalizeSelections(selections);
  const collect = (ids: (string | null)[], tier: SignalTier) =>
    ids
      .map((id, index) => {
        const program = getProgram(id);
        if (!program) return null;
        return { program, tier, index, score: matchScore(program, weights) };
      })
      .filter(Boolean) as {
      program: Program;
      tier: SignalTier;
      index: number;
      score: number;
    }[];
  return {
    gold: collect(current.gold, "gold"),
    silver: collect(current.silver, "silver"),
    considering: collect(current.considering, "considering"),
  };
}

export { GOLD_SLOTS, SILVER_SLOTS, CONSIDERING_SLOTS };
