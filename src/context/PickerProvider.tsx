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
  addInterview,
  confirmCriterion,
  emptyPicker,
  normalizePicker,
  removeInterview,
  reorderCriterion,
  transferWeight,
  type CriterionId,
  type PickerBoard,
} from "@/lib/picker";
import { getSupabase } from "@/lib/supabase";

type PickerState = {
  hydrated: boolean;
  board: PickerBoard;
  syncError: string | null;
  addProgram: (programId: string) => void;
  removeProgram: (programId: string) => void;
  clearPrograms: () => void;
  moveProgram: (criterionId: CriterionId, activeId: string, overId: string) => void;
  acceptOrder: (criterionId: CriterionId) => void;
  applyWeight: (id: CriterionId, nextValue: number, counterpartId: CriterionId) => boolean;
  resetWeights: () => void;
};

const PickerContext = createContext<PickerState | null>(null);

function payload(userId: string, board: PickerBoard) {
  return {
    user_id: userId,
    program_ids: board.programIds,
    orders: board.orders,
    weights: board.weights,
    confirmed: board.confirmed,
    updated_at: new Date().toISOString(),
  };
}

export function PickerProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [board, setBoard] = useState<PickerBoard>(emptyPicker);
  const [hydrated, setHydrated] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = getSupabase();
      if (!supabase) {
        if (!cancelled) setHydrated(true);
        return;
      }
      const { data, error } = await supabase
        .from("picker_boards")
        .select("program_ids, orders, weights, confirmed")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setSyncError(error.message);
        setCanSave(false);
        setHydrated(true);
        return;
      }
      const next = normalizePicker({
        programIds: data?.program_ids ?? [],
        orders: data?.orders ?? {},
        weights: data?.weights ?? {},
        confirmed: data?.confirmed ?? [],
      });
      if (!data) {
        const { error: insertError } = await supabase.from("picker_boards").upsert(payload(userId, next));
        if (insertError) setSyncError(insertError.message);
      }
      setBoard(next);
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
        .from("picker_boards")
        .upsert(payload(userId, board))
        .then(({ error }) => {
          setSyncError((current) => {
            const next = error?.message ?? null;
            return current === next ? current : next;
          });
        });
    }, 500);
    return () => window.clearTimeout(handle);
  }, [hydrated, canSave, board, userId]);

  const addProgram = useCallback((programId: string) => {
    setBoard((current) => addInterview(current, programId));
  }, []);

  const removeProgram = useCallback((programId: string) => {
    setBoard((current) => removeInterview(current, programId));
  }, []);

  const clearPrograms = useCallback(() => {
    setBoard((current) => ({ ...emptyPicker(), weights: current.weights }));
  }, []);

  const moveProgram = useCallback((criterionId: CriterionId, activeId: string, overId: string) => {
    setBoard((current) => reorderCriterion(current, criterionId, activeId, overId));
  }, []);

  const acceptOrder = useCallback((criterionId: CriterionId) => {
    setBoard((current) => confirmCriterion(current, criterionId));
  }, []);

  const applyWeight = useCallback(
    (id: CriterionId, nextValue: number, counterpartId: CriterionId) => {
      const next = transferWeight(board.weights, id, nextValue, counterpartId);
      if (!next) return false;
      setBoard((current) => {
        const weights = transferWeight(current.weights, id, nextValue, counterpartId);
        return weights ? { ...current, weights } : current;
      });
      return true;
    },
    [board.weights],
  );

  const resetWeights = useCallback(() => {
    setBoard((current) => ({ ...current, weights: emptyPicker().weights }));
  }, []);

  const value = useMemo<PickerState>(
    () => ({
      hydrated,
      board,
      syncError,
      addProgram,
      removeProgram,
      clearPrograms,
      moveProgram,
      acceptOrder,
      applyWeight,
      resetWeights,
    }),
    [
      hydrated,
      board,
      syncError,
      addProgram,
      removeProgram,
      clearPrograms,
      moveProgram,
      acceptOrder,
      applyWeight,
      resetWeights,
    ],
  );

  return <PickerContext.Provider value={value}>{children}</PickerContext.Provider>;
}

export function usePicker() {
  const context = useContext(PickerContext);
  if (!context) throw new Error("usePicker must be used within PickerProvider");
  return context;
}
