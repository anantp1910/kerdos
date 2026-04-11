"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CreditCard, ArrowUpDown, TrendingUp, PieChart } from "lucide-react";

const TABS = [
  { href: "/",            label: "Home",       Icon: Home },
  { href: "/smartswipe",  label: "SmartSwipe", Icon: CreditCard },
  { href: "/transact",    label: "Transact",   Icon: ArrowUpDown, center: true },
  { href: "/rewardvest",  label: "Invest",     Icon: TrendingUp },
  { href: "/wealthsplit", label: "Summary",    Icon: PieChart },
];

export default function BottomNav() {
  const path = usePathname();

  return (
    <nav className="tab-bar">
      {TABS.map(({ href, label, Icon, center }) => {
        const active = path === href;

        if (center) {
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center -mt-6"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                style={{
                  background: "var(--green)",
                  boxShadow: "0 4px 20px rgba(0,200,5,0.45)",
                }}
              >
                <Icon size={24} color="#000" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] mt-1 font-medium" style={{ color: "var(--green)" }}>
                {label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 flex-1 py-2"
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 1.8}
              color={active ? "#fff" : "var(--text-3)"}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: active ? "#fff" : "var(--text-3)" }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
