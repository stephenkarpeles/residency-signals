"use client";

import { useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";

export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F6F3EE] text-sm text-stone-500">
      {label}
    </div>
  );
}

export function SetupScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F6F3EE] px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200/80">
        <Brand />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-stone-900">
          Connect Supabase to sign in
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-500">
          Accounts save both the signal board and the interview picker. Add your project keys,
          run the SQL once, then restart the app.
        </p>
        <ol className="mt-6 space-y-3 text-[14px] leading-relaxed text-stone-700">
          <li>1. Create a project at supabase.com.</li>
          <li>2. In the SQL editor, run everything in supabase/schema.sql.</li>
          <li>
            3. Copy the project URL and anon key into .env.local as
            NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </li>
          <li>4. Restart the dev server and create an account.</li>
        </ol>
      </div>
    </div>
  );
}

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setSubmitting(true);
    setMessage(null);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else if (!data.session) {
        setMessage("Check your email to confirm the account, then sign in.");
        setMode("signin");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
    }
    setSubmitting(false);
  }

  const creating = mode === "signup";

  return (
    <div className="grid min-h-screen place-items-center bg-[#F6F3EE] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200/80">
        <Brand />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-stone-900">
          {creating ? "Create an account" : "Sign in"}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-500">
          Your signals and interview rankings stay with this account.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[13px] font-medium text-stone-700">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border-0 bg-[#F6F3EE] px-3 py-2.5 text-[15px] text-stone-900 ring-1 ring-stone-200 outline-none focus:ring-2 focus:ring-[#C4A35A]"
            />
          </label>
          <div>
            <label htmlFor="password" className="text-[13px] font-medium text-stone-700">
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={creating ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border-0 bg-[#F6F3EE] px-3 py-2.5 pr-11 text-[15px] text-stone-900 ring-1 ring-stone-200 outline-none focus:ring-2 focus:ring-[#C4A35A]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-white hover:text-stone-700"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          {message ? (
            <p className="text-[13px] leading-relaxed text-[#8A6A2A]">{message}</p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#C4A35A] px-4 py-2.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Working…" : creating ? "Create account" : "Sign in"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode(creating ? "signin" : "signup");
            setMessage(null);
          }}
          className="mt-4 text-[13px] font-medium text-stone-600 underline decoration-transparent underline-offset-2 transition-colors hover:text-stone-900 hover:decoration-stone-400"
        >
          {creating ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M1.75 9S4.1 4.75 9 4.75 16.25 9 16.25 9 13.9 13.25 9 13.25 1.75 9 1.75 9Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="2.1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M3 3.5 15 14.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M7.1 7.35A2.15 2.15 0 0 0 9 11.15c.45 0 .86-.14 1.2-.38M4.15 5.7C2.7 6.75 1.75 9 1.75 9S4.1 13.25 9 13.25c1.05 0 2-.22 2.84-.6M7.35 4.95A8.4 8.4 0 0 1 9 4.75C13.9 4.75 16.25 9 16.25 9c-.28.48-.64.98-1.06 1.45"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6E8B80] to-[#3F5C51] text-sm font-semibold text-white shadow-sm">
        RF
      </span>
      <div>
        <p className="text-[15px] font-semibold tracking-tight text-stone-900">Residency Finder</p>
        <p className="text-[11px] text-stone-500">Residency decisions</p>
      </div>
    </div>
  );
}
