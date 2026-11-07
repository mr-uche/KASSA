"use client";

import Link from "next/link";
import { usePathname,useRouter } from "next/navigation";
import { X, LogOut } from "lucide-react";

import Logo from "@/components/logo";

const menuItems = [
  { name: "Home", href: "/dashboard" },
  { name: "Transactions", href: "/transactions" },
  { name: "Reports & Analytics", href: "/reports" },
  { name: "Products & Inventory", href: "/products" },
  { name: "Staff & Branches", href: "/staff-branches" },
  { name: "Settings", href: "/settings" },
];

export default function KassaSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

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

        {/* Navigation */}
        <nav className="mt-[48px] flex flex-1 flex-col gap-[4px]">
          {menuItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`relative mx-0 flex h-[44px] items-center px-[14px] text-[14px] transition ${
                  active
                    ? "rounded-r-[8px] bg-[#075C4D] font-semibold"
                    : "text-white/90 hover:bg-[#075C4D]/60"
                }`}
              >
                {active && (
                  <span className="mr-[9px] h-[5px] w-[5px] rounded-full bg-[#B7E5D5]" />
                )}
                {!active && <span className="w-[5px] mr-[9px]" />}
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Log out */} 
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
      </aside>
    </>
  );
}