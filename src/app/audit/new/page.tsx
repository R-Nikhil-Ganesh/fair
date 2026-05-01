"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FilePlus2, History, Settings, LogOut, Bell } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { auth, signOut } from "@/lib/firebase";
import { uploadAndStartAudit, startSampleDatasetAudit } from "@/lib/ai";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { AuditProgress } from "@/components/AuditProgress";
import { Brand } from "@/components/layout/Brand";
import type { AuditDocument } from "@/lib/types";

type PageState = "wizard" | "queuing" | "uploading" | "processing" | "complete" | "error";

const NAV = [
  { href: "/dashboard",           label: "Overview",     icon: LayoutDashboard },
  { href: "/audit/new",           label: "New Audit",    icon: FilePlus2 },
  { href: "/dashboard/history",   label: "Audit History",icon: History },
  { href: "/dashboard/settings",  label: "Settings",     icon: Settings },
];

export default function NewAuditPage() {
  const { user } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const [pageState, setPageState]       = useState<PageState>("wizard");
  const [auditId, setAuditId]           = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  if (!user) return null;

  const handleSignOut = async () => { await signOut(auth); };

  const handleWizardComplete = async (config: {
    domain: "lending" | "employment" | "insurance";
    file?: File; modelFile?: File; modelFramework?: "sklearn" | "onnx";
    sampleDatasetKey?: string;
    protectedAttribute: string; targetColumn: string; favorableLabel: number;
  }) => {
    try {
      if (config.sampleDatasetKey) {
        setPageState("queuing");  // show spinner while API call is in-flight
        const id = await startSampleDatasetAudit(config.sampleDatasetKey, {
          uid: user.uid, protectedAttribute: config.protectedAttribute,
          targetColumn: config.targetColumn, favorableLabel: config.favorableLabel, domain: config.domain,
        });
        setAuditId(id);
        setPageState("processing");
      } else if (config.file) {
        setPageState("uploading");
        const id = await uploadAndStartAudit(
          config.file,
          { uid: user.uid, protectedAttribute: config.protectedAttribute, targetColumn: config.targetColumn,
            favorableLabel: config.favorableLabel, domain: config.domain,
            modelFile: config.modelFile, modelFramework: config.modelFramework },
          setUploadProgress
        );
        setAuditId(id);
        setPageState("processing");
      }
    } catch (e) {
      setErrorMessage(String(e));
      setPageState("error");
    }
  };

  const handleAuditComplete = (audit: AuditDocument) => {
    setPageState("complete");
    setTimeout(() => { router.push(`/dashboard/audit/${audit.auditId}`); }, 1500);
  };

  return (
    <div className="dashboard-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-header"><Brand compact /></div>
        <nav className="sidebar-nav">
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "1rem 1rem 0.4rem" }}>
            Menu
          </div>
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} className={`nav-item ${isActive ? "active" : ""}`}>
                <Icon size={20} />{label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: "1rem", borderTop: "1px solid var(--border)", marginTop: "auto" }}>
          <button onClick={handleSignOut} className="w-full nav-item text-muted-foreground" style={{ cursor: "pointer" }}>
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">
        {/* Top header */}
        <header className="top-header">
          <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--muted-foreground)" }}>Create New Audit</div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button style={{ position: "relative", padding: "0.5rem", color: "var(--muted-foreground)", background: "none", border: "none", borderRadius: "50%", cursor: "pointer" }}>
              <Bell size={20} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingLeft: "1rem", borderLeft: "1px solid var(--border)" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.875rem", overflow: "hidden" }}>
                {user.photoURL ? <img src={user.photoURL} alt="Profile" /> : user.displayName?.charAt(0) || "U"}
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)" }}>{user.displayName || "User"}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>{user.email}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="content-area" id="main-content">
          <div style={{ maxWidth: "780px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Hero */}
            <div style={{
              borderRadius: "1rem",
              background: "radial-gradient(circle at top right, rgba(41,121,255,0.18) 0%, #0b0b0b 50%)",
              border: "1px solid var(--border)",
              padding: "1.1rem 1.4rem",
            }}>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--primary)", marginBottom: "0.2rem" }}>
                Fairness Pipeline
              </p>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.25rem" }}>New Fairness Audit</h1>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
                Upload your dataset, map key columns, and run a cloud-based compliance audit.
              </p>
            </div>

            {/* Wizard */}
            {pageState === "wizard" && <OnboardingWizard onComplete={handleWizardComplete} />}

            {/* Queuing (sample dataset: waiting for API call before AuditProgress can mount) */}
            {pageState === "queuing" && (
              <div style={{ background: "#0b0b0b", border: "1px solid #27272a", borderRadius: "1rem", padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #3b82f6", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                <div>
                  <p style={{ color: "#f4f4f5", fontWeight: 600, fontSize: "0.9rem", margin: 0 }}>Queuing sample audit…</p>
                  <p style={{ color: "#71717a", fontSize: "0.8rem", marginTop: "0.25rem" }}>Registering the job in Firestore before starting the pipeline.</p>
                </div>
              </div>
            )}

            {/* Uploading */}
            {pageState === "uploading" && (
              <div style={{ background: "#0b0b0b", border: "1px solid #27272a", borderRadius: "1rem", padding: "1.25rem" }}>
                <h2 style={{ color: "#f4f4f5", fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem" }}>Uploading Dataset</h2>
                <p style={{ color: "#71717a", fontSize: "0.85rem", marginBottom: "0.85rem" }}>Sending CSV to cloud storage and preparing the audit job.</p>
                <div style={{ height: 6, borderRadius: 999, background: "#27272a", overflow: "hidden", marginBottom: "0.5rem" }}>
                  <div style={{
                    height: "100%", borderRadius: 999,
                    width: `${uploadProgress}%`,
                    background: "linear-gradient(90deg,#2563eb,#3b82f6)",
                    transition: "width 0.3s ease",
                  }} />
                </div>
                <p style={{ color: "#71717a", fontSize: "0.82rem", fontFamily: "monospace" }}>Uploading… {uploadProgress}%</p>
              </div>
            )}

            {/* Processing */}
            {pageState === "processing" && auditId && (
              <div style={{ background: "#0b0b0b", border: "1px solid #27272a", borderRadius: "1rem", padding: "1.25rem" }}>
                <h2 style={{ color: "#f4f4f5", fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem" }}>Running Fairness Audit</h2>
                <p style={{ color: "#71717a", fontSize: "0.85rem", marginBottom: "1rem" }}>Your job is running in the cloud pipeline.</p>
                <AuditProgress
                  uid={user.uid}
                  auditId={auditId}
                  onComplete={handleAuditComplete}
                  onError={(err) => { setErrorMessage(err); setPageState("error"); }}
                />
              </div>
            )}

            {/* Complete */}
            {pageState === "complete" && (
              <div style={{
                textAlign: "center",
                background: "linear-gradient(180deg,rgba(16,185,129,0.12) 0%,#0b0b0b 100%)",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: "1rem",
                padding: "2rem",
              }} role="status">
                <div style={{ fontSize: "2rem", color: "#34d399", marginBottom: "0.5rem" }}>✓</div>
                <p style={{ fontWeight: 700, color: "#f4f4f5", fontSize: "1rem" }}>Audit Complete</p>
                <p style={{ color: "#71717a", fontSize: "0.85rem", marginTop: "0.25rem" }}>Redirecting to results…</p>
              </div>
            )}

            {/* Error */}
            {pageState === "error" && (
              <div style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "1rem",
                padding: "1.25rem",
              }} role="alert">
                <h2 style={{ color: "#fca5a5", fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem" }}>Audit Failed</h2>
                <p style={{ color: "#71717a", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => { setPageState("wizard"); setAuditId(null); setErrorMessage(""); }}
                  style={{ color: "#f87171", fontSize: "0.85rem", fontWeight: 600, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
                >
                  Try again
                </button>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
