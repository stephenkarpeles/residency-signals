export const PICKER_CRITERIA = [
  {
    id: "training",
    label: "Quality of training",
    short: "Training",
    description: "Teaching, case mix, autonomy, and how ready you would feel to practice.",
  },
  {
    id: "culture",
    label: "Work culture",
    short: "Culture",
    description: "How residents and faculty treat each other, and whether you would want to spend years there.",
  },
  {
    id: "acuity",
    label: "Acuity",
    short: "Acuity",
    description: "How sick the patients are and how intense the days feel. Put the acuity you want higher.",
  },
  {
    id: "hours",
    label: "Working hours",
    short: "Hours",
    description:
      "The schedule you want. Put lighter hours on top if that matters, or heavier hours if you want more reps.",
  },
  {
    id: "call",
    label: "Call and nights",
    short: "Call",
    description: "Nights, weekends, home call, and how predictable the call burden feels.",
  },
  {
    id: "location",
    label: "Location",
    short: "Location",
    description: "The city itself: what there is to do, and whether you want to live there.",
  },
  {
    id: "schools",
    label: "School systems",
    short: "Schools",
    description: "Elementary, middle, and high schools for kids who would live there.",
  },
  {
    id: "colleges",
    label: "In-state colleges",
    short: "Colleges",
    description: "Public universities in that state a partner or family member could attend.",
  },
  {
    id: "weather",
    label: "Weather",
    short: "Weather",
    description: "Put the climates you actually want higher.",
  },
  {
    id: "family",
    label: "Proximity to family and friends",
    short: "Family",
    description: "How close the program is to the people you want nearby.",
  },
  {
    id: "cost",
    label: "Cost of living",
    short: "Living cost",
    description: "How far a resident salary goes. Put the more affordable places higher if that is what you want.",
  },
  {
    id: "partner",
    label: "Partner opportunities",
    short: "Partner",
    description: "Jobs, training, or a career path for a partner in that city.",
  },
] as const;

export type CriterionId = (typeof PICKER_CRITERIA)[number]["id"];
export type PickerWeights = Record<CriterionId, number>;

export type PickerBoard = {
  programIds: string[];
  orders: Record<CriterionId, string[]>;
  weights: PickerWeights;
  confirmed: CriterionId[];
};

export type ScoredInterview = {
  programId: string;
  score: number;
  ranks: Partial<Record<CriterionId, number>>;
};

const CRITERION_IDS = PICKER_CRITERIA.map((criterion) => criterion.id);

export function evenWeights(): PickerWeights {
  const base = Math.floor(100 / CRITERION_IDS.length);
  let extra = 100 - base * CRITERION_IDS.length;
  const weights = {} as PickerWeights;
  for (const id of CRITERION_IDS) {
    weights[id] = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
  }
  return weights;
}

export function emptyOrders(): Record<CriterionId, string[]> {
  return Object.fromEntries(CRITERION_IDS.map((id) => [id, [] as string[]])) as Record<
    CriterionId,
    string[]
  >;
}

export function emptyPicker(): PickerBoard {
  return {
    programIds: [],
    orders: emptyOrders(),
    weights: evenWeights(),
    confirmed: [],
  };
}

function clampInt(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function isCriterionId(value: string): value is CriterionId {
  return CRITERION_IDS.includes(value as CriterionId);
}

export function normalizeProgramIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0 || seen.has(item)) continue;
    seen.add(item);
    ids.push(item);
  }
  return ids;
}

export function normalizeWeights(value: unknown): PickerWeights {
  const even = evenWeights();
  if (!value || typeof value !== "object") return even;
  const raw = value as Record<string, unknown>;
  const next = { ...even };
  let seen = false;
  for (const id of CRITERION_IDS) {
    if (raw[id] == null) continue;
    seen = true;
    next[id] = clampInt(Number(raw[id]));
  }
  if (!seen) return even;
  const total = CRITERION_IDS.reduce((sum, id) => sum + next[id], 0);
  return total === 100 ? next : even;
}

export function normalizeConfirmed(value: unknown): CriterionId[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<CriterionId>();
  for (const item of value) {
    if (typeof item === "string" && isCriterionId(item)) seen.add(item);
  }
  return CRITERION_IDS.filter((id) => seen.has(id));
}

