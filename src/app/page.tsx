import Link from "next/link";
import { ArrowRight, BarChart3, FileSearch, ShieldCheck, Users } from "lucide-react";
import { Brand } from "@/components/layout/Brand";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between p-6 bg-white border-b border-border">
        <Brand compact />
        <nav className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Sign In
          </Link>
          <Link href="/login" className="btn btn-primary">
            Get Started
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center">
        <section
          className="w-full py-24 text-center px-4 border-b border-border"
          style={{
            background:
              "radial-gradient(1300px 300px at 50% -10%, rgba(37,99,235,0.15), transparent), linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
          }}
        >
          <div className="container max-w-4xl mx-auto flex flex-col items-center gap-6">
            <div className="badge badge-primary bg-accent text-accent-foreground mb-4">
              Banking & Fintech Compliance Ready
            </div>
            <h1 style={{ fontSize: "3.5rem", lineHeight: 1.1 }}>
              Detect Bias in Loan Approvals <br /> Before Deployment
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mt-4">
              FairLend AI gives compliance teams a real-time command center for fairness audits.
              Catch disparate impacts across protected attributes before they become legal risk.
            </p>
            <div className="flex items-center gap-4 mt-8">
              <Link
                href="/login"
                className="btn btn-primary flex items-center gap-2 px-6 py-3"
                style={{ fontSize: "1rem" }}
              >
                Start Free Audit <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="btn btn-secondary px-6 py-3" style={{ fontSize: "1rem" }}>
                View Demo
              </Link>
            </div>
          </div>
        </section>

        <section className="container mx-auto py-24 px-4">
          <div className="text-center mb-16">
            <h2 className="mb-4">Why FairLend AI?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for modern banking infrastructure with model-card style reporting and
              mitigation-first workflows.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="card flex flex-col items-start gap-4">
              <div className="p-3 bg-accent rounded-lg text-accent-foreground">
                <BarChart3 size={24} />
              </div>
              <h3>Automated Bias Detection</h3>
              <p className="text-muted-foreground">
                Upload your CSV and immediately see disparities in approval rates across protected attributes like gender and age.
              </p>
            </div>

            <div className="card flex flex-col items-start gap-4">
              <div className="p-3 bg-accent rounded-lg text-accent-foreground">
                <Users size={24} />
              </div>
              <h3>Intersectionality Analysis</h3>
              <p className="text-muted-foreground">
                Go beyond single attributes. See how combinations like &quot;Young + Rural&quot; or
                &quot;Female + Low Income&quot; perform.
              </p>
            </div>

            <div className="card flex flex-col items-start gap-4">
              <div className="p-3 bg-accent rounded-lg text-accent-foreground">
                <ShieldCheck size={24} />
              </div>
              <h3>Actionable Mitigation</h3>
              <p className="text-muted-foreground">
                Get plain-English summaries powered by Gemini, explaining exact mitigation steps such as proxy variable removal.
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto pb-24 px-4">
          <div className="card" style={{ background: "#0f172a", color: "#e2e8f0" }}>
            <div className="grid md:grid-cols-3 gap-6 items-center">
              <div className="flex items-center gap-3">
                <BarChart3 size={20} className="text-success" />
                <div>
                  <div className="font-semibold">Fairness KPIs</div>
                  <div className="text-sm" style={{ color: "#94a3b8" }}>
                    Disparate impact, demographic parity, equalized odds.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileSearch size={20} className="text-warning" />
                <div>
                  <div className="font-semibold">Audit Trail</div>
                  <div className="text-sm" style={{ color: "#94a3b8" }}>
                    Full report history and exportable evidence.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-primary" />
                <div>
                  <div className="font-semibold">Regulatory Alignment</div>
                  <div className="text-sm" style={{ color: "#94a3b8" }}>
                    Designed for transparent model governance.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 bg-white border-t border-border text-center text-muted-foreground">
        <p className="mb-2">© {new Date().getFullYear()} FairLend AI. All rights reserved.</p>
        <p className="text-sm">Future roadmap: Employment, Insurance, and Scholarship review modes coming soon.</p>
      </footer>
    </div>
  );
}
