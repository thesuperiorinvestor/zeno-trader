"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListOrdered,
  Eye,
  BookOpen,
  CalendarCheck,
  Download,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trade Log", icon: ListOrdered },
  { href: "/import", label: "Import", icon: Download },
  { href: "/opportunities", label: "Opportunities", icon: Eye },
  { href: "/playbook", label: "Playbook", icon: BookOpen },
  { href: "/daily", label: "Daily", icon: CalendarCheck },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-[var(--color-border-soft)] bg-[var(--color-surface)] flex flex-col">
      <div className="px-5 py-5 border-b border-[var(--color-border-soft)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-light)] flex items-center justify-center font-bold text-white text-sm">
            7F
          </div>
          <div>
            <div className="font-semibold tracking-tight text-sm leading-tight">Road to</div>
            <div className="text-xs text-[var(--color-accent-light)] tracking-wide">7-Figures</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-[var(--color-accent-dim)] text-[var(--color-accent-light)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-[var(--color-border-soft)] text-xs text-[var(--color-text-dim)]">
        Local mode · IndexedDB
      </div>
    </aside>
  );
}
