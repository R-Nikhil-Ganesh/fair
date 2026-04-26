import { ShieldCheck } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{
          background:
            "linear-gradient(130deg, rgba(37,99,235,0.16), rgba(16,185,129,0.15))",
          border: "1px solid var(--border)",
        }}
      >
        <ShieldCheck className="text-primary" size={20} />
      </span>
      <div className="flex flex-col">
        <span className="text-sm font-semibold tracking-wide text-muted-foreground">FAIRLENS</span>
        {!compact && <span className="text-base font-bold leading-none">Responsible AI Audits</span>}
      </div>
    </div>
  );
}