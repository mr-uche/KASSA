"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname,useRouter } from "next/navigation";
import { X, LogOut } from "lucide-react";

import Logo from "@/components/logo";
import { offlineSectionAllowed, type OfflineWorkspace } from "@/lib/offline-sales";

import {
  hasBusinessAccess, loadAccess, selectedBusiness,
  type BusinessAccess, type KassaPermission,
} from "@/lib/kassa-permissions";

type MenuItem = {
  name: string;
  href: string;
  permission: KassaPermission | "Owner";
};
const offlineItems = [
  { name: "Home", section: "home" },
  { name: "New Sale", section: "new-sale" },
  { name: "Transactions", section: "transactions" },
  { name: "Scan Product", section: "scan" },
  { name: "Reports & Analytics", section: "reports" },
  { name: "Products & Inventory", section: "products" },
  { name: "Offline Backup", section: "backup" },
];

const menuItems: MenuItem[] = [
  { name: "Home", href: "/dashboard", permission: "View dashboard" },
  { name: "New Sale", href: "/sales/new", permission: "Manage sales & transactions" },
  { name: "Transactions", href: "/transactions", permission: "Manage sales & transactions" },
  { name: "Scan Product", href: "/scan", permission: "Manage sales & transactions" },
  { name: "Reports & Analytics", href: "/reports", permission: "View reports & analytics" },
  { name: "Products & Inventory", href: "/products", permission: "Manage products & inventory" },
  { name: "Customers", href: "/customers", permission: "Manage customers" },
  { name: "Staff & Branches", href: "/staff-branches", permission: "Owner" },
  { name: "Settings", href: "/settings", permission: "Owner" },
];

export default function KassaSidebar({
  isOpen,
  onClose,
  offlineMode = false,
  activeOfflineSection = "new-sale",
  onOfflineNavigate,
  offlineAccess = null,
}: {
  isOpen: boolean;
  onClose: () => void;
  offlineMode?: boolean;
  activeOfflineSection?: string;
  onOfflineNavigate?: (section: string) => void;
  offlineAccess?: OfflineWorkspace | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessAccess | undefined>(undefined);
  const [isOffline, setIsOffline] = useState(offlineMode);
  const offlineNavigation = offlineMode || isOffline;

  useEffect(() => {
    if (offlineMode) {
      setIsOffline(true);
      return;
    }
    const update = () => setIsOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [offlineMode]);

  useEffect(() => {
    let active = true;
    async function updateMenu() {
      if (offlineMode || !navigator.onLine) {
        if (active) setBusiness(undefined);
        return;
      }
      try {
        const memberships = await loadAccess();
        if (!active) return;
        const selectedId = localStorage.getItem("selectedBranchId") ?? "";
        setBusiness(selectedBusiness(memberships, selectedId));
      } catch {
        if (active) setBusiness(undefined);
      }
    }
    setBusiness(undefined);
    void updateMenu();
    window.addEventListener("branchChanged", updateMenu);
    window.addEventListener("storage", updateMenu);
    window.addEventListener("focus", updateMenu);
    window.addEventListener("online", updateMenu);
    window.addEventListener("offline", updateMenu);
    return () => {
      active = false;
      window.removeEventListener("branchChanged", updateMenu);
      window.removeEventListener("storage", updateMenu);
      window.removeEventListener("focus", updateMenu);
      window.removeEventListener("online", updateMenu);
      window.removeEventListener("offline", updateMenu);
    };
  }, [pathname, offlineMode]);

  useEffect(() => {
    if (!isOpen) return;

    const mobileViewport = window.matchMedia("(max-width: 1023px)");
    const previousOverflow = document.body.style.overflow;
    const syncScrollLock = () => {
      document.body.style.overflow = mobileViewport.matches ? "hidden" : previousOverflow;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    syncScrollLock();
    document.addEventListener("keydown", closeOnEscape);
    mobileViewport.addEventListener("change", syncScrollLock);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      mobileViewport.removeEventListener("change", syncScrollLock);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[198px] flex-col bg-[#08745F] text-white transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Logo + mobile close button */}
        <div className="flex h-[72px] items-center justify-between gap-3 px-4">
          <Logo variant="light" width={90} height={24} />

          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Online links are role-filtered. Offline links stay within the
            local workspace and cannot authorize cloud operations. */}
        <nav className="mt-[48px] flex flex-1 flex-col gap-[4px] overflow-y-auto">
          {offlineNavigation ? (offlineAccess ? offlineItems.filter((item) =>
            offlineSectionAllowed(item.section, offlineAccess)) : [
            { name: "Offline Selling", section: "new-sale" },
          ]).map((item) => {
            const active = activeOfflineSection === item.section ||
              (!offlineMode && pathname === "/offline-sales" && item.section === "new-sale");
            return (
              <a key={item.name} href={"/offline-sales?section=" + encodeURIComponent(item.section)}
                onClick={(event) => {
                  if (onOfflineNavigate) {
                    event.preventDefault();
                    onOfflineNavigate(item.section);
                  }
                  onClose();
                }}
                className={`relative mx-0 flex min-h-[44px] items-center px-[14px] text-[14px] transition ${active
                  ? "rounded-r-[8px] bg-[#075C4D] font-semibold"
                  : "text-white/90 hover:bg-[#075C4D]/60"}`}>
                {active ? <span className="mr-[9px] h-[5px] w-[5px] rounded-full bg-[#B7E5D5]" />
                  : <span className="mr-[9px] w-[5px]" />}
                {item.name}
              </a>
            );
          }) : menuItems.filter((item) => hasBusinessAccess(business, item.permission)).map((item) => {
            const active = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} onClick={onClose}
                className={`relative mx-0 flex min-h-[44px] items-center px-[14px] text-[14px] transition ${active
                  ? "rounded-r-[8px] bg-[#075C4D] font-semibold"
                  : "text-white/90 hover:bg-[#075C4D]/60"}`}>
                {active ? <span className="mr-[9px] h-[5px] w-[5px] rounded-full bg-[#B7E5D5]" />
                  : <span className="mr-[9px] w-[5px]" />}
                {item.name}
              </Link>
            );
          })}
        </nav>

        {offlineNavigation ? (
          <div className="mx-4 mb-5 rounded-lg bg-white/10 px-3 py-2 text-xs leading-5 text-white/90">
            Offline mode · Lock the device when unattended.
          </div>
        ) : (
          <button type="button" onClick={async () => {
                    try {
                      const response = await fetch("/api/auth/logout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: "{}",
                      });
                      if (!response.ok) return;
                      router.replace("/login");
                      router.refresh();
                    } catch {
                      // Keep the current session if the logout request fails.
                    }
                  }} 
                  className="mx-4 mb-5 flex h-[44px] w-[calc(100%-2rem)] items-center gap-3 rounded-[8px] px-[14px] text-[14px] text-white/90 transition hover:bg-[#075C4D]" > 
                  <LogOut size={18} />
                  <span>Log out</span> 
                  </button>
        )}
      </aside>
    </>
  );
}