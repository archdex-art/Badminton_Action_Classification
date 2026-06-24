"use client";

import { motion } from "framer-motion";

const STAGES = [
  { label: "Video Frames", mono: "frames[t] · RGB", icon: "film" },
  { label: "Skeleton Coordinates", mono: "kpts ∈ ℝ^{17×3}", icon: "nodes" },
  { label: "Sequence Tensor", mono: "x ∈ ℝ^{24×17×3}", icon: "cube" },
  { label: "BiLSTM + Attn", mono: "h = f_θ(x)", icon: "chip" },
  { label: "Prediction", mono: "ŷ = softmax(Wh)", icon: "target" },
];

// A small slice of normalised keypoint coordinates to display elegantly.
const SAMPLE = [
  ["frame", "joint", "x", "y", "score"],
  ["t=12", "R_wrist", "0.762", "0.515", "0.97"],
  ["t=12", "R_elbow", "0.690", "0.391", "0.95"],
  ["t=12", "R_shldr", "0.601", "0.240", "0.99"],
  ["t=13", "R_wrist", "0.781", "0.470", "0.96"],
  ["t=13", "R_elbow", "0.704", "0.358", "0.94"],
];

export function DataFlow() {
  return (
    <section className="relative scroll-mt-24 overflow-hidden bg-midnight py-24 text-white md:py-32">
      <div aria-hidden className="absolute inset-0 dot-grid opacity-40" />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(0,212,255,0.10),_transparent_60%)]"
      />

      <div className="container-content relative">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan">
            <span className="h-1 w-1 rounded-full bg-cyan" /> Data Flow
          </span>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-display sm:text-4xl md:text-[2.75rem] md:leading-[1.05]">
            Following a single rally through the network
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/60">
            Every frame becomes coordinates, every window becomes a tensor, and
            the temporal model resolves it into a stroke — in real time.
          </p>
        </div>

        {/* Animated timeline */}
        <div className="relative mt-16">
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-white/10 lg:block" />
          <motion.div
            className="absolute left-0 top-7 hidden h-px origin-left bg-gradient-to-r from-cyan via-indigo to-cyan lg:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: "100%" }}
          />
          <div className="grid gap-8 lg:grid-cols-5">
            {STAGES.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.18 }}
                className="relative"
              >
                <div className="relative z-10 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-cyan backdrop-blur">
                  <StageIcon name={s.icon} />
                </div>
                <h3 className="mt-5 font-display text-base font-semibold tracking-tight">
                  {s.label}
                </h3>
                <code className="mt-1.5 block font-mono text-xs text-white/45">
                  {s.mono}
                </code>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sample coordinate table */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="mt-16 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur"
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="ml-3 font-mono text-xs text-white/40">
              skeleton_sequence.parquet
            </span>
          </div>
          <div className="overflow-x-auto p-2 sm:p-4">
            <table className="w-full min-w-[480px] font-mono text-sm">
              <tbody>
                {SAMPLE.map((row, r) => (
                  <tr
                    key={r}
                    className={
                      r === 0
                        ? "text-xs uppercase tracking-wider text-white/40"
                        : "text-white/75"
                    }
                  >
                    {row.map((cell, c) => (
                      <td
                        key={c}
                        className={`px-3 py-2 ${c === 0 ? "text-cyan/80" : ""} ${
                          r > 0 && "border-t border-white/5"
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StageIcon({ name }: { name: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "film":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
        </svg>
      );
    case "nodes":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="8" r="2" />
          <circle cx="9" cy="17" r="2" />
          <path d="M7.5 7.5l9 0.5M8 15l8-6" />
        </svg>
      );
    case "cube":
      return (
        <svg {...common}>
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
          <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
        </svg>
      );
    case "chip":
      return (
        <svg {...common}>
          <rect x="7" y="7" width="10" height="10" rx="1.5" />
          <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
}
