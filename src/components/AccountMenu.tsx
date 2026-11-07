"use client";

import { useAuth } from "@/context/AuthProvider";

export function AccountMenu() {
  const { user, signOut } = useAuth();

  return (
    <div className="mt-auto border-t border-stone-200/80 px-3 py-3 lg:hidden">
      <p className="px-3 py-1.5 text-[12px] break-words text-stone-500">{user?.email}</p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="w-full rounded-lg px-3 py-1.5 text-left text-[13px] font-medium text-stone-600 transition-colors hover:bg-stone-200/50 hover:text-stone-900"
      >
        Sign out
      </button>
    </div>
  );
}
