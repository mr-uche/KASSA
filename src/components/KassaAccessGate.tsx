"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import KassaSidebar from "@/components/KassaSidebar";
import {
  hasBusinessAccess, loadAccess, selectedBusiness, type KassaPermission,
} from "@/lib/kassa-permissions";

type State = "checking" | "granted" | "denied" | "error";

const permissionLabel: Record<string, string> = {
  Owner: "Business owner",
};

export default function KassaAccessGate({
  children, permission, title,
}: {
  children: ReactNode;
  permission: KassaPermission | "Owner";
  title: string;
}) {
  const pathname = usePathname();
  const [status, setStatus] = useState<State>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function checkAccess() {
      try {
        // Fail closed while loading or if permissions cannot be confirmed.
        const memberships = await loadAccess();
        if (!active) return;
        const selectedId = localStorage.getItem("selectedBranchId") ?? "";
        const business = selectedBusiness(memberships, selectedId);
        if (!business) {
          setMessage("No business membership was found for this account.");
          setStatus("denied");
          return;
        }
        if (hasBusinessAccess(business, permission)) {
          setMessage("");
          setStatus("granted");
        } else {
          setMessage("");
          setStatus("denied");
        }
      } catch (cause) {
        if (!active) return;
        setMessage(cause instanceof Error ? cause.message : "Unable to verify access.");
        setStatus("error");
      }
    }

    setStatus("checking");
    void checkAccess();
    const onFocus = () => void checkAccess();
    const onChange = () => { setStatus("checking"); void checkAccess(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("branchChanged", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("branchChanged", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [pathname, permission]);

  if (status === "granted") return <>{children}</>;
  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar isOpen={false} onClose={() => {}} />
      <main className="min-h-screen lg:ml-[198px]">
        <header className="border-b border-gray-200 bg-white px-4 py-6 sm:px-8">
          <h1 className="text-xl font-bold text-[#182033]">{title}</h1>
        </header>
        <div className="mx-4 mt-8 max-w-xl rounded-xl border border-gray-200 bg-white p-6 sm:mx-8">
          {status === "checking" ? (
            <p role="status" className="text-sm text-gray-600">Checking your access...</p>
          ) : status === "error" ? (
            <div role="alert">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Access could not be verified</h2>
              <p className="text-sm text-gray-600">{message}</p>
              <button type="button" onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white">
                Retry
              </button>
            </div>
          ) : (
            <div role="alert">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Access restricted</h2>
              <p className="text-sm leading-6 text-gray-600">
                {message || (
                  <>Your role does not include <strong>{permissionLabel[permission] ?? permission}</strong>.
                    {permission === "Owner"
                      ? " Only the business owner can manage this area."
                      : " Ask the business owner to update your role under Staff & Branches → Roles & Permissions."}
                  </>
                )}
              </p>
              <Link href="/dashboard" className="mt-5 inline-block text-sm font-medium text-emerald-800 hover:underline">
                Back to dashboard
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
