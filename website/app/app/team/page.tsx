import { TEAM } from "@/lib/workspace";

const ROLE_STYLE: Record<string, string> = {
  Owner: "bg-indigo/10 text-indigo dark:text-cyan",
  Analyst: "bg-cyan/10 text-indigo dark:text-cyan",
  Coach: "bg-success/10 text-success",
  Viewer: "bg-elevated text-muted",
};

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink">Team</h2>
          <p className="mt-1 text-sm text-muted">Manage who can access your classification workspace.</p>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-canvas hover:-translate-y-0.5 transition-transform">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Invite member
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-surface shadow-card">
        <div className="divide-y">
          {TEAM.map((m) => (
            <div key={m.email} className="flex items-center gap-4 px-5 py-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-indigo to-cyan text-sm font-semibold text-white">
                {m.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{m.name}</p>
                <p className="truncate text-xs text-muted">{m.email}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_STYLE[m.role]}`}>{m.role}</span>
              <button type="button" aria-label="Member options" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-elevated hover:text-ink">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
