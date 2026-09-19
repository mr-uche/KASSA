"use client";

import { useState } from "react";
import Logo from "@/components/logo";

const bullets = [
  "One reconciled view of every sale, every channel",
  "Catch failed or missing payments the same day",
  "Know exactly which staff member handled each sale",
];

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: wire up to auth endpoint
    console.log({ email, password });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[5fr_6fr]">
      {/* Left panel */}
      <div className="relative flex flex-col justify-between bg-[#08745F] text-white px-10 py-12 lg:px-14 lg:py-16">
        <div>
          <div className="mb-16">
            <Logo variant="light" />
          </div>

          <h1 className="text-3xl lg:text-4xl font-semibold leading-tight max-w-sm">
            Welcome back.
            <br />
            Your money,
            <br />
            one clear picture.
          </h1>

          <p className="mt-5 max-w-sm text-sm text-white/60 leading-relaxed">
            Log in to see today&apos;s sales across every branch, channel, and
            staff member — in real time.
          </p>

          <ul className="mt-8 space-y-3">
            {bullets.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <blockquote className="max-w-sm rounded-lg border border-white/15 bg-white/5 p-4">
          <p className="text-sm text-white/90 leading-relaxed">
            &ldquo;I don&apos;t need faster payments. I need to know, at a
            glance, that every naira coming in is accounted for.&rdquo;
          </p>
          <footer className="mt-3 text-xs text-white/50">
            Adebora Okafor — Business Owner, 2-branch pharmacy
          </footer>
        </blockquote>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center bg-white px-6 py-16">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold text-gray-900">
            Log in to your account
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Enter your details to access your dashboard.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-900 mb-1.5"
              >
                Work email
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#123A2E]/30 focus:border-[#123A2E]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-900 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 3l18 18M10.6 10.6a3 3 0 004.24 4.24M9.4 5.3A10.6 10.6 0 0112 5c6 0 10 6 10 6a15.4 15.4 0 01-3.5 4.2M6.5 6.5C4 8.2 2 11 2 11s4 6 10 6c1 0 2-.15 2.9-.42" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M2 11s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="11" r="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-[#08745F] focus:ring-[#08745F]/30"
                />
                Remember me
              </label>
              <a href="/forgot-password" className="font-medium text-[#08745F] hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-[#08745F] py-2.5 text-sm font-semibold text-white hover:bg-[#08745F] transition-colors"
            >
              Log in
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <p className="text-center text-sm text-gray-600">
            New to Kassa?{" "}
            <a href="/signup" className="font-medium text-[#08745F] hover:underline">
              Create a business account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}