import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";

type Variant = "pass" | "warning" | "processing" | "error";

export function StatusBadge({ label, variant }: { label: string; variant: Variant }) {
  if (variant === "pass") {
    return (
      <span className="badge badge-success flex items-center gap-1 w-max">
        <CheckCircle2 size={12} />
        {label}
      </span>
    );
  }

  if (variant === "warning") {
    return (
      <span className="badge badge-destructive flex items-center gap-1 w-max">
        <AlertTriangle size={12} />
        {label}
      </span>
    );
  }

  if (variant === "error") {
    return (
      <span className="badge badge-destructive flex items-center gap-1 w-max">
        <XCircle size={12} />
        {label}
      </span>
    );
  }

  return (
    <span className="badge badge-warning flex items-center gap-1 w-max">
      <Clock3 size={12} />
      {label}
    </span>
  );
}
