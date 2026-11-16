"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getPendingCount } from "@/services/suggestionService";

function IconMenu() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}
function IconClose() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
function IconDashboard() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75v-5.25h-4.5V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z"
      />
    </svg>
  );
}
function IconBook() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}
function IconChat() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}
function IconExternal() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}
function IconLightbulb() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) {
        router.push("/admin/login");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session && pathname !== "/admin/login") {
        router.push("/admin/login");
      }
    });

    // Fetch pending suggestions count for badge
    getPendingCount().then(setPendingCount).catch(() => {});

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };
  const closeSidebar = () => setMobileSidebarOpen(false);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0b1020] text-slate-100 z-[99999]">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-semibold tracking-wide text-slate-400">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex bg-[#0b1020] text-slate-100 z-[9999] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#0f172a] border-r border-white/5 flex flex-col justify-between transition-transform ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div>
          {/* Logo & Branding */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs">
                XMU
              </div>
              <div>
                <p className="font-bold text-sm">XMUM CMS</p>
                <p className="text-[10px] text-indigo-400 uppercase tracking-widest">
                  Admin Portal
                </p>
              </div>
            </div>
            {/* 2. Added Close Button for Mobile */}
            <button className="md:hidden" onClick={closeSidebar}>
              <IconClose />
            </button>
          </div>

          {/* Navigation - Added closeSidebar to onClick */}
          <nav className="p-4 space-y-2">
            <Link
              href="/admin"
              onClick={closeSidebar}
              className={`flex items-center gap-3 p-3 rounded-lg ${pathname === "/admin" ? "bg-indigo-600" : "hover:bg-white/5"}`}
            >
              <IconDashboard /> Dashboard
            </Link>
            <Link
              href="/admin/knowledge"
              onClick={closeSidebar}
              className={`flex items-center gap-3 p-3 rounded-lg ${pathname.startsWith("/admin/knowledge") ? "bg-indigo-600" : "hover:bg-white/5"}`}
            >
              <IconBook /> Knowledge Base
            </Link>
            <Link
              href="/admin/logs"
              onClick={closeSidebar}
              className={`flex items-center gap-3 p-3 rounded-lg ${pathname.startsWith("/admin/logs") ? "bg-indigo-600" : "hover:bg-white/5"}`}
            >
              <IconChat /> Logs
            </Link>
            <Link
              href="/admin/suggestions"
              onClick={closeSidebar}
              className={`flex items-center gap-3 p-3 rounded-lg ${pathname.startsWith("/admin/suggestions") ? "bg-indigo-600" : "hover:bg-white/5"}`}
            >
              <IconLightbulb />
              <span className="flex-1">Suggestions</span>
              {pendingCount > 0 && (
                <span className="text-xs font-bold bg-amber-500 text-white rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {pendingCount}
                </span>
              )}
            </Link>
            <div className="border-t border-white/5 my-2"></div>
            <Link
              href="/"
              target="_blank"
              onClick={closeSidebar}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-slate-400"
            >
              <IconExternal /> Go to Chat
            </Link>
          </nav>
        </div>
        {/* User profile & Logout */}
        <div className="p-4 border-t border-white/5 bg-slate-950/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-md font-semibold text-slate-200 truncate">
                {session?.user?.email || "Admin User"}
              </p>
              <p className="text-sm text-slate-500">Administrator</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-red-400 hover:text-rose-500 hover:bg-rose-600/10 rounded-lg transition-all cursor-pointer"
              title="Sign Out"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full h-full overflow-hidden">
        <header className="h-14 flex items-center px-6 border-b border-white/5">
          <button
            className="md:hidden mr-4"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          >
            <IconMenu />
          </button>
          <h1 className="font-semibold text-sm">Admin Portal</h1>
        </header>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
