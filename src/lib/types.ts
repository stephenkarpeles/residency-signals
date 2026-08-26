export type ProgramType = "University" | "Hybrid" | "Community";
export type Region = "Northeast" | "Midwest" | "South" | "West";
export type DoMdSource = "published" | "estimated" | "roster";
export type DeliverySource = "published" | "sparcs" | "hcai" | "cms" | "estimated";

export type Program = {
  id: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  region: Region;
  type: ProgramType;
  classSize: number;
  annualDeliveries: number;
  annualDeliveriesSource: DeliverySource;
  annualDeliveriesNote: string;
  cityPopulation: number;
  costOfLiving: number;
  middleSchoolQuality: number;
  highSchoolQuality: number;
  inStateCollegeQuality: number;
  programQuality: number;
  townQuality: number;
  waterProximity: number;
  waterNote: string;
  percentMD: number;
  percentDO: number;
  percentIMG: number;
  doMdSource: DoMdSource;
  fellowshipStrength: number;
  safety: number;
  walkability: number;
  climate: number;
  highlights: string[];
};

export type FactorId =
  | "programQuality"
  | "inStateColleges"
  | "schools"
  | "affordability"
  | "townQuality"
  | "water"
  | "fellowship"
  | "classSize"
  | "doRepresentation"
  | "citySize"
  | "safety"
  | "walkability"
  | "climate";

export type Weights = Record<FactorId, number>;

export type FactorDef = {
  id: FactorId;
  label: string;
  description: string;
  defaultWeight: number;
  suggested?: boolean;
};

export type Selections = {
  gold: (string | null)[];
  silver: (string | null)[];
  considering: (string | null)[];
};

export type SignalTier = "gold" | "silver" | "considering";

export type DeliveryBandId =
  | "low"
  | "medium"
  | "mediumHigh"
  | "high"
  | "veryHigh"
  | "extremelyHigh";

export type SortKey =
  | "score"
  | "name"
  | "col"
  | "classSize"
  | "deliveries"
  | "do"
  | "population"
  | "schools";
