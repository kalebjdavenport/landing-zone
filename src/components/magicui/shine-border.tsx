import { cn } from "@/lib/utils";

export function ShineBorder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 rounded-xl border border-cyan-400/30 [mask-image:linear-gradient(#fff,#fff)]",
        className,
      )}
    >
      <div className="absolute -inset-[140%] animate-spin-slow bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0deg,rgba(56,189,248,0.8)_100deg,transparent_190deg)]" />
    </div>
  );
}
