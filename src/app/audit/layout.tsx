/**
 * Layout wrapper for /audit/* routes.
 *
 * The submission flow lives under /audit/new and /audit/[id] (outside the
 * /dashboard segment) because the new-audit form redirects there. This layout
 * reuses the same sidebar + top-bar shell as the dashboard so the chrome is
 * always present.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus2,
  History,
  Settings,
  LogOut,
  Bell,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { auth, signOut } from "@/lib/firebase";
import { Brand } from "@/components/layout/Brand";

export default function AuditShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const navItems = [
    { href: "/dashboard",         label: "Overview",   icon: LayoutDashboard },
    { href: "/audit/new",         label: "New Audit",  icon: FilePlus2 },
    { href: "/dashboard/history", label: "Audit History", icon: History },
    { href: "/dashboard/settings",label: "Settings",   icon: Settings },
  ];

  const pageTitle =
    pathname === "/audit/new"
      ? "Create New Audit"
      : pathname.startsWith("/audit/")
      ? "Audit Report"
      : "FairLend AI";

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Brand compact />
        </div>

        <nav className="sidebar-nav">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 px-4">
            Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
               item.href !== "/audit/new" &&
               item.href !== "/dashboard/history" &&
               item.href !== "/dashboard/settings" &&
               pathname.startsWith(item.href)) ||
              (item.href === "/audit/new" && pathname === "/audit/new");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? "active" : ""}`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <button
            onClick={handleSignOut}
            className="w-full nav-item text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer text-left"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="top-header">
          <div className="text-sm font-medium text-muted-foreground">
            {pageTitle}
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-border">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm overflow-hidden">
                {user?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt="Profile" />
                ) : (
                  user?.displayName?.charAt(0) || "U"
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-none">
                  {user?.displayName || "User"}
                </span>
                <span className="text-xs text-muted-foreground mt-1 text-ellipsis max-w-[120px] overflow-hidden whitespace-nowrap">
                  {user?.email || "Admin"}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}
