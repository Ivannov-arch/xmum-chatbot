"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isDark, setIsDark] = useState(false);

  // Check if mock session exists
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push("/admin");
      }
    });
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setIsDark(systemPrefersDark);
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Access granted. Redirecting to dashboard...");
      setTimeout(() => {
        router.push("/admin");
      }, 800);
    }
  };

  return (
    <div
      className={`min-h-screen w-full flex font-sans transition-colors duration-500 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"
      }`}
    >
      {/* LEFT PANEL: BRAND SHOWCASE */}
      <div
        className={`hidden md:flex md:w-[45%] lg:w-[40%] flex-col justify-between p-12 relative overflow-hidden border-r transition-colors duration-500 ${
          isDark
            ? "bg-slate-900/40 border-slate-800"
            : "bg-slate-50 border-slate-100"
        }`}
      >
        {/* Decorative background pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div
          className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-colors ${
            isDark ? "bg-indigo-500/10" : "bg-indigo-500/20"
          }`}
        />

        {/* Top Branding Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-md shadow-indigo-600/20">
            XMU
          </div>
          <span className="font-bold text-sm tracking-wider uppercase opacity-80">
            XMUM Assistant
          </span>
        </div>

        {/* Center Typography & Value Proposition */}
        <div className="my-auto space-y-4 relative z-10">
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-none bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
            Control center for campus intelligence.
          </h2>
          <p
            className={`text-sm leading-relaxed max-w-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Manage and update the knowledge base of the XMUM Campus Assistant
            chatbot with ease.
          </p>
        </div>

        {/* Bottom Footer Text */}
        <div className="text-xs opacity-50 relative z-10">
          &copy; {new Date().getFullYear()} Xiamen University Malaysia.
        </div>
      </div>

      {/* RIGHT PANEL: LOGIN FORM */}
      <div className="w-full md:w-[55%] lg:w-[60%] flex flex-col justify-center items-center p-6 sm:p-12 relative">
        {/* Floating dark mode toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          type="button"
          className={`absolute top-6 right-6 p-2.5 rounded-xl border transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 ${
            isDark
              ? "bg-slate-900 border-slate-800 text-amber-400"
              : "bg-slate-50 border-slate-200 text-slate-600"
          }`}
        >
          {isDark ? (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m2.828 9.9a5 5 0 117.072 0l-7.072 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>

        <div className="w-full max-w-sm space-y-12">
          {/* Mobile Header */}
          <div className="md:hidden space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-sm mx-auto shadow-md">
              XMU
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                Admin Portal CMS
              </h1>
              <p
                className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                Sign in to manage chatbot knowledge base
              </p>
            </div>
          </div>

          {/* Desktop Form Title */}
          <div className="hidden md:block space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Welcome Back, Admin!
            </h1>
            <p
              className={`text-sm leading-normal ${isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              Please sign in to access the admin dashboard and manage the
              chatbot system.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div
              className={`p-4 border text-[11px] rounded-xl transition-all ${
                isDark
                  ? "bg-indigo-950/20 border-indigo-900/40 text-indigo-300"
                  : "bg-indigo-50/50 border-indigo-100 text-indigo-900"
              }`}
            ></div>

            {errorMsg && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium rounded-xl flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-200">
                <span>⚠️</span>{" "}
                <span className="flex-1 leading-normal">{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium rounded-xl flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-200">
                <span>✅</span>{" "}
                <span className="flex-1 leading-normal">{successMsg}</span>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="name@xmu.edu.my"
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-transparent"
                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-transparent focus:bg-white"
                }`}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:border-transparent"
                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-transparent focus:bg-white"
                }`}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 px-4 font-bold rounded-xl text-sm transition-all duration-150 flex justify-center items-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none shadow-sm ${
                  isDark
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10"
                    : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10"
                }`}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Verifying account...</span>
                  </>
                ) : (
                  "Sign in to Portal"
                )}
              </button>
            </div>

            <div className="pt-6 text-center">
              <a
                href="/"
                className={`text-xs font-semibold transition-all hover:underline inline-block py-1 ${
                  isDark
                    ? "text-slate-500 hover:text-indigo-400"
                    : "text-slate-400 hover:text-indigo-600"
                }`}
              >
                &larr; Back to Campus Chatbot
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
