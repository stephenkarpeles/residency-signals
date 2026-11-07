"use client";

import { useMemo, useState } from "react";
import {
  INSTAGRAM_GENERATED,
  INSTAGRAM_MISSING,
  INSTAGRAM_PROGRAMS,
  INSTAGRAM_WITH_HANDLE,
  type InstagramProgram,
} from "@/lib/instagram";

type FilterId = "all" | "found" | "missing";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "found", label: "Has handle" },
  { id: "missing", label: "No dedicated IG" },
];

export function InstagramView() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return INSTAGRAM_PROGRAMS.filter((row) => {
      if (filter === "found" && !row.instagramHandle) return false;
      if (filter === "missing" && row.instagramHandle) return false;
      if (!needle) return true;
      const blob = [
        row.query,
        row.officialName,
        row.shortName,
        row.city,
        row.state,
        row.instagramHandle,
        row.instagramName,
        row.fallbackHospitalHandle,
        row.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [filter, query]);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="max-w-2xl">
        <p className="text-[12px] font-medium tracking-[0.16em] text-[#8A6A2A] uppercase">
          Private · not in nav
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
          Residency Instagrams
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-500">
          Spreadsheet programs only. {INSTAGRAM_WITH_HANDLE.length} dedicated handles,{" "}
          {INSTAGRAM_MISSING.length} without. Updated {INSTAGRAM_GENERATED}.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search program, city, or handle"
          className="h-11 w-full rounded-2xl border border-stone-200/80 bg-white px-4 text-[14px] text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-300 focus:ring-2 focus:ring-[#E8C872]/50 sm:flex-1"
        />
        <div className="flex shrink-0 gap-1 rounded-2xl border border-stone-200/80 bg-white p-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-xl px-3 py-1.5 text-[13px] transition-colors ${
                filter === item.id
                  ? "bg-stone-900 font-medium text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[13px] text-stone-500">
        {rows.length} program{rows.length === 1 ? "" : "s"}
      </p>

      <div className="mt-3 space-y-2.5">
        {rows.map((row) => (
          <InstagramCard key={row.query} row={row} />
        ))}
      </div>
    </div>
  );
}

function InstagramCard({ row }: { row: InstagramProgram }) {
  const handle = row.instagramHandle;
  const href = row.url ?? (handle ? `https://www.instagram.com/${handle}/` : null);

  return (
    <article className="rounded-2xl border border-stone-200/80 bg-white px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-stone-900">{row.query}</p>
          <p className="mt-0.5 text-[13px] text-stone-500">
            {row.shortName} · {row.city}, {row.state}
          </p>
        </div>
        <ConfidenceBadge confidence={row.confidence} />
      </div>

      {handle && href ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-[#F7F1E1] px-3 py-1.5 text-[13px] font-medium text-[#8A6A2A] hover:bg-[#F3E6C0]"
          >
            {handle}
          </a>
          <CopyButton text={handle} />
          {row.instagramName ? (
            <span className="text-[12px] text-stone-400">{row.instagramName}</span>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-stone-500">No dedicated residency Instagram</p>
      )}

      {row.fallbackHospitalHandle && row.fallbackHospitalUrl ? (
        <p className="mt-2 text-[13px] text-stone-500">
          Hospital/system:{" "}
          <a
            href={row.fallbackHospitalUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-stone-700 underline decoration-stone-300 underline-offset-2 hover:text-stone-900"
          >
            {row.fallbackHospitalHandle}
          </a>
        </p>
      ) : null}

      {row.notes ? (
        <p className="mt-2 text-[12px] leading-relaxed text-stone-400">{row.notes}</p>
      ) : null}
    </article>
  );
}

function ConfidenceBadge({ confidence }: { confidence: InstagramProgram["confidence"] }) {
  const label =
    confidence === "high" ? "High confidence" : confidence === "medium" ? "Check this one" : "Uncertain";
  const className =
    confidence === "high"
      ? "bg-[#F3F7F5] text-[#3F5C51]"
      : confidence === "medium"
        ? "bg-[#F7F1E1] text-[#8A6A2A]"
        : "bg-stone-100 text-stone-500";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`}>{label}</span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className="rounded-xl px-2.5 py-1.5 text-[12px] font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
