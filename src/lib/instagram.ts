import data from "@/data/obgyn-instagram.json";

export type InstagramConfidence = "high" | "medium" | "low";

export type InstagramProgram = {
  query: string;
  officialName: string;
  shortName: string;
  city: string;
  state: string;
  instagramHandle: string | null;
  instagramName: string | null;
  url: string | null;
  residencySpecific: boolean;
  confidence: InstagramConfidence;
  notes: string | null;
  fallbackHospitalHandle?: string;
  fallbackHospitalUrl?: string;
};

export const INSTAGRAM_PROGRAMS = data.programs as InstagramProgram[];
export const INSTAGRAM_NOTES = data.notes;
export const INSTAGRAM_GENERATED = data.generated;

export const INSTAGRAM_WITH_HANDLE = INSTAGRAM_PROGRAMS.filter((row) => row.instagramHandle);
export const INSTAGRAM_MISSING = INSTAGRAM_PROGRAMS.filter((row) => !row.instagramHandle);
