const STYLES: Record<string, string> = {
  complete: "bg-success/10 text-success",
  processing: "bg-cyan/10 text-indigo dark:text-cyan",
  review: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const LABELS: Record<string, string> = {
  complete: "Complete",
  processing: "Processing",
  review: "Needs review",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[status] ?? "bg-elevated text-muted"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "processing" ? "animate-pulse-soft" : ""} ${status === "complete" ? "bg-success" : status === "review" ? "bg-amber-500" : "bg-cyan"}`} />
      {LABELS[status] ?? status}
    </span>
  );
}
