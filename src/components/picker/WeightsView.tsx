"use client";

import { useMemo, useState } from "react";
import { usePicker } from "@/context/PickerProvider";
import { PICKER_CRITERIA, evenWeights, type CriterionId } from "@/lib/picker";

export function WeightsView() {
  const { board, applyWeight, resetWeights } = usePicker();
  const [editing, setEditing] = useState<CriterionId | null>(null);
  const [draft, setDraft] = useState(0);
  const [counterpart, setCounterpart] = useState<CriterionId | "">("");
  const defaults = useMemo(() => evenWeights(), []);
  const active = editing ? PICKER_CRITERIA.find((item) => item.id === editing) : null;
  const current = editing ? board.weights[editing] : 0;
  const delta = editing ? draft - current : 0;
  const options = PICKER_CRITERIA.filter((item) => {
    if (!editing || item.id === editing || delta === 0) return false;
    if (delta > 0) return board.weights[item.id] >= delta;
    return true;
  });
  const blocked = Boolean(editing) && delta > 0 && options.length === 0;

  function open(id: CriterionId) {
    setEditing(id);
    setDraft(board.weights[id]);
    setCounterpart("");
  }

  function apply() {
    if (!editing || !counterpart) return;
    const ok = applyWeight(editing, draft, counterpart);
    if (ok) {
      setEditing(null);
      setCounterpart("");
    }
  }

  return (
    <div>
      <header className="max-w-2xl">
        <p className="text-[12px] font-medium tracking-[0.16em] text-[#8A6A2A] uppercase">
          Weights
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
          What matters more
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-500">
          The areas split 100%. Four start at 9% and the rest at 8%, as close to even as whole
          percents allow. Raise one, then pick the single area that gives up the difference.
        </p>
      </header>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white px-5 py-4">
        <p className="text-sm text-stone-600">
          Total weight <span className="font-semibold text-stone-900">100%</span>
        </p>
        <button
          type="button"
          onClick={() => {
            resetWeights();
            setEditing(null);
          }}
          className="rounded-xl px-3 py-1.5 text-[13px] font-medium text-stone-600 hover:bg-stone-100"
        >
          Reset to even
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {PICKER_CRITERIA.map((criterion) => {
          const weight = board.weights[criterion.id];
          const openThis = editing === criterion.id;
          return (
            <article
              key={criterion.id}
              className="rounded-2xl border border-stone-200/80 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-stone-900">{criterion.label}</h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-stone-500">
                    {criterion.description}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-lg font-semibold tabular-nums text-stone-900">{weight}%</p>
                  <button
                    type="button"
                    onClick={() => (openThis ? setEditing(null) : open(criterion.id))}
                    className="inline-flex h-8 items-center rounded-xl border border-stone-300 bg-white px-3 text-[13px] leading-none font-medium text-stone-700 hover:bg-stone-50"
                  >
                    {openThis ? "Close" : "Change"}
                  </button>
                </div>
              </div>
              {weight !== defaults[criterion.id] ? (
                <p className="mt-2 text-[12px] text-stone-400">
                  Started at {defaults[criterion.id]}%
                </p>
              ) : null}
              {openThis && active ? (
                <div className="mt-4 rounded-2xl bg-[#F6F3EE] p-4">
                  <label className="flex items-center gap-3 text-[13px] font-medium text-stone-700">
                    <span>New weight for {active.short}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={draft}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setDraft(Number.isFinite(next) ? Math.max(0, Math.min(100, Math.round(next))) : 0);
                        setCounterpart("");
                      }}
                      className="w-28 shrink-0 rounded-xl bg-white px-3 py-2 text-[15px] tabular-nums ring-1 ring-stone-200 outline-none focus:ring-2 focus:ring-[#C4A35A]"
                    />
                  </label>
                  {delta === 0 ? (
                    <p className="mt-3 text-[13px] text-stone-500">Change the number to move weight.</p>
                  ) : blocked ? (
                    <p className="mt-3 text-[13px] leading-relaxed text-[#8A6A2A]">
                      No single area can give up {delta}%. Lower the number, or move it in a
                      smaller step.
                    </p>
                  ) : (
                    <>
                      <p className="mt-3 text-[13px] font-medium text-stone-700">
                        {delta > 0
                          ? `Which area should drop by ${delta}%?`
                          : `Which area should gain ${Math.abs(delta)}%?`}
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {options.map((option) => {
                          const nextWeight = board.weights[option.id] - delta;
                          const picked = counterpart === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setCounterpart(option.id)}
                              className={`rounded-xl px-3 py-2 text-left text-[13px] ring-1 ${
                                picked
                                  ? "bg-white font-medium text-stone-900 ring-[#C4A35A]"
                                  : "bg-white/70 text-stone-700 ring-stone-200 hover:bg-white"
                              }`}
                            >
                              {option.short}
                              <span className="mt-0.5 block text-[12px] font-normal text-stone-500">
                                {board.weights[option.id]}% → {nextWeight}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        disabled={!counterpart}
                        onClick={apply}
                        className="mt-3 rounded-xl bg-[#C4A35A] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#B3944C] disabled:opacity-40"
                      >
                        Apply
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
