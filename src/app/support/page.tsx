"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ThreadListItem = {
  id: string; status: string; updatedAt: string;
  user: { id: string; fullName: string; email: string };
  lastMessage: { body: string; createdAt: string } | null;
};
type Message = {
  id: string; body: string; createdAt: string; fromSupport: boolean; senderName: string;
};
type ThreadDetail = {
  id: string; status: string;
  user: { id: string; fullName: string; email: string };
  messages: Message[];
};

async function api<T>(path: string, body?: object): Promise<T> {
  const response = await fetch("/api/support/" + path, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(response.status === 403 ? "Only authorised KASSA platform support administrators can access this inbox."
      : response.status === 401 ? "Please sign in to KASSA before opening the support inbox."
      : payload?.message || "Could not reach the support service.");
  }
  return payload as T;
}

export default function SupportInbox() {
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ThreadDetail | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(() => api<ThreadListItem[]>("inbox")
    .then(list => { setThreads(list); setError(""); })
    .catch(cause => { setError(cause instanceof Error ? cause.message : "Cannot load inbox."); }), []);
  const refreshThread = useCallback((id: string) => api<ThreadDetail>("inbox/" + encodeURIComponent(id))
    .then(result => { setSelected(result); })
    .catch(cause => { setError(cause instanceof Error ? cause.message : "Cannot load thread."); }), []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 15000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (!selectedId) return;
    void refreshThread(selectedId);
    const timer = setInterval(() => { void refreshThread(selectedId); }, 15000);
    return () => clearInterval(timer);
  }, [selectedId, refreshThread]);

  const send = async () => {
    if (!selectedId || !reply.trim() || busy) return;
    setBusy(true); setError("");
    try {
      await api("inbox/" + encodeURIComponent(selectedId) + "/reply", { body: reply.trim() });
      setReply("");
      await Promise.all([refreshThread(selectedId), refresh()]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Reply failed."); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-[#F8FAF9] p-4 text-[#172923] md:p-8">
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">KASSA Support inbox</h1>
          <p className="mt-1 text-sm text-gray-600">Private conversations with signed-in KASSA users</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { void refresh(); if (selectedId) void refreshThread(selectedId); }}
            className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800">Refresh</button>
          <Link className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white" href="/dashboard">Dashboard</Link>
        </div>
      </div>
      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      <div className="grid gap-4 md:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
        <section className="rounded-xl border border-gray-200 bg-white p-3" aria-label="Support conversations">
          <h2 className="mb-3 px-2 text-lg font-bold">Conversations ({threads.length})</h2>
          {!threads.length && <p className="px-2 py-4 text-sm text-gray-500">No conversations to display.</p>}
          {threads.map(thread =>
            <button key={thread.id} type="button" onClick={() => setSelectedId(thread.id)}
              className={"mb-2 w-full rounded-lg border p-3 text-left " +
                (thread.id === selectedId ? "border-emerald-700 bg-emerald-50" : "border-gray-200 hover:bg-gray-50")}>
              <div className="flex justify-between gap-3">
                <span className="font-semibold">{thread.user.fullName}</span>
                <span className="text-xs text-gray-500">{thread.status}</span>
              </div>
              <p className="mt-1 truncate text-xs text-gray-500">{thread.user.email}</p>
              <p className="mt-2 truncate text-sm text-gray-700">{thread.lastMessage?.body ?? "No messages"}</p>
            </button>
          )}
        </section>
        <section className="flex min-h-[440px] flex-col rounded-xl border border-gray-200 bg-white p-4" aria-label="Support messages">
          {!selected ? <p className="m-auto text-sm text-gray-500">Select a conversation to read and reply.</p> : <>
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-lg font-semibold">{selected.user.fullName}</h2>
              <p className="text-sm text-gray-500">{selected.user.email}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-auto py-5" aria-live="polite">
              {selected.messages.map(message => <div key={message.id}
                className={"max-w-[85%] rounded-xl p-3 text-sm " +
                  (message.fromSupport ? "ml-auto bg-emerald-800 text-white" : "bg-gray-100 text-gray-800")}>
                <p className="mb-1 text-xs font-semibold opacity-70">{message.senderName}</p>
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <p className="mt-2 text-[11px] opacity-70">{new Date(message.createdAt).toLocaleString()}</p>
              </div>)}
            </div>
            <form onSubmit={event => { event.preventDefault(); void send(); }} className="mt-3 border-t border-gray-100 pt-4">
              <label className="block text-sm font-semibold" htmlFor="support-reply">Reply</label>
              <textarea id="support-reply" value={reply} onChange={event => setReply(event.target.value)}
                maxLength={1000} rows={3} placeholder="Write a reply for the customer…"
                className="mt-2 w-full rounded-lg border border-gray-300 p-3 text-sm"/>
              <button type="submit" disabled={busy || !reply.trim()}
                className="mt-3 rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? "Sending…" : "Send reply"}
              </button>
            </form>
          </>}
        </section>
      </div>
    </div>
  </main>;
}
