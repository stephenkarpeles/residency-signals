import data from "@/data/programs.json";
import type { DeliveryBandId, Program, Region } from "./types";

export const OBGYN_SPECIALTY = "Obstetrics and gynecology";

type StoredProgram = Omit<Program, "specialty" | "coverage">;

export const PROGRAMS: Program[] = (data.programs as StoredProgram[]).map((program) => ({
  ...program,
  specialty: OBGYN_SPECIALTY,
  coverage: "full",
}));
export const DATA_NOTES = data.notes;
export const DATA_GENERATED = data.generated;

const byId = new Map(PROGRAMS.map((program) => [program.id, program]));

export function getProgram(id: string | null | undefined): Program | undefined {
  if (!id) return undefined;
  return byId.get(id);
}

export function isEnrichedProgram(id: string | null | undefined) {
  return !!id && byId.has(id);
}

export const STATES = [...new Set(PROGRAMS.map((p) => p.state))].sort();
export const REGIONS = ["Northeast", "Midwest", "South", "West"] as const;

export const DELIVERY_BANDS = [
  { id: "low", label: "Low · <500", min: 0, max: 499 },
  { id: "medium", label: "Medium · 500–1,000", min: 500, max: 999 },
  { id: "mediumHigh", label: "Medium-high · 1,000–2,000", min: 1000, max: 1999 },
  { id: "high", label: "High · 2,000–3,000", min: 2000, max: 2999 },
  { id: "veryHigh", label: "Very high · 3,000–4,000", min: 3000, max: 3999 },
  { id: "extremelyHigh", label: "Extremely high · 4,000+", min: 4000, max: Number.POSITIVE_INFINITY },
] as const satisfies readonly {
  id: DeliveryBandId;
  label: string;
  min: number;
  max: number;
}[];

export function deliveryBandId(annualDeliveries: number): DeliveryBandId {
  const band = DELIVERY_BANDS.find(
    (row) => annualDeliveries >= row.min && annualDeliveries <= row.max,
  );
  return band?.id ?? "extremelyHigh";
}

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AR: "Arkansas",
  AZ: "Arizona",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DC: "District of Columbia",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  IA: "Iowa",
  IL: "Illinois",
  IN: "Indiana",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  MA: "Massachusetts",
  MD: "Maryland",
  ME: "Maine",
  MI: "Michigan",
  MN: "Minnesota",
  MO: "Missouri",
  MS: "Mississippi",
  NC: "North Carolina",
  NE: "Nebraska",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NV: "Nevada",
  NY: "New York",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VA: "Virginia",
  VT: "Vermont",
  WA: "Washington",
  WI: "Wisconsin",
  WV: "West Virginia",
  PR: "Puerto Rico",
  AK: "Alaska",
  ID: "Idaho",
  MT: "Montana",
  ND: "North Dakota",
  SD: "South Dakota",
  WY: "Wyoming",
};

export const REGION_BY_STATE: Record<string, Region> = {
  CT: "Northeast",
  ME: "Northeast",
  MA: "Northeast",
  NH: "Northeast",
  RI: "Northeast",
  VT: "Northeast",
  NJ: "Northeast",
  NY: "Northeast",
  PA: "Northeast",
  IL: "Midwest",
  IN: "Midwest",
  MI: "Midwest",
  OH: "Midwest",
  WI: "Midwest",
  IA: "Midwest",
  KS: "Midwest",
  MN: "Midwest",
  MO: "Midwest",
  NE: "Midwest",
  ND: "Midwest",
  SD: "Midwest",
  DE: "South",
  FL: "South",
  GA: "South",
  MD: "South",
  NC: "South",
  SC: "South",
  VA: "South",
  DC: "South",
  WV: "South",
  AL: "South",
  KY: "South",
  MS: "South",
  TN: "South",
  AR: "South",
  LA: "South",
  OK: "South",
  TX: "South",
  PR: "South",
  AZ: "West",
  CO: "West",
  ID: "West",
  MT: "West",
  NV: "West",
  NM: "West",
  UT: "West",
  WY: "West",
  AK: "West",
  CA: "West",
  HI: "West",
  OR: "West",
  WA: "West",
};
