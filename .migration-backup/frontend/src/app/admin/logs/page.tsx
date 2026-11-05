"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ──────────────────────────────────────────
   Types
────────────────────────────────────────── */
interface LogEntry {
    id: string;
    session_id: string;
    role: "user" | "bot" | string;
    message: string;
    created_at: string;
}

/* ──────────────────────────────────────────
   Mock data
────────────────────────────────────────── */
const INITIAL_MOCK_LOGS: LogEntry[] = [
    {
        id: "log-101",
        session_id: "sess-9a4f-12bc",
        role: "user",
        message: "is there a gym on campus?",
        created_at: "2026-06-20T10:15:30Z",
    },
    {
        id: "log-102",
        session_id: "sess-9a4f-12bc",
        role: "bot",
        message:
            "Yes, the campus gym is located at the Student Activity Center (SAC) on Level 1. It is free for all students and is open from 8:00 AM to 10:00 PM daily.",
        created_at: "2026-06-20T10:15:45Z",
    },
    {
        id: "log-103",
        session_id: "sess-9a4f-12bc",
        role: "user",
        message: "thank you, what about swimming pool?",
        created_at: "2026-06-20T10:16:10Z",
    },
    {
        id: "log-104",
        session_id: "sess-9a4f-12bc",
        role: "bot",
        message:
            "The swimming pool is situated next to Block B1. Opening hours are 4:00 PM to 8:00 PM on weekdays and 9:00 AM to 8:00 PM on weekends. Proper swimwear is required.",
        created_at: "2026-06-20T10:16:25Z",
    },
    {
        id: "log-105",
        session_id: "sess-3d2e-56f8",
        role: "user",
        message: "what is the email for hostel office?",
        created_at: "2026-06-20T09:42:00Z",
    },
    {
        id: "log-106",
        session_id: "sess-3d2e-56f8",
        role: "bot",
        message:
            "You can reach the Student Accommodation Office via email at accommodation@xmu.edu.my or visit their counter at Block B1, Ground Floor.",
        created_at: "2026-06-20T09:42:15Z",
    },
    {
        id: "log-107",
        session_id: "sess-11aa-22bb",
        role: "user",
        message: "can freshman apply for merit scholarship?",
        created_at: "2026-06-20T08:05:00Z",
    },
    {
        id: "log-108",
        session_id: "sess-11aa-22bb",
        role: "bot",
        message:
            "Yes, freshmen are automatically considered for the XMUM Merit Scholarship during admission based on their entry grades (e.g. A-Levels, UEC, Foundation). No separate application form is required.",
        created_at: "2026-06-20T08:05:20Z",
    },
];

/* ──────────────────────────────────────────
   Helpers
────────────────────────────────────────── */
function formatTimestamp(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return dateString;
    }
}

function shortSession(sessionId: string): string {
    return "#" + sessionId.replace(/-/g, "").slice(-8);
}

/* ──────────────────────────────────────────
   Role badge (Dark Mode Adjusted)
────────────────────────────────────────── */
function RoleBadge({ role }: { role: string }) {
    if (role === "user") {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[11px] font-semibold whitespace-nowrap">
                <svg
                    className="w-3 h-3 text-slate-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
                User
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-semibold whitespace-nowrap">
            🤖 Bot
        </span>
    );
}

