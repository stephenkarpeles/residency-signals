"use client";

import { useEffect, useId, useRef, useState } from "react";
import { rankedSelected, useApp } from "@/context/AppProvider";
import { ProgramCard } from "@/components/ProgramCard";
import { CONSIDERING_SLOTS, GOLD_SLOTS, SILVER_SLOTS } from "@/lib/factors";

export function SelectionsView() {
  const { selections, weights, goldCount, silverCount, consideringCount, clearAll } = useApp();
  const { gold, silver, considering } = rankedSelected(selections, weights);
  const showSpecialty =
    new Set([...gold, ...silver, ...considering].map(({ program }) => program.specialty)).size > 1;
  const empty = goldCount + silverCount + consideringCount === 0;
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[12px] font-medium tracking-[0.16em] text-[#8A6A2A] uppercase">
            Selections
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
            My current selections
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-stone-500">
            {goldCount} of {GOLD_SLOTS} gold · {silverCount} of {SILVER_SLOTS} silver ·{" "}
            {consideringCount} of {CONSIDERING_SLOTS} considering. Drag cards in Explore to fill
            the leftover slots, or rearrange from the left rail.
          </p>
        </div>
        {empty ? null : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="shrink-0 self-start whitespace-nowrap rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-600 hover:bg-stone-50"
          >
            Clear all
          </button>
        )}
      </header>

      {confirmClear ? (
        <ClearAllConfirm
          goldCount={goldCount}
          silverCount={silverCount}
          consideringCount={consideringCount}
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            clearAll();
            setConfirmClear(false);
          }}
        />
      ) : null}

      {empty ? (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-20 text-center">
          <p className="text-lg font-medium text-stone-900">No programs yet</p>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-stone-500">
            Head to Explore Programs and drop programs into gold, silver, or considering slots.
          </p>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          <section>
            <h2 className="text-[12px] font-semibold tracking-[0.14em] text-[#8A6A2A] uppercase">
              Gold · {goldCount}/{GOLD_SLOTS}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {gold.map(({ program }) => (
                <ProgramCard key={program.id} program={program} showSpecialty={showSpecialty} />
              ))}
              {Array.from({ length: GOLD_SLOTS - gold.length }).map((_, index) => (
                <EmptySlot key={`g-${index}`} label={`Open gold slot ${gold.length + index + 1}`} tone="gold" />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
              Silver · {silverCount}/{SILVER_SLOTS}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {silver.map(({ program }) => (
                <ProgramCard key={program.id} program={program} showSpecialty={showSpecialty} />
              ))}
              {silver.length === 0 ? (
                <EmptySlot label="Open silver slots" />
              ) : null}
            </div>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold tracking-[0.14em] text-[#3F5C51] uppercase">
              Considering · {consideringCount}/{CONSIDERING_SLOTS}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {considering.map(({ program }) => (
                <ProgramCard key={program.id} program={program} showSpecialty={showSpecialty} />
              ))}
              {Array.from({ length: CONSIDERING_SLOTS - considering.length }).map((_, index) => (
                <EmptySlot
                  key={`c-${index}`}
                  label={`Open considering slot ${considering.length + index + 1}`}
                  tone="considering"
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function EmptySlot({ label, tone }: { label: string; tone?: "gold" | "considering" }) {
  return (
    <div
      className={`flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed ${
        tone === "gold"
          ? "border-[#E0C97A] bg-[#FBF6E8]/60"
          : tone === "considering"
            ? "border-[#C5D4CE] bg-[#F3F7F5]/70"
            : "border-stone-300 bg-white/50"
      }`}
    >
      <p
        className={`text-sm ${
          tone === "gold"
            ? "text-[#C4A35A]"
            : tone === "considering"
              ? "text-[#6E8B80]"
              : "text-stone-400"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

function ClearAllConfirm({
  goldCount,
  silverCount,
  consideringCount,
  onCancel,
  onConfirm,
}: {
  goldCount: number;
  silverCount: number;
  consideringCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/35"
        aria-label="Cancel clear all"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative mx-4 mb-4 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:mb-0 sm:p-7"
      >
        <p className="text-[12px] font-medium tracking-[0.16em] text-[#8A6A2A] uppercase">
          Confirm
        </p>
        <h2 id={titleId} className="mt-2 text-xl font-semibold tracking-tight text-stone-900">
          Clear all signals?
        </h2>
        <p id={descId} className="mt-2 text-[15px] leading-relaxed text-stone-500">
          This removes {goldCount} gold, {silverCount} silver, and {consideringCount} considering
          from this browser. You can rebuild the list from Explore, but this step cannot be undone.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50"
          >
            Keep selections
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-stone-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  );
}
