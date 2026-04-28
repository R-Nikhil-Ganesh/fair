import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";

type Variant = "pass" | "warning" | "processing" | "error";

export function StatusBadge({ label, variant }: { label: string; variant: Variant }) {
  const styles: Record<Variant, { bg: string; text: string; border: string; icon: any }> = {
    pass: {
      bg: "rgba(16, 185, 129, 0.1)",
      text: "#10b981",
      border: "rgba(16, 185, 129, 0.2)",
      icon: CheckCircle2,
    },
    warning: {
      bg: "rgba(245, 158, 11, 0.1)",
      text: "#f59e0b",
      border: "rgba(245, 158, 11, 0.2)",
      icon: AlertTriangle,
    },
    processing: {
      bg: "rgba(59, 130, 246, 0.1)",
      text: "#3b82f6",
      border: "rgba(59, 130, 246, 0.2)",
      icon: Clock3,
    },
    error: {
      bg: "rgba(239, 68, 68, 0.1)",
      text: "#ef4444",
      border: "rgba(239, 68, 68, 0.2)",
      icon: XCircle,
    },
  };

  const config = styles[variant];
  const Icon = config.icon;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "0.25rem 0.6rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        width: "max-content",
      }}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}
