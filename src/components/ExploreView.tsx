"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProgramCard } from "@/components/ProgramCard";
import { useApp } from "@/context/AppProvider";
import { PROGRAMS, REGIONS, STATE_NAMES, STATES } from "@/lib/programs";
import { matchScore } from "@/lib/scoring";
import type { ProgramType, SortKey } from "@/lib/types";

const TYPES: Array<"All" | ProgramType> = ["All", "University", "Hybrid", "Community"];

const CITY_NICKNAMES: Record<string, string> = {
  "Oklahoma City": "okc",
  "New York": "nyc manhattan",
  "Los Angeles": "la",
  "San Francisco": "sf bay",
  "Washington": "dc d.c.",
  "Las Vegas": "vegas",
  "New Orleans": "nola",
  "Philadelphia": "philly",
  "Chicago": "chi",
  "Atlanta": "atl",
  "Houston": "hou",
  "Dallas": "dfw",
  "Fort Worth": "dfw",
  "Arlington": "dfw",
  "Miami": "mia",
  "Boston": "bos",
  "Seattle": "sea",
  "Phoenix": "phx",
  "St. Louis": "stl",
  "St Louis": "stl",
  "Kansas City": "kc",
  Peoria: "osf st francis saint francis hospital",
};

const SEARCH_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "hospital",
  "hospitals",
  "in",
  "of",
  "or",
  "program",
  "programs",
  "residency",
  "the",
  "to",
]);

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = cur;
    }
  }
  return row[b.length];
}

function tokenMatchesHay(token: string, hay: string): boolean {
  if (hay.includes(token)) return true;
  if (token === "st" || token === "st.") return hay.includes("saint");
  if (token.length < 5) return false;
  const maxDist = token.length >= 8 ? 2 : 1;
  return hay
    .split(/[^a-z]+/)
    .some(
      (word) =>
        word.length >= 5 &&
        Math.abs(word.length - token.length) <= maxDist &&
        editDistance(token, word) <= maxDist,
    );
}

export function ExploreView() {
  const { weights } = useApp();
  const [query, setQuery] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [type, setType] = useState<string>("All");
  const [minDO, setMinDO] = useState(0);
  const [minMD, setMinMD] = useState(0);
  const [waterfront, setWaterfront] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");

  const stateOptions = useMemo(() => {
    if (regions.length === 0) return STATES;
    return STATES.filter((code) =>
      PROGRAMS.some((program) => program.state === code && regions.includes(program.region)),
    );
  }, [regions]);

  useEffect(() => {
    setStates((current) => {
      const next = current.filter((code) => stateOptions.includes(code));
      return next.length === current.length ? current : next;
    });
  }, [stateOptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = PROGRAMS.filter((program) => {
      if (regions.length > 0 && !regions.includes(program.region)) return false;
      if (states.length > 0 && !states.includes(program.state)) return false;
      if (type !== "All" && program.type !== type) return false;
      if (program.percentDO < minDO) return false;
      if (program.percentMD < minMD) return false;
      if (waterfront && program.waterProximity < 70) return false;
      if (!q) return true;
      const nick = CITY_NICKNAMES[program.city] ?? "";
      const hay =
        `${program.name} ${program.shortName} ${program.city} ${program.state} ${STATE_NAMES[program.state] ?? ""} ${program.highlights.join(" ")} ${nick}`.toLowerCase();
      const tokens = q.split(/\s+/).filter((token) => !SEARCH_STOPWORDS.has(token));
      if (tokens.length === 0) return true;
      return tokens.every((token) => tokenMatchesHay(token, hay));
    });

    rows.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.shortName.localeCompare(b.shortName);
        case "col":
          return a.costOfLiving - b.costOfLiving;
        case "classSize":
          return b.classSize - a.classSize;
        case "do":
          return b.percentDO - a.percentDO;
        case "population":
          return b.cityPopulation - a.cityPopulation;
        case "schools":
          return (
            b.middleSchoolQuality +
            b.highSchoolQuality -
            (a.middleSchoolQuality + a.highSchoolQuality)
          );
        default:
          return matchScore(b, weights) - matchScore(a, weights);
      }
    });
    return rows;
  }, [query, regions, states, type, minDO, minMD, waterfront, sort, weights]);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="max-w-2xl">
        <p className="text-[12px] font-medium tracking-[0.16em] text-[#8A6A2A] uppercase">
          Explore
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
          Find your 3 gold and 15 silver signals
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-500">
          Search {PROGRAMS.length} ACGME programs, then drag one into an open slot on the left — or
          tap Gold / Silver on a card. Scores update live from your Important Factors.
        </p>
      </header>

      <div className="mt-8 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search programs</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by program, city, or state"
              className="w-full rounded-xl border border-stone-200 bg-[#FBF9F6] px-4 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#C4A35A] focus:ring-2 focus:ring-[#C4A35A]/20"
            />
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-xl border border-stone-200 bg-[#FBF9F6] px-3 py-2.5 text-[13px] text-stone-700 outline-none focus:border-[#C4A35A]"
          >
            <option value="score">Sort: Match Score</option>
            <option value="name">Sort: Name</option>
            <option value="col">Sort: Cost of Living</option>
            <option value="classSize">Sort: Class Size</option>
            <option value="do">Sort: % DO</option>
            <option value="population">Sort: City Size</option>
            <option value="schools">Sort: School Quality</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <MultiSelect label="Region" values={regions} onChange={setRegions} options={REGIONS} />
          <MultiSelect
            label="State"
            values={states}
            onChange={setStates}
            options={stateOptions}
            formatOption={(code) => `${code} · ${STATE_NAMES[code] ?? code}`}
          />
          <FilterSelect label="Type" value={type} onChange={setType} options={TYPES} />
          <Toggle pressed={waterfront} onClick={() => setWaterfront((v) => !v)}>
            Near water
          </Toggle>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <PercentSlider
            label="Min DO %"
            value={minDO}
            onChange={setMinDO}
            accent="gold"
          />
          <PercentSlider
            label="Min MD %"
            value={minMD}
            onChange={setMinMD}
            accent="green"
          />
        </div>
      </div>

      <p className="mt-5 text-[13px] text-stone-500">
        {filtered.length} program{filtered.length === 1 ? "" : "s"}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((program) => (
          <ProgramCard key={program.id} program={program} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-16 text-center">
          <p className="font-medium text-stone-800">No programs match those filters</p>
          <p className="mt-1 text-sm text-stone-500">Try clearing a filter or searching a different city.</p>
        </div>
      ) : null}
    </div>
  );
}

