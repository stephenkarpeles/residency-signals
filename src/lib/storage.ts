import { defaultWeights, GOLD_SLOTS, SILVER_SLOTS, normalizeWeights } from "./factors";
import type { Selections, Weights } from "./types";

const SELECTIONS_KEY = "obgyn-signals:selections:v1";
const WEIGHTS_KEY = "obgyn-signals:weights:v1";

export function emptySelections(): Selections {
  return {
    gold: Array.from({ length: GOLD_SLOTS }, () => null),
    silver: Array.from({ length: SILVER_SLOTS }, () => null),
  };
}

export function loadSelections(): Selections {
  if (typeof window === "undefined") return emptySelections();
  try {
    const raw = window.localStorage.getItem(SELECTIONS_KEY);
    if (!raw) return emptySelections();
    const parsed = JSON.parse(raw) as Selections;
    return {
      gold: padSlots(parsed.gold, GOLD_SLOTS),
      silver: padSlots(parsed.silver, SILVER_SLOTS),
    };
  } catch {
    return emptySelections();
  }
}

export function saveSelections(selections: Selections) {
  window.localStorage.setItem(SELECTIONS_KEY, JSON.stringify(selections));
}

export function loadWeights(): Weights {
  if (typeof window === "undefined") return defaultWeights();
  try {
    const raw = window.localStorage.getItem(WEIGHTS_KEY);
    if (!raw) return defaultWeights();
    return normalizeWeights({ ...defaultWeights(), ...JSON.parse(raw) });
  } catch {
    return defaultWeights();
  }
}

export function saveWeights(weights: Weights) {
  window.localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights));
}

function padSlots(slots: (string | null)[] | undefined, length: number) {
  const next = Array.from({ length }, () => null as string | null);
  (slots ?? []).slice(0, length).forEach((id, index) => {
    next[index] = id;
  });
  return next;
}
