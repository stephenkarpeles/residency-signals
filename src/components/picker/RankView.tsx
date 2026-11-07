"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePicker } from "@/context/PickerProvider";
import { getCatalogProgram } from "@/lib/catalog";
import { PICKER_CRITERIA } from "@/lib/picker";

export function RankView() {
  const router = useRouter();
  const { board, moveProgram, acceptOrder } = usePicker();
  const [index, setIndex] = useState(0);
  const criterion = PICKER_CRITERIA[index];
  const order = board.orders[criterion.id] ?? board.programIds;
  const confirmedCount = PICKER_CRITERIA.filter((item) => board.confirmed.includes(item.id)).length;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function go(nextIndex: number) {
    acceptOrder(criterion.id);
    if (nextIndex >= PICKER_CRITERIA.length) {
      router.push("/picker/board");
      return;
    }
    setIndex(Math.max(0, nextIndex));
  }

  function onDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;
    if (!overId || event.active.id === overId) return;
    moveProgram(criterion.id, String(event.active.id), String(overId));
  }

  if (board.programIds.length === 0) {
    return (
      <EmptyRank />
    );
  }

  return (
    <div>
      <header className="max-w-2xl">
        <p className="text-[12px] font-medium tracking-[0.16em] text-[#8A6A2A] uppercase">
          Rank · {index + 1} of {PICKER_CRITERIA.length}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
          {criterion.label}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-500">{criterion.description}</p>
        <p className="mt-2 text-[13px] text-stone-500">
          Drag the strongest program to the top. #1 is best. {confirmedCount} of{" "}
          {PICKER_CRITERIA.length} areas are counted on the board.
        </p>
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        {PICKER_CRITERIA.map((item, itemIndex) => {
          const active = itemIndex === index;
          const done = board.confirmed.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (itemIndex !== index) acceptOrder(criterion.id);
                setIndex(itemIndex);
              }}
              className={`rounded-xl px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors ${
                active
                  ? "bg-white font-medium text-stone-900 shadow-sm ring-1 ring-stone-200/70"
                  : "text-stone-600 hover:bg-white/70 hover:text-stone-900"
              }`}
            >
              {item.short}
              {done ? <span className="ml-1 text-[#3F5C51]">✓</span> : null}
            </button>
          );
        })}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol className="mt-5 space-y-2">
            {order.map((programId, rank) => (
              <RankRow key={programId} programId={programId} rank={rank} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => go(index - 1)}
          className="rounded-xl px-3 py-2 text-[13px] font-medium text-stone-600 hover:bg-white disabled:opacity-40"
        >
          Previous area
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          className="rounded-xl bg-[#C4A35A] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#B3944C]"
        >
          {index === PICKER_CRITERIA.length - 1 ? "Done — see the board" : "Next area"}
        </button>
      </div>
    </div>
  );
}

function RankRow({ programId, rank }: { programId: string; rank: number }) {
  const program = getCatalogProgram(programId);
  const sortable = useSortable({ id: programId });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  return (
    <li
      ref={sortable.setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-2xl bg-white px-3 py-3 ring-1 ring-stone-200/80 ${
        sortable.isDragging ? "z-10 opacity-70 shadow-md" : ""
      }`}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-grab items-center gap-3 text-left active:cursor-grabbing"
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums ${
            rank === 0 ? "bg-[#F3E6C0] text-[#8A6A2A]" : "bg-stone-100 text-stone-600"
          }`}
        >
          {rank + 1}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-medium text-stone-900">
            {program?.name ?? programId}
          </span>
          <span className="block truncate text-[12px] text-stone-500">
            {program ? `${program.city}, ${program.state} · ${program.specialty}` : "Missing from the directory"}
          </span>
        </span>
      </button>
      <span className="hidden pr-2 text-stone-300 sm:block" aria-hidden>
        <Grip />
      </span>
    </li>
  );
}

function Grip() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <circle cx="4" cy="3" r="1.1" />
      <circle cx="10" cy="3" r="1.1" />
      <circle cx="4" cy="7" r="1.1" />
      <circle cx="10" cy="7" r="1.1" />
      <circle cx="4" cy="11" r="1.1" />
      <circle cx="10" cy="11" r="1.1" />
    </svg>
  );
}

function EmptyRank() {
  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Rank your interviews</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-stone-500">
        Add the programs that invited you, then drag them into order for each area.
      </p>
      <Link
        href="/picker"
        className="mt-5 inline-flex rounded-xl bg-[#C4A35A] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#B3944C]"
      >
        Add interviews
      </Link>
    </div>
  );
}