function MultiSelect({
  label,
  values,
  onChange,
  options,
  formatOption,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: readonly string[];
  formatOption?: (value: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = values.filter((value) => options.includes(value));
  const summary =
    selected.length === 0
      ? "All"
      : selected.length === 1
        ? (formatOption?.(selected[0]) ?? selected[0])
        : `${selected.length} selected`;

  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((value) => value !== option)
        : [...selected, option],
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] ${
          selected.length > 0
            ? "border-[#E6D5A3] bg-[#FBF6E8] text-stone-800"
            : "border-stone-200 bg-[#FBF9F6] text-stone-600"
        }`}
      >
        <span className="text-stone-400">{label}</span>
        <span className="max-w-[160px] truncate font-medium text-stone-800">{summary}</span>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-30 mt-1 max-h-64 min-w-[220px] overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-[0_8px_24px_rgba(28,25,23,0.12)]"
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-stone-600 hover:bg-[#FBF9F6]"
            onClick={() => onChange([])}
          >
            <span className="w-4 text-center text-[#C4A35A]">{selected.length === 0 ? "✓" : ""}</span>
            All
          </button>
          {options.map((option) => {
            const checked = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggle(option)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-stone-800 hover:bg-[#FBF9F6]"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    checked
                      ? "border-[#C4A35A] bg-[#C4A35A] text-white"
                      : "border-stone-300 bg-white"
                  }`}
                >
                  {checked ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                      <path
                        d="M2 5.2L4.1 7.3 8 2.8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
                {formatOption?.(option) ?? option}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-[#FBF9F6] px-3 py-2 text-[13px] text-stone-600">
      <span className="text-stone-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent font-medium text-stone-800 outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function PercentSlider({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  accent: "gold" | "green";
}) {
  const active = value > 0;
  return (
    <label
      className={`rounded-xl border px-3 py-2.5 ${
        active
          ? accent === "gold"
            ? "border-[#E6D5A3] bg-[#FBF6E8]"
            : "border-[#C5D4CE] bg-[#F3F7F5]"
          : "border-stone-200 bg-[#FBF9F6]"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="text-stone-500">{label}</span>
        <span className="font-semibold tabular-nums text-stone-800">
          {value === 0 ? "Any" : `${value}%`}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full ${accent === "gold" ? "accent-[#C4A35A]" : "accent-[#3F5C51]"}`}
      />
    </label>
  );
}

function Toggle({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors ${
        pressed
          ? "border-[#C4A35A] bg-[#F3E6C0] text-[#6F5420]"
          : "border-stone-200 bg-[#FBF9F6] text-stone-600 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}
