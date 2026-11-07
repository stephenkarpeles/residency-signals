"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useApp } from "@/context/AppProvider";
import { usePicker } from "@/context/PickerProvider";
import {
  CATALOG_GENERATED,
  getCatalogProgram,
  searchCatalog,
  specialtyLabel,
  type CatalogProgram,
} from "@/lib/catalog";

export function InterviewsView() {
  const { board, addProgram, removeProgram, clearPrograms } = usePicker();
  const { specialties } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const searchId = useId();
  const selected = useMemo(() => new Set(board.programIds), [board.programIds]);
  const specialtyKey = specialties.join("|");
  const specialtyNames = specialties.map((name) => specialtyLabel(name)).join(", ");

  const results = useMemo(() => searchCatalog(query, specialties), [query, specialties]);
  const visible = results.matches;
  const showList = open;

  useEffect(() => {
    setHighlight(0);
  }, [query, specialtyKey]);

  useEffect(() => {
    setOpen(false);
  }, [specialtyKey]);

  useLayoutEffect(() => {
    if (!showList) return;
    const list = listRef.current;
    if (!list) return;
    const fit = () => {
      const top = list.getBoundingClientRect().top;
      const available = Math.floor(window.innerHeight - top - 28);
      list.style.maxHeight = `${Math.max(140, available)}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("scroll", fit, true);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("scroll", fit, true);
    };
  }, [showList, visible.length]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(program: CatalogProgram) {
    if (selected.has(program.id)) return;
    addProgram(program.id);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showList) {
      if (event.key === "ArrowDown") setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) => Math.min(current + 1, Math.max(visible.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const program = visible[highlight];
      if (program) choose(program);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const directoryCount = useMemo(() => searchCatalog("", specialties).total, [specialties]);

  return (
    <div>
      <header className="max-w-2xl">
        <p className="text-[12px] font-medium tracking-[0.16em] text-[#8A6A2A] uppercase">
          Interview invites
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
          Where did you get an interview?
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-500">
          Add every program that invited you in {specialtyNames || "your specialty"}. Search, then
          rank this list one area at a time. Change specialty from the top bar.
        </p>
      </header>

      <p className="mt-6 text-[12px] text-stone-500">
        {directoryCount.toLocaleString()} {specialtyNames || "residency"} programs in the ACGME
        directory, updated {CATALOG_GENERATED}.
      </p>

      <div ref={rootRef} className="relative mt-5 max-w-2xl">
        <label className="block text-[13px] font-medium text-stone-700" htmlFor={searchId}>
          Search programs
        </label>
        <div className="relative mt-1.5">
          <input
            id={searchId}
            value={query}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            placeholder={specialties.length > 1 ? "Search your specialties" : "Search this specialty"}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={(event) => {
              if (rootRef.current?.contains(event.relatedTarget as Node)) return;
              setOpen(false);
            }}
            onKeyDown={onKeyDown}
            className={`w-full rounded-xl bg-white py-2.5 pl-3 text-[15px] text-stone-900 ring-1 ring-stone-200 outline-none focus:ring-2 focus:ring-[#C4A35A] ${
              showList ? "pr-10" : "pr-3"
            }`}
          />
          {showList ? (
            <button
              type="button"
              aria-label="Close results"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setOpen(false)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path
                  d="M3 3l6 6M9 3l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
        {showList ? (
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            className="absolute z-20 mt-2 w-full overflow-y-auto overscroll-contain rounded-2xl bg-white py-1 shadow-lg ring-1 ring-stone-200"
          >
            {visible.length === 0 ? (
              <p className="px-4 py-3 text-[13px] text-stone-500">
                {query.trim()
                  ? "No programs match that search."
                  : "Type a program, city, or state."}
              </p>
            ) : (
              visible.map((program, index) => {
                const added = selected.has(program.id);
                const active = index === highlight;
                return (
                  <button
                    key={program.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={added}
                    onMouseEnter={() => setHighlight(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(program)}
                    className={`flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left ${
                      active ? "bg-[#F6F3EE]" : ""
                    } ${added ? "cursor-default opacity-60" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium text-stone-900">
                        {program.name}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-stone-500">
                        {program.city}, {program.state} · {program.specialty}
                      </span>
                    </span>
                    <span className="shrink-0 pt-0.5 text-[12px] font-medium text-stone-400">
                      {added ? "Added" : program.id}
                    </span>
                  </button>
                );
              })
            )}
            {results.total > visible.length ? (
              <p className="border-t border-stone-100 px-4 py-2 text-[12px] text-stone-500">
                Showing {visible.length} of {results.total.toLocaleString()}. Keep typing to narrow it.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-stone-900">
            {board.programIds.length === 0
              ? "No interviews yet"
              : `${board.programIds.length} interview${board.programIds.length === 1 ? "" : "s"}`}
          </h2>
          <div className="flex items-center gap-2">
            {board.programIds.length > 0 && confirmClear ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    clearPrograms();
                    setConfirmClear(false);
                  }}
                  className="rounded-xl bg-stone-900 px-3 py-1.5 text-[13px] font-medium text-white"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-xl px-3 py-1.5 text-[13px] font-medium text-stone-600 hover:bg-white"
                >
                  Cancel
                </button>
              </>
            ) : board.programIds.length > 0 ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="rounded-xl px-3 py-1.5 text-[13px] font-medium text-stone-600 hover:bg-white"
              >
                Clear all
              </button>
            ) : null}
            {board.programIds.length > 0 ? (
              <Link
                href="/picker/rank"
                className="rounded-xl bg-[#C4A35A] px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#B3944C]"
              >
                Rank them
              </Link>
            ) : null}
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {board.programIds.map((id) => {
            const program = getCatalogProgram(id);
            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200/80"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-stone-900">
                    {program?.name ?? "Program no longer in the directory"}
                  </p>
                  <p className="truncate text-[12px] text-stone-500">
                    {program
                      ? `${program.city}, ${program.state} · ${program.specialty}`
                      : id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeProgram(id)}
                  className="rounded-xl px-2.5 py-1.5 text-[13px] font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
