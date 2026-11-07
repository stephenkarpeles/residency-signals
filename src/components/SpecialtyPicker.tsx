"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RESIDENCY_SPECIALTIES,
  SPECIALTIES,
  specialtySearchText,
} from "@/lib/catalog";
import { specialtyProgramCount } from "@/lib/directory";

const RESIDENCY_SET = new Set<string>(RESIDENCY_SPECIALTIES);
const OTHER_SPECIALTIES = SPECIALTIES.filter((name) => !RESIDENCY_SET.has(name));

export function SpecialtyPicker({
  initial,
  onSave,
  onCancel,
  autoFocus = false,
}: {
  initial: string[];
  onSave: (specialties: string[]) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [query, setQuery] = useState("");
  const [othersOpen, setOthersOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  useEffect(() => {
    if (!autoFocus) return;
    const field = document.getElementById("specialty-search");
    if (!(field instanceof HTMLInputElement)) return;
    field.focus();
    field.scrollIntoView({ block: "center" });
  }, [autoFocus]);

  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searching = tokens.length > 0;
  const matches = (name: string) => {
    if (!searching) return true;
    const hay = specialtySearchText(name);
    return tokens.every((token) => hay.includes(token));
  };

  const residencyMatches = RESIDENCY_SPECIALTIES.filter(matches);
  const otherMatches = OTHER_SPECIALTIES.filter(matches);
  const total = selected.reduce((sum, name) => sum + specialtyProgramCount(name), 0);

  function toggle(name: string) {
    setSelected((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="max-w-2xl">
        <p className="text-[12px] font-medium tracking-[0.16em] text-[#8A6A2A] uppercase">
          Specialty
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
          Which specialty?
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-500">
          Pick one or more. This is saved to your account and used for signals and rankings. You
          can change it from the top bar.
        </p>
      </header>

      <div className="mt-6">
        <label className="sr-only" htmlFor="specialty-search">
          Search specialties
        </label>
        <input
          id="specialty-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search specialties, including fellowships"
          className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pr-4 pl-4 text-[14px] text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#C4A35A] focus:ring-2 focus:ring-[#C4A35A]/20"
        />
      </div>

      {selected.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {selected.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggle(name)}
              className="rounded-full bg-[#F3E6C0] px-3 py-1 text-[12px] font-medium text-[#6F5420] hover:bg-[#EAD7A0]"
            >
              {name}
              <span className="ml-1.5 text-[#8A6A2A]" aria-hidden>
                ×
              </span>
              <span className="sr-only">Remove {name}</span>
            </button>
          ))}
        </div>
      ) : null}

      {searching ? (
        <section className="mt-6">
          <h2 className="text-[12px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
            Matches
          </h2>
          {residencyMatches.length + otherMatches.length === 0 ? (
            <p className="mt-3 text-[14px] text-stone-500">No specialty matches that.</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[...residencyMatches, ...otherMatches].map((name) => (
                <SpecialtyOption
                  key={name}
                  name={name}
                  pressed={selectedSet.has(name)}
                  onClick={() => toggle(name)}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="mt-6">
            <h2 className="text-[12px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
              Residency specialties
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {RESIDENCY_SPECIALTIES.map((name) => (
                <SpecialtyOption
                  key={name}
                  name={name}
                  pressed={selectedSet.has(name)}
                  onClick={() => toggle(name)}
                />
              ))}
            </div>
          </section>

          <section className="mt-6">
            <button
              type="button"
              aria-expanded={othersOpen}
              onClick={() => setOthersOpen((open) => !open)}
              className="text-[13px] font-medium text-stone-500 hover:text-stone-700"
            >
              {othersOpen ? "Hide fellowships and other specialties" : "Fellowships and other specialties"}
            </button>
            {othersOpen ? (
              <div className="mt-3 grid max-h-80 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                {OTHER_SPECIALTIES.map((name) => (
                  <SpecialtyOption
                    key={name}
                    name={name}
                    pressed={selectedSet.has(name)}
                    onClick={() => toggle(name)}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-stone-400">
                Search above to add a fellowship or any other ACGME specialty.
              </p>
            )}
          </section>
        </>
      )}

      <div className="sticky bottom-4 mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200/80 bg-white/95 px-4 py-3 shadow-[0_8px_24px_rgba(28,25,23,0.08)] backdrop-blur">
        <p className="text-[13px] text-stone-500">
          {selected.length === 0
            ? "Select at least one specialty"
            : `${selected.length} ${selected.length === 1 ? "specialty" : "specialties"} · ${total.toLocaleString()} programs`}
        </p>
        <div className="ml-auto flex gap-2">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-3 py-2 text-[13px] font-medium text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => onSave(selected)}
            className="rounded-xl bg-[#3F5C51] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#344c43] disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function SpecialtyOption({
  name,
  pressed,
  onClick,
}: {
  name: string;
  pressed: boolean;
  onClick: () => void;
}) {
  const count = specialtyProgramCount(name);
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
        pressed
          ? "border-[#E6D5A3] bg-[#FBF6E8]"
          : "border-stone-200 bg-white hover:bg-[#FBF9F6]"
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          pressed ? "border-[#C4A35A] bg-[#C4A35A] text-white" : "border-stone-300 bg-white"
        }`}
      >
        {pressed ? (
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
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-stone-800">{name}</span>
        <span className="mt-0.5 block text-[11px] text-stone-400">
          {count.toLocaleString()} programs
        </span>
      </span>
    </button>
  );
}
