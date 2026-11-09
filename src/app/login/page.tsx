"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Logo from "@/components/logo";
import { kassaPost } from "@/lib/kassa-client";
import { firstPermittedPath, type BusinessAccess } from "@/lib/kassa-permissions";

const bullets = [
  "One reconciled view of every sale, every channel",
  "Catch failed or missing payments the same day",
  "Know exactly which staff member handled each sale",
];

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    try {
      await kassaPost("/api/auth/login", { email, password, rememberMe });
      // A Route Handler sets an HttpOnly cookie; verify the browser actually
      // returned it before navigating to a protected page. This is especially
      // useful on phones visiting the development server by its LAN IP.
      const sessionResponse = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (sessionResponse.status === 401) {
        throw new Error(
          "Your password was accepted, but this browser did not keep the sign-in session. " +
          "Allow cookies for this site and open Kassa through the same address each time. " +
          "For local HTTP testing, run npm run dev rather than a production build."
        );
      }
      if (!sessionResponse.ok) {
        throw new Error(
          "Signed in, but your session could not be verified. Check that the Kassa backend is running."
        );
      }

      // Invitations return staff to the one-time acceptance screen after login.
      const next = new URLSearchParams(window.location.search).get("next");
      if (next && next.startsWith("/staff-invite?token=") && !next.includes("//")) {
        // A full navigation avoids reusing pre-login Router Cache state.
        window.location.replace(next);
        return;
      }

      const response = await fetch("/api/businesses/mine", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const reason = response.status === 401
          ? "Your login session was not accepted by the server."
          : "Signed in, but couldn't load your businesses. Check your backend connection.";
        throw new Error(reason);
      }
      const businesses: unknown = await response.json();
      const destination = Array.isArray(businesses)
        ? firstPermittedPath(businesses as BusinessAccess[])
        : "/onboarding";
      // Re-request the landing page from the server, carrying the new cookie.
      // router.replace() can reuse an unauthenticated pre-login client route.
      window.location.replace(destination);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-screen absolute inset-0 z-10 flex flex-col lg:grid lg:h-screen lg:overflow-hidden lg:grid-cols-[5fr_6fr]">
      {/* Splash header (mobile/tablet) / Left panel (desktop) */}
      <div className="relative flex flex-col bg-[#08745F] overflow-hidden text-white px-6 pt-6 pb-6 lg:px-14 lg:pt-8 lg:pb-8">
        <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-sm flex-1 flex-col justify-between">
          <div>
            <div className="mb-5 lg:mb-10">
              <Logo variant="light" />
            </div>
              <h1 className=" text-[28px] lg:text-3xl font-semibold leading-tight max-w-sm">
                Welcome back.
                <br />
                Your money in <br /> One clear picture.
              </h1>

              <p className="mt-4 hidden lg:block max-w-sm text-sm text-white/70 leading-relaxed">
                Log in to see today&apos;s sales across every branch, channel, and
                staff member — in real time.
              </p>

              <ul className="mt-6 hidden lg:block space-y-2.5">
                {bullets.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/85">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
                    {item}
                  </li>
                ))}
              </ul>
          </div>

          <blockquote className="mt-8 hidden max-w-sm rounded-lg border border-white/20 bg-white/10 p-5 backdrop-blur-sm lg:block">
            <p className="text-sm text-white/90 leading-relaxed">
              &ldquo;I don&apos;t need faster payments. I need to know, at a
              glance, that every naira coming in is accounted for.&rdquo;
            </p>
            <footer className="mt-3 text-xs text-white/60">
              Adebora Okafor; Business Owner, 2-branch pharmacy
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right / form panel */}
      <div className="flex items-center justify-center bg-white px-6 py-8 ">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold text-gray-900">
            Log in to your account
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Enter your details to access your dashboard.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1.5">
                Work email
              </label>
              <input
                id="email"
                required
                type="email"
                placeholder="name@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#123A2E]/30 focus:border-[#123A2E]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#123A2E]/30 focus:border-[#123A2E]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-controls="password"
                  aria-pressed={showPassword}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08745F]"
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} disabled={submitting} className="h-4 w-4 rounded border-gray-300 accent-[#08745F] focus:ring-[#08745F]/30" />
                Remember me
              </label>
              <a href="/forgot-password" className="font-medium text-[#08745F] hover:underline">
                Forgot password?
              </a>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-700">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-[#08745F] py-2.5 text-sm font-semibold text-white hover:bg-[#08745F] transition-colors"
            >
              {submitting ? "Signing in..." : "Log in"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <p className="text-center text-sm text-gray-600">
            New to Kassa?{" "}
            <a href="/sign-up" className="font-medium text-[#08745F] hover:underline">
              Create a business account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}