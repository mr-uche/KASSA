import Link from "next/link";
import type { ReactNode } from "react";

type AuthSplitLayoutProps = {
  children: ReactNode;
};

export default function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {/* Marketing panel */}
      <div className="hidden lg:flex lg:flex-col lg:justify-between bg-brand-500 px-12 py-20 text-white">
        <div>
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-sm font-bold text-brand-500">
              K
            </span>
            <span className="text-base font-semibold">Kassa</span>
          </Link>

          <h1 className="mt-10 text-3xl font-bold leading-tight">
            Banks and Fintechs move money.{" "}
            <span className="text-brand-100">Kassa makes it understandable.</span>
          </h1>

          <p className="mt-4 max-w-md text-sm text-brand-100/90">
            One reconciled dashboard for every bank transfer, POS, USSD, card,
            cash, and wallet payment.
          </p>

          <ul className="mt-6 space-y-3 text-sm">
            {[
              "One reconciled view of every sale, every channel",
              "Catch failed or missing payments the same day",
              "Know exactly which staff member handled each sale",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-100" />
                <span className="text-brand-50/95">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <blockquote className="rounded-lg bg-brand-700/40 p-5">
          <p className="text-sm italic text-brand-50">
            &ldquo;I don&apos;t need faster payments. I need to know, at a
            glance, that every naira coming in is accounted for.&rdquo;
          </p>
          <footer className="mt-3 text-xs text-brand-100/80">
            Adebola Okafor — Business Owner, 2-branch pharmacy
          </footer>
        </blockquote>
      </div>

      {/* Content panel */}
      <div className="flex items-center justify-center bg-surface-muted px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 lg:hidden"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500 text-sm font-bold text-white">
              K
            </span>
            <span className="text-base font-semibold text-text-primary">
              Kassa
            </span>
          </Link>

          {children}
        </div>
      </div>
    </div>
  );
}
