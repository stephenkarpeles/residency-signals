import data from "@/data/programs.json";
import type { DeliveryBandId, Program } from "./types";

export const PROGRAMS = data.programs as Program[];
export const DATA_NOTES = data.notes;
export const DATA_GENERATED = data.generated;

const byId = new Map(PROGRAMS.map((program) => [program.id, program]));

export function getProgram(id: string | null | undefined): Program | undefined {
  if (!id) return undefined;
  return byId.get(id);
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
};
