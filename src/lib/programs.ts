import data from "@/data/programs.json";
import type { Program } from "./types";

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
