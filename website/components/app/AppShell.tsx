"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { signOut } from "@/lib/auth";

const NAV = [
  { label: "Dashboard", href: "/app/dashboard", icon: "grid" },
  { label: "Videos", href: "/app/videos", icon: "film" },
  { label: "Classifications", href: "/app/classifications", icon: "target" },
  { label: "Reports", href: "/app/reports", icon: "doc" },
  { label: "Team", href: "/app/team", icon: "users" },
  { label: "Settings", href: "/app/settings", icon: "gear" },
];

function NavIcon({ name }: { name: string }) {
  const c = {
    width: 18, height: 18, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "grid": return <svg {...c}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
    case "film": return <svg {...c}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>;
    case "target": return <svg {...c}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>;
    case "doc": return <svg {...c}><path d="M5 3h9l5 5v13a0 0 0 0 1 0 0H5z"/><path d="M14 3v5h5M8 13h8M8 17h6"/></svg>;
    case "users": return <svg {...c}><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6"/></svg>;
    default: return <svg {...c}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 7 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 6 9.4l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 19.4 7a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 21 11.4"/></svg>;
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setEmail(d.user?.email ?? null))
      .catch(() => {});
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const active = NAV.find((n) => pathname.startsWith(n.href));

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2.5 px-2 py-1">
        <BrandMark className="h-8 w-8" />
        <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
          SkeletonCourt
        </span>
      </Link>

      <nav className="mt-6 flex-1 space-y-1">
        {NAV.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "text-ink" : "text-muted hover:bg-elevated hover:text-ink"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="app-nav-active"
                  className="absolute inset-0 rounded-xl bg-elevated"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-3">
                <NavIcon name={item.icon} />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="rounded-2xl border bg-elevated/50 p-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <p className="text-xs font-medium text-ink">Free during research preview</p>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Unlimited classifications — no card required.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100svh] bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-surface p-4 lg:block">
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-midnight/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-surface p-4 lg:hidden"
            >
              {SidebarBody}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-canvas/80 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg border text-ink lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>

          <h1 className="font-display text-base font-semibold tracking-tight text-ink">
            {active?.label ?? "Dashboard"}
          </h1>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/app/videos"
              className="hidden items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-canvas transition-transform hover:-translate-y-0.5 sm:inline-flex"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              New analysis
            </Link>
            <ThemeToggle />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenu((m) => !m)}
                aria-label="Account menu"
                className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo to-cyan text-sm font-semibold text-white"
              >
                {(email ?? "U").slice(0, 1).toUpperCase()}
              </button>
              <AnimatePresence>
                {menu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border bg-surface p-2 shadow-card-hover"
                    >
                      <div className="px-3 py-2">
                        <p className="truncate text-sm font-medium text-ink">{email ?? "Member"}</p>
                        <p className="text-xs text-muted">Free preview</p>
                      </div>
                      <div className="my-1 h-px bg-line/10" />
                      <Link href="/app/settings" onClick={() => setMenu(false)} className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-elevated">
                        Settings
                      </Link>
                      <Link href="/" onClick={() => setMenu(false)} className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-elevated">
                        Back to website
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="mt-0.5 block w-full rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10"
                      >
                        Sign out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
