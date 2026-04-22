import Link from "next/link";
import { ShieldCheck, BarChart3, Users, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between p-6 bg-white border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary" size={28} />
          <span className="font-bold text-xl tracking-tight text-foreground">FairLend AI</span>
        </div>
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
        {/* Hero Section */}
        <section className="w-full py-24 text-center px-4 bg-muted border-b border-border">
          <div className="container max-w-4xl mx-auto flex flex-col items-center gap-6">
            <div className="badge badge-primary bg-accent text-accent-foreground mb-4">
              Banking & Fintech Compliance Ready
            </div>
            <h1 style={{ fontSize: "3.5rem", lineHeight: 1.1 }}>
              Detect Bias in Loan Approvals <br/> Before Deployment
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mt-4">
              FairLend AI provides an enterprise-grade fairness audit dashboard for compliance officers and auditors. Uncover disparate impacts across gender, region, and income before it becomes a liability.
            </p>
            <div className="flex items-center gap-4 mt-8">
              <Link href="/login" className="btn btn-primary flex items-center gap-2 px-6 py-3" style={{ fontSize: "1rem" }}>
                Start Free Audit <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="btn btn-secondary px-6 py-3" style={{ fontSize: "1rem" }}>
                View Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto py-24 px-4">
          <div className="text-center mb-16">
            <h2 className="mb-4">Why FairLend AI?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for modern banking infrastructure, offering deep insights into machine learning models and dataset bias.
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
                Go beyond single attributes. See how combinations like "Young + Rural" or "Female + Low Income" perform.
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
      </main>

      <footer className="py-8 bg-white border-t border-border text-center text-muted-foreground">
        <p className="mb-2">© {new Date().getFullYear()} FairLend AI. All rights reserved.</p>
        <p className="text-sm">Future roadmap: Employment, Insurance, and Scholarship review modes coming soon.</p>
      </footer>
    </div>
  );
}
