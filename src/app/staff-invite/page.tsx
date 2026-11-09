"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  acceptInvitation, previewInvitation, registerInvited, type InvitationPreview,
} from "@/lib/staff-branches-client";

function InvitationContent() {
  const router = useRouter();
  const query = useSearchParams();
  const token = query.get("token") ?? "";
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const next = "/staff-invite?token=" + encodeURIComponent(token);
  const signInUrl = "/login?next=" + encodeURIComponent(next);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!token) {
        setError("The invitation link is missing its token.");
        setLoading(false);
        return;
      }
      try {
        const [details, userResponse] = await Promise.all([
          previewInvitation(token),
          fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" }),
        ]);
        if (!active) return;
        setInvitation(details);
        setSignedIn(userResponse.ok);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load invitation.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [token]);

  async function accept() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await acceptInvitation(token);
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to accept invitation.");
    } finally { setSaving(false); }
  }

  async function createAccount() {
    if (saving) return;
    if (password.length < 12) return setError("Password must be at least 12 characters.");
    if (password !== confirmation) return setError("Passwords do not match.");
    setSaving(true);
    setError("");
    try {
      await registerInvited(token, password);
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create account.");
    } finally { setSaving(false); }
  }

  async function switchAccount() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: "{}",
      });
    } finally {
      window.location.assign(signInUrl);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <main className="mx-auto max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-[#08745F] px-6 py-5 text-white">
          <p className="text-sm font-semibold tracking-wide">KASSA</p>
          <h1 className="mt-2 text-2xl font-semibold">Staff invitation</h1>
        </div>
        <div className="space-y-5 p-6">
          {loading && <p role="status" className="text-sm text-gray-500">Checking your invitation...</p>}
          {error && <p role="alert" className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {invitation && (
            <>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-700" size={20}/>
                <div>
                  <p className="font-semibold text-gray-900">{invitation.businessName} invited you to join Kassa.</p>
                  <p className="mt-1 text-sm text-gray-600">{invitation.fullName} ({invitation.email})</p>
                  <p className="mt-1 text-sm text-gray-600">Role: {invitation.roleName}</p>
                  <p className="text-sm text-gray-600">Branch: {invitation.branchName}</p>
                </div>
              </div>
              {invitation.message && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{invitation.message}</p>}
              <p className="text-xs text-gray-500">Invitation expires {new Date(invitation.expiresAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}. It can only be used once.</p>
              {signedIn ? (
                <div className="space-y-3 border-t border-gray-100 pt-5">
                  <h2 className="font-semibold text-gray-900">Already signed in</h2>
                  <p className="text-sm text-gray-500">Accept with your current account. Its email must exactly match the invited email above.</p>
                  <button onClick={() => void accept()} disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    {saving && <Loader2 size={16} className="animate-spin"/>} Accept invitation
                  </button>
                  <button type="button" onClick={() => void switchAccount()}
                    className="w-full rounded-lg border border-gray-200 p-3 text-sm text-emerald-800">Sign in with a different account</button>
                </div>
              ) : (
                <div className="space-y-4 border-t border-gray-100 pt-5">
                  <h2 className="font-semibold text-gray-900">New to Kassa? Create your staff account</h2>
                  <p className="text-sm text-gray-500">Your account will use the invited email. Create a password to join the business directly.</p>
                  <label className="block text-sm font-medium text-gray-700">Password
                    <input type="password" autoComplete="new-password" value={password}
                      onChange={(e) => setPassword(e.target.value)} minLength={12} maxLength={128}
                      placeholder="At least 12 characters"
                      className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm"/>
                  </label>
                  <label className="block text-sm font-medium text-gray-700">Confirm password
                    <input type="password" autoComplete="new-password" value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)} maxLength={128}
                      className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm"/>
                  </label>
                  <button onClick={() => void createAccount()} disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 p-3 text-sm font-semibold text-white disabled:opacity-60">
                    {saving && <Loader2 size={16} className="animate-spin"/>} Create account &amp; join
                  </button>
                  <div className="text-center text-sm text-gray-500">
                    Already have a Kassa account?{" "}
                    <Link className="font-semibold text-emerald-800" href={signInUrl}>Sign in to accept</Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function StaffInvitePage() {
  return <Suspense fallback={<p className="p-6 text-sm text-gray-500">Loading invitation...</p>}><InvitationContent/></Suspense>;
}
