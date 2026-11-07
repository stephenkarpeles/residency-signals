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
import { SPECIALTIES } from "@/lib/catalog";
import { getProgram } from "@/lib/directory";
import { matchScore } from "@/lib/scoring";
import { getSupabase } from "@/lib/supabase";
import {
  emptySelections,
  loadSelections,
  loadSpecialties,
  loadWeights,
  normalizeSelections,
  normalizeSpecialties,
  saveSpecialties,
} from "@/lib/storage";
import type { FactorId, Program, Selections, SignalTier, Weights } from "@/lib/types";

type AppState = {
  hydrated: boolean;
  selections: Selections;
  weights: Weights;
  specialties: string[];
  chooseSpecialty: boolean;
  setSpecialties: (specialties: string[]) => void;
  setChooseSpecialty: (open: boolean) => void;
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
  syncError: string | null;
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

const MIGRATED_KEY = "obgyn-signals:migrated-to";
const SPECIALTY_SET = new Set<string>(SPECIALTIES);

function knownSpecialties(value: unknown) {
  return normalizeSpecialties(value).filter((name) => SPECIALTY_SET.has(name));
}

function signalPayload(
  userId: string,
  selections: Selections,
  weights: Weights,
  specialties: string[],
) {
  return {
    user_id: userId,
    selections: { ...selections, specialties },
    weights,
    updated_at: new Date().toISOString(),
  };
}

function hasAnySignal(selections: Selections) {
  return [...selections.gold, ...selections.silver, ...selections.considering].some(Boolean);
}

export function AppProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [hydrated, setHydrated] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selections, setSelections] = useState<Selections>(emptySelections);
  const [weights, setWeights] = useState<Weights>(defaultWeights);
  const [specialties, setSpecialtiesState] = useState<string[]>([]);
  const [chooseSpecialty, setChooseSpecialty] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = getSupabase();
      const localSelections = loadSelections();
      const localWeights = normalizeWeights(loadWeights());
      const localSpecialties = knownSpecialties(loadSpecialties());
      if (!supabase) {
        if (!cancelled) {
          setSelections(localSelections);
          setWeights(localWeights);
          setSpecialtiesState(localSpecialties);
          setHydrated(true);
        }
        return;
      }
      const { data, error } = await supabase
        .from("signal_boards")
        .select("selections, weights")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setSyncError(error.message);
        setCanSave(false);
        setSpecialtiesState(localSpecialties);
        setHydrated(true);
        return;
      }
      const rawSelections = (data?.selections ?? {}) as Partial<Selections> & {
        specialties?: unknown;
      };
      const remoteHasSpecialties =
        data?.selections != null &&
        typeof data.selections === "object" &&
        "specialties" in data.selections;
      const remoteSelections = normalizeSelections(rawSelections);
      const remoteSpecialties = knownSpecialties(rawSelections.specialties);
      const migratedTo = window.localStorage.getItem(MIGRATED_KEY);
      let nextSelections = remoteSelections;
      let nextWeights = normalizeWeights((data?.weights ?? {}) as Weights);
      let nextSpecialties = remoteHasSpecialties ? remoteSpecialties : localSpecialties;
      if (!hasAnySignal(remoteSelections) && hasAnySignal(localSelections) && !migratedTo) {
        nextSelections = localSelections;
        nextWeights = localWeights;
        if (!remoteHasSpecialties) nextSpecialties = localSpecialties;
        window.localStorage.setItem(MIGRATED_KEY, userId);
        const { error: migrateError } = await supabase
          .from("signal_boards")
          .upsert(signalPayload(userId, nextSelections, nextWeights, nextSpecialties));
        if (migrateError) setSyncError(migrateError.message);
      } else if (!data) {
        const { error: insertError } = await supabase
          .from("signal_boards")
          .upsert(signalPayload(userId, nextSelections, nextWeights, nextSpecialties));
        if (insertError) setSyncError(insertError.message);
      }
      if (cancelled) return;
      saveSpecialties(nextSpecialties);
      setSelections(nextSelections);
      setWeights(nextWeights);
      setSpecialtiesState(nextSpecialties);
      setCanSave(true);
      setHydrated(true);
    }
    setHydrated(false);
    setCanSave(false);
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!hydrated || !canSave) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const handle = window.setTimeout(() => {
      void supabase
        .from("signal_boards")
        .upsert(signalPayload(userId, normalizeSelections(selections), weights, specialties))
        .then(({ error }) => {
          setSyncError((current) => {
            const next = error?.message ?? null;
            return current === next ? current : next;
          });
        });
    }, 500);
    return () => window.clearTimeout(handle);
  }, [hydrated, canSave, selections, weights, specialties, userId]);

  const setSpecialties = useCallback((next: string[]) => {
    const cleaned = knownSpecialties(next);
    saveSpecialties(cleaned);
    setSpecialtiesState(cleaned);
    setChooseSpecialty(false);
  }, []);

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
        const normalized = normalizeSelections(current);
        const fromIndex = normalized[tier].indexOf(programId);
        if (fromIndex >= 0) {
          if (index == null || index < 0 || index >= normalized[tier].length || index === fromIndex) {
            return current;
          }
          placed = true;
          const slots = [...normalized[tier]];
          const displaced = slots[index];
          slots[index] = slots[fromIndex];
          slots[fromIndex] = displaced;
          return { ...normalized, [tier]: slots };
        }
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
      specialties,
      chooseSpecialty,
      setSpecialties,
      setChooseSpecialty,
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
      syncError,
      goldCount: next.gold.filter(Boolean).length,
      silverCount: next.silver.filter(Boolean).length,
      consideringCount: next.considering.filter(Boolean).length,
    };
  }, [
    hydrated,
    selections,
    weights,
    specialties,
    chooseSpecialty,
    setSpecialties,
    setChooseSpecialty,
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
    syncError,
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
      score: number | null;
    }[];
  return {
    gold: collect(current.gold, "gold"),
    silver: collect(current.silver, "silver"),
    considering: collect(current.considering, "considering"),
  };
}

export { GOLD_SLOTS, SILVER_SLOTS, CONSIDERING_SLOTS };