export function normalizeOrders(
  programIds: string[],
  value: unknown,
): Record<CriterionId, string[]> {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const allowed = new Set(programIds);
  const orders = emptyOrders();
  for (const id of CRITERION_IDS) {
    const incoming = Array.isArray(raw[id]) ? raw[id] : [];
    const list: string[] = [];
    const seen = new Set<string>();
    for (const item of incoming) {
      if (typeof item !== "string" || !allowed.has(item) || seen.has(item)) continue;
      seen.add(item);
      list.push(item);
    }
    for (const programId of programIds) {
      if (!seen.has(programId)) list.push(programId);
    }
    orders[id] = list;
  }
  return orders;
}

export function normalizePicker(value: Partial<PickerBoard> | null | undefined): PickerBoard {
  const programIds = normalizeProgramIds(value?.programIds);
  return {
    programIds,
    orders: normalizeOrders(programIds, value?.orders),
    weights: normalizeWeights(value?.weights),
    confirmed: normalizeConfirmed(value?.confirmed),
  };
}

export function transferWeight(
  weights: PickerWeights,
  id: CriterionId,
  nextValue: number,
  counterpartId: CriterionId,
): PickerWeights | null {
  if (id === counterpartId) return null;
  const current = weights[id];
  const other = weights[counterpartId];
  const next = clampInt(nextValue);
  const delta = next - current;
  if (delta === 0) return weights;
  if (other - delta < 0) return null;
  const result: PickerWeights = { ...weights, [id]: next, [counterpartId]: other - delta };
  const total = CRITERION_IDS.reduce((sum, key) => sum + result[key], 0);
  return total === 100 ? result : null;
}

export function addInterview(board: PickerBoard, programId: string): PickerBoard {
  if (!programId || board.programIds.includes(programId)) return board;
  const programIds = [...board.programIds, programId];
  return { ...board, programIds, orders: normalizeOrders(programIds, board.orders) };
}

export function removeInterview(board: PickerBoard, programId: string): PickerBoard {
  const programIds = board.programIds.filter((id) => id !== programId);
  return { ...board, programIds, orders: normalizeOrders(programIds, board.orders) };
}

export function reorderCriterion(
  board: PickerBoard,
  criterionId: CriterionId,
  activeId: string,
  overId: string,
): PickerBoard {
  const orders = normalizeOrders(board.programIds, board.orders);
  const order = [...orders[criterionId]];
  const from = order.indexOf(activeId);
  const to = order.indexOf(overId);
  if (from < 0 || to < 0 || from === to) return board;
  const [item] = order.splice(from, 1);
  order.splice(to, 0, item);
  const confirmed = board.confirmed.includes(criterionId)
    ? board.confirmed
    : [...board.confirmed, criterionId];
  return { ...board, orders: { ...orders, [criterionId]: order }, confirmed };
}

export function confirmCriterion(board: PickerBoard, criterionId: CriterionId): PickerBoard {
  if (board.programIds.length === 0 || board.confirmed.includes(criterionId)) return board;
  return { ...board, confirmed: [...board.confirmed, criterionId] };
}

export function rankedInterviews(board: PickerBoard): {
  rows: ScoredInterview[];
  counted: CriterionId[];
} {
  const current = normalizePicker(board);
  const confirmed = new Set(current.confirmed);
  const counted = CRITERION_IDS.filter((id) => confirmed.has(id) && current.weights[id] > 0);
  const weightSum = counted.reduce((sum, id) => sum + current.weights[id], 0);
  const total = current.programIds.length;
  const rows = current.programIds.map((programId) => {
    const ranks: Partial<Record<CriterionId, number>> = {};
    let score = 0;
    for (const id of counted) {
      const index = current.orders[id].indexOf(programId);
      const rank = index >= 0 ? index + 1 : total;
      ranks[id] = rank;
      const normalized = total <= 1 ? 100 : ((total - rank) / (total - 1)) * 100;
      score += current.weights[id] * normalized;
    }
    return {
      programId,
      score: weightSum > 0 ? score / weightSum : 0,
      ranks,
    };
  });
  rows.sort((a, b) => b.score - a.score || a.programId.localeCompare(b.programId));
  return { rows, counted };
}
