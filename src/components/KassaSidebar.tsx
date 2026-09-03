"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

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
        <div className="flex h-[72px] items-center justify-between gap-3 px-0 pr-4">
          <div className="flex items-center gap-3">
            <div className="flex h-[34px] w-[26px] items-center justify-center rounded-r-md bg-white text-[17px] font-bold text-[#08745F]">
              K
            </div>
            <span className="text-[18px] font-semibold">Kassa</span>
          </div>

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
        <nav className="mt-[48px] flex flex-col gap-[4px]">
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
      </aside>
    </>
  );
}