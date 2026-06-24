import { redirect } from "next/navigation";
import { VideoUploader } from "@/components/app/VideoUploader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { getCurrentUser } from "@/lib/auth-server";
import { listVideos } from "@/lib/classifications";

export default async function VideosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const videos = listVideos(user.id, 100);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">Upload & analyze</h2>
        <p className="mt-1 text-sm text-muted">Drop a clip to run the skeleton-based classification pipeline.</p>
      </div>

      <VideoUploader />

      <section className="rounded-2xl border bg-surface shadow-card">
        <div className="border-b px-5 py-4">
          <h3 className="font-display text-base font-semibold tracking-tight text-ink">Your videos</h3>
        </div>
        {videos.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">No uploads yet — analyze a clip above.</p>
        ) : (
          <div className="divide-y">
            {videos.map((row) => (
              <div key={row.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="grid h-10 w-14 shrink-0 place-items-center rounded-lg bg-midnight text-cyan">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m8 5 11 7-11 7z"/></svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm text-ink">{row.filename}</p>
                  <p className="text-xs text-muted">
                    {new Date(row.created_at).toISOString().slice(0, 10)}
                    {row.predicted ? ` · predicted ${row.predicted}` : ""}
                  </p>
                </div>
                <StatusBadge status={row.status ?? "complete"} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