/* ──────────────────────────────────────────
   Main Page
────────────────────────────────────────── */
export default function ConversationLogsCMS() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRole, setSelectedRole] = useState("all");
    const [selectedSession, setSelectedSession] = useState("all");

    // Modal
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [currentLog, setCurrentLog] = useState<LogEntry | null>(null);

    // Toast
    const [toast, setToast] = useState<{
        message: string;
        type: "success" | "error";
    } | null>(null);

    const triggerToast = (
        message: string,
        type: "success" | "error" = "success",
    ) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("conversation_logs")
                .select("id, session_id, role, message, created_at")
                .order("created_at", { ascending: false });
            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error("Error fetching logs, using initial mock structure:", err);
            setLogs(INITIAL_MOCK_LOGS);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const openDeleteModal = (log: LogEntry) => {
        setCurrentLog(log);
        setIsDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!currentLog) return;
        try {
            const { error } = await supabase
                .from("conversation_logs")
                .delete()
                .eq("id", currentLog.id);
            if (error) throw error;
            setLogs((prev) => prev.filter((l) => l.id !== currentLog.id));
            triggerToast("Log entry deleted successfully!");
        } catch (err) {
            console.error("Error deleting log:", err);
            triggerToast("Failed to delete log entry.", "error");
        }
        setIsDeleteOpen(false);
        setCurrentLog(null);
    };

    const handleClearAll = async () => {
        if (
            !confirm(
                "Delete ALL conversation logs from Supabase? This cannot be undone.",
            )
        )
            return;
        try {
            const { error } = await supabase
                .from("conversation_logs")
                .delete()
                .neq("id", "00000000-0000-0000-0000-000000000000");
            if (error) throw error;
            setLogs([]);
            triggerToast("All logs cleared!");
        } catch (err) {
            console.error("Error clearing logs:", err);
            triggerToast("Failed to clear logs.", "error");
        }
    };

    /* ── Unique sessions for dropdown ── */
    const uniqueSessions = Array.from(new Set(logs.map((l) => l.session_id)));

    /* ── Filtered list ── */
    const filteredLogs = logs.filter((log) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
            log.message.toLowerCase().includes(q) ||
            log.session_id.toLowerCase().includes(q);
        const matchesRole = selectedRole === "all" || log.role === selectedRole;
        const matchesSession =
            selectedSession === "all" || log.session_id === selectedSession;
        return matchesSearch && matchesRole && matchesSession;
    });

    return (
        <div className="w-full p-4 sm:p-6 lg:p-8 text-slate-100">
            <div className="mx-auto max-w-7xl space-y-6 relative">
                {/* ── Toast Alert ── */}
                {toast && (
                    <div
                        className={`fixed top-5 right-5 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-semibold border ${toast.type === "success"
                                ? "bg-emerald-600 border-emerald-500"
                                : "bg-red-600 border-red-500"
                            }`}
                    >
                        <span>{toast.type === "success" ? "✅" : "⚠️"}</span>
                        <span className="whitespace-nowrap">{toast.message}</span>
                    </div>
                )}

                {/* ── Control Bar ── */}
                <div className="bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <svg
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search messages or session IDs…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-white/5 rounded-full text-sm text-slate-200 bg-slate-950/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Configuration / Action Filters */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
                        {/* Session select */}
                        <select
                            value={selectedSession}
                            onChange={(e) => setSelectedSession(e.target.value)}
                            className="flex-1 md:w-44 px-3 py-2.5 border border-white/5 rounded-xl text-sm text-slate-300 bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            style={{ colorScheme: "dark" }}
                        >
                            <option value="all">All Sessions</option>
                            {uniqueSessions.map((s) => (
                                <option key={s} value={s}>
                                    {shortSession(s)}
                                </option>
                            ))}
                        </select>

                        {/* Role select */}
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="flex-1 md:w-36 px-3 py-2.5 border border-white/5 rounded-xl text-sm text-slate-300 bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            style={{ colorScheme: "dark" }}
                        >
                            <option value="all">All Roles</option>
                            <option value="user">User</option>
                            <option value="bot">Bot</option>
                        </select>

                        {/* Clear All Trigger Button */}
                        <button
                            onClick={handleClearAll}
                            disabled={logs.length === 0}
                            className="whitespace-nowrap flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-md transition-all cursor-pointer"
                        >
                            <svg
                                className="w-4 h-4 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                            </svg>
                            Clear All
                        </button>
                    </div>
                </div>

                {/* ── Table Area ── */}
                <div className="bg-slate-900/30 rounded-2xl border border-white/5 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-20 text-center max-w-sm mx-auto animate-pulse">
                            <span className="text-4xl block mb-4">⏳</span>
                            <p className="font-bold text-slate-300 text-sm">Loading logs...</p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="p-20 text-center max-w-sm mx-auto">
                            <span className="text-4xl block mb-4">📄</span>
                            <p className="font-bold text-slate-300 text-sm">No logs found</p>
                            <p className="text-xs text-slate-500 mt-1">
                                No conversation logs match your current query parameter filters.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse min-w-[850px]">
                                <thead>
                                    <tr className="bg-slate-900/80 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-white/5">
                                        <th className="py-3.5 px-4 w-36">Time</th>
                                        <th className="py-3.5 px-4 w-28">Session</th>
                                        <th className="py-3.5 px-4 w-28">Role</th>
                                        <th className="py-3.5 px-4">Message</th>
                                        <th className="py-3.5 px-4 text-right w-20 whitespace-nowrap">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-xs sm:text-sm text-slate-300">
                                    {filteredLogs.map((log, idx) => (
                                        <tr
                                            key={log.id}
                                            className={`transition-colors hover:bg-indigo-500/[0.02] ${idx % 2 === 0 ? "" : "bg-white/[0.01]"
                                                }`}
                                        >
                                            {/* Timestamp */}
                                            <td className="py-4 px-4 text-[11px] text-slate-500 font-mono whitespace-nowrap">
                                                {formatTimestamp(log.created_at)}
                                            </td>

                                            {/* Session ID Token */}
                                            <td className="py-4 px-4">
                                                <span className="font-mono text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-white/5 whitespace-nowrap">
                                                    {shortSession(log.session_id)}
                                                </span>
                                            </td>

                                            {/* User/Bot Role */}
                                            <td className="py-4 px-4">
                                                <RoleBadge role={log.role} />
                                            </td>

                                            {/* Log Message Content */}
                                            <td className="py-4 px-4 text-slate-400 max-w-lg break-words leading-relaxed">
                                                {log.message}
                                            </td>

                                            {/* Action Triggers */}
                                            <td className="py-4 px-4 text-right whitespace-nowrap w-20">
                                                <button
                                                    onClick={() => openDeleteModal(log)}
                                                    title="Delete log entry"
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer"
                                                >
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
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── DELETE CONFIRMATION MODAL ── */}
                {isDeleteOpen && currentLog && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[99999]">
                        <div className="bg-slate-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            {/* Modal Header */}
                            <div className="bg-red-950/40 text-red-400 border-b border-white/5 px-6 py-4 flex items-center gap-2">
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                                <h3 className="font-bold text-sm">Confirm Delete Log</h3>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-4">
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Are you sure you want to delete this log entry? This operation
                                    will remove the item from local display state context.
                                </p>
                                <div className="bg-slate-900 border border-white/5 p-4 rounded-xl text-xs space-y-2.5">
                                    <div className="flex items-center gap-2">
                                        <RoleBadge role={currentLog.role} />
                                        <span className="font-mono text-slate-500 text-[10px]">
                                            {shortSession(currentLog.session_id)}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 italic leading-relaxed break-words">
                                        &ldquo;{currentLog.message}&rdquo;
                                    </p>
                                </div>

                                {/* Actions Button Panel */}
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={() => setIsDeleteOpen(false)}
                                        className="whitespace-nowrap px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-semibold rounded-xl border border-white/5 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="whitespace-nowrap px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow transition"
                                    >
                                        Delete Log
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}