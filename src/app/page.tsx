"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, BarChart3, FileSearch, ShieldCheck,
  Users, Sparkles, Scale, Cpu, ChevronRight,
} from "lucide-react";

/* ─── tiny hook: animate in on scroll ─────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── animated counter ────────────────────────────────────────── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const { ref, visible } = useInView(0.3);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = to / 60;
    const id = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(id); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [visible, to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ─── feature card ────────────────────────────────────────────── */
function FeatureCard({
  icon, title, body, accent, delay,
}: {
  icon: React.ReactNode; title: string; body: string; accent: string; delay: number;
}) {
  const { ref, visible } = useInView();
  const [hov, setHov] = useState(false);
  return (
    <div
      ref={ref}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "#111115" : "#0d0d0f",
        border: `1px solid ${hov ? accent : "rgba(255,255,255,0.07)"}`,
        borderRadius: "1.25rem",
        padding: "1.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        cursor: "default",
        transition: "all 0.25s ease",
        boxShadow: hov ? `0 0 32px ${accent}22` : "none",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transitionDelay: `${delay}ms`,
        transitionProperty: "opacity, transform, background, border-color, box-shadow",
        transitionDuration: "0.5s, 0.5s, 0.25s, 0.25s, 0.25s",
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: "0.75rem",
        background: `${accent}18`, border: `1px solid ${accent}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: accent, flexShrink: 0,
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f4f4f5", margin: 0 }}>{title}</h3>
      <p style={{ fontSize: "0.875rem", color: "#71717a", lineHeight: 1.65, margin: 0 }}>{body}</p>
    </div>
  );
}

/* ─── compliance badge ────────────────────────────────────────── */
function Badge({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em",
      padding: "0.3rem 0.75rem", borderRadius: 999,
      background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.22)",
      color: "#93c5fd", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

/* ─── main page ───────────────────────────────────────────────── */
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const heroVis = useInView(0.01);

  const features = [
    {
      icon: <BarChart3 size={20} />,
      title: "Automated Bias Detection",
      body: "Upload your CSV and instantly surface disparities in approval rates across protected attributes — gender, race, age, and more.",
      accent: "#60a5fa",
      delay: 0,
    },
    {
      icon: <Users size={20} />,
      title: "Intersectionality Analysis",
      body: "Go beyond single attributes. Uncover how combinations like \"Young + Rural\" or \"Female + Low-Income\" compound outcomes.",
      accent: "#a78bfa",
      delay: 80,
    },
    {
      icon: <ShieldCheck size={20} />,
      title: "Actionable Mitigation",
      body: "Gemini-powered plain-English summaries explain exact steps — proxy variable removal, re-weighting, and more.",
      accent: "#34d399",
      delay: 160,
    },
    {
      icon: <Scale size={20} />,
      title: "Fairness Metrics Suite",
      body: "Disparate impact ratio, demographic parity, equalized odds, and statistical parity — all with pass/fail thresholds.",
      accent: "#fb923c",
      delay: 240,
    },
    {
      icon: <Cpu size={20} />,
      title: "Model Auditing",
      body: "Upload your sklearn or ONNX model alongside data. Get counterfactual analysis showing what changed the decision.",
      accent: "#f472b6",
      delay: 320,
    },
    {
      icon: <FileSearch size={20} />,
      title: "Compliance-Ready Reports",
      body: "Exportable PDF audit trails with ECOA / EEOC alignment, evidence packages, and full audit history.",
      accent: "#fbbf24",
      delay: 400,
    },
  ];

  const stats = [
    { value: 12, suffix: "+", label: "Fairness metrics computed" },
    { value: 99, suffix: "%", label: "Accuracy on benchmark sets" },
    { value: 3, suffix: "s", label: "Avg audit turnaround" },
    { value: 100, suffix: "K+", label: "Records supported" },
  ];

  return (
    <div style={{ background: "#070707", minHeight: "100vh", color: "#f4f4f5", fontFamily: "'Space Grotesk', sans-serif", overflowX: "hidden" }}>

      {/* ── global keyframes ── */}
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
        @keyframes pulse-ring { 0% { transform: scale(0.95); opacity:0.6; } 100% { transform: scale(1.12); opacity:0; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        .hero-h1 { animation: fadeUp 0.8s ease both; }
        .hero-sub { animation: fadeUp 0.8s 0.15s ease both; }
        .hero-cta { animation: fadeUp 0.8s 0.28s ease both; }
        .hero-badges { animation: fadeUp 0.8s 0.4s ease both; }
        .floating { animation: float 6s ease-in-out infinite; }
        .shimmer-text {
          background: linear-gradient(90deg, #60a5fa 0%, #a78bfa 30%, #f472b6 60%, #60a5fa 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .nav-link { transition: color 0.15s; }
        .nav-link:hover { color: #f4f4f5 !important; }
        .btn-glow:hover { box-shadow: 0 0 28px rgba(96,165,250,0.45); transform: translateY(-1px); }
        .btn-glow { transition: box-shadow 0.2s, transform 0.2s; }
        .stat-card:hover { border-color: rgba(96,165,250,0.3) !important; background: #111115 !important; }
        .stat-card { transition: border-color 0.2s, background 0.2s; }
      `}</style>

      {/* ── Nav ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "3.75rem",
        background: scrollY > 10 ? "rgba(7,7,7,0.92)" : "transparent",
        backdropFilter: scrollY > 10 ? "blur(12px)" : "none",
        borderBottom: scrollY > 10 ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        transition: "all 0.3s ease",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "0.45rem",
            background: "linear-gradient(135deg,#2563eb,#7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ShieldCheck size={15} style={{ color: "#fff" }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: "1rem", color: "#f4f4f5", letterSpacing: "-0.02em" }}>
            Fair<span style={{ color: "#60a5fa" }}>Lend</span> AI
          </span>
        </div>

        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <a href="#features" className="nav-link" style={{ fontSize: "0.875rem", color: "#71717a", textDecoration: "none" }}>Features</a>
          <a href="#compliance" className="nav-link" style={{ fontSize: "0.875rem", color: "#71717a", textDecoration: "none" }}>Compliance</a>
          <Link href="/login" className="nav-link" style={{ fontSize: "0.875rem", color: "#71717a", textDecoration: "none" }}>Sign In</Link>
          <Link href="/login" className="btn-glow" style={{
            fontSize: "0.875rem", fontWeight: 700, padding: "0.45rem 1.1rem",
            borderRadius: "0.6rem", background: "#2563eb", color: "#fff",
            display: "flex", alignItems: "center", gap: "0.35rem", textDecoration: "none",
          }}>
            Get Started <ChevronRight size={14} />
          </Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section ref={heroVis.ref} style={{ position: "relative", overflow: "hidden", padding: "7rem 1.5rem 6rem", textAlign: "center" }}>
        {/* Orbs */}
        <div className="floating" style={{
          position: "absolute", top: "10%", left: "8%",
          width: 420, height: 420, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)",
          pointerEvents: "none", animationDelay: "0s",
        }} />
        <div className="floating" style={{
          position: "absolute", top: "5%", right: "6%",
          width: 340, height: 340, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)",
          pointerEvents: "none", animationDelay: "1.5s",
        }} />
        <div style={{
          position: "absolute", bottom: "0", left: "50%", transform: "translateX(-50%)",
          width: "80%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
        }} />

        <div style={{ position: "relative", maxWidth: "56rem", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>

          {/* Label pill */}
          <div className="hero-h1" style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
            padding: "0.35rem 0.9rem", borderRadius: 999,
            background: "rgba(96,165,250,0.09)", border: "1px solid rgba(96,165,250,0.25)", color: "#93c5fd",
          }}>
            <Sparkles size={12} /> Banking &amp; Fintech Compliance
          </div>

          {/* Headline */}
          <h1 className="hero-h1" style={{ fontSize: "clamp(2.4rem,5.5vw,4rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", margin: 0 }}>
            Detect Bias in Loan Approvals<br />
            <span className="shimmer-text">Before They Become Law Suits</span>
          </h1>

          {/* Sub */}
          <p className="hero-sub" style={{ fontSize: "1.1rem", color: "#71717a", maxWidth: "36rem", lineHeight: 1.7, margin: 0 }}>
            FairLend AI gives compliance teams a real-time command center for fairness audits.
            Catch disparate impacts across protected attributes before they become legal risk.
          </p>

          {/* CTAs */}
          <div className="hero-cta" style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/login" className="btn-glow" style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.75rem 1.75rem", borderRadius: "0.75rem",
              background: "linear-gradient(135deg,#2563eb,#4f46e5)",
              color: "#fff", fontWeight: 700, fontSize: "0.95rem", textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.12)",
            }}>
              Start Free Audit <ArrowRight size={16} />
            </Link>
            <Link href="/login" style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.75rem 1.75rem", borderRadius: "0.75rem",
              background: "transparent", color: "#a1a1aa",
              fontWeight: 600, fontSize: "0.95rem", textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.1)",
              transition: "border-color 0.2s, color 0.2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.25)"; (e.currentTarget as HTMLElement).style.color = "#f4f4f5"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "#a1a1aa"; }}
            >
              View Dashboard Demo
            </Link>
          </div>

          {/* Compliance badges */}
          <div className="hero-badges" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", marginTop: "0.5rem" }}>
            {["ECOA Compliant", "EEOC Aligned", "FCRA Ready", "Fair Housing Act", "Disparate Impact Analysis"].map(b => (
              <Badge key={b} label={b} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section id="compliance" style={{ padding: "0 1.5rem 5rem" }}>
        <div style={{
          maxWidth: "62rem", margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: "1px", background: "rgba(255,255,255,0.06)",
          borderRadius: "1.25rem", overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {stats.map(s => (
            <div key={s.label} className="stat-card" style={{
              background: "#0d0d0f", padding: "2rem 1.5rem", textAlign: "center",
            }}>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#f4f4f5", fontVariantNumeric: "tabular-nums" }}>
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: "0.78rem", color: "#52525b", marginTop: "0.35rem", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section id="features" style={{ padding: "0 1.5rem 6rem" }}>
        <div style={{ maxWidth: "62rem", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#60a5fa", marginBottom: "0.75rem" }}>
              Platform Features
            </p>
            <h2 style={{ fontSize: "clamp(1.75rem,3.5vw,2.5rem)", fontWeight: 800, letterSpacing: "-0.025em", margin: 0 }}>
              Everything your compliance team needs
            </h2>
            <p style={{ color: "#71717a", marginTop: "0.75rem", fontSize: "1rem", maxWidth: "36rem", margin: "0.75rem auto 0" }}>
              Built for modern banking infrastructure with model-card style reporting and mitigation-first workflows.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1.25rem" }}>
            {features.map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section style={{ padding: "0 1.5rem 6rem" }}>
        <div style={{
          maxWidth: "62rem", margin: "0 auto", position: "relative", overflow: "hidden",
          borderRadius: "1.5rem", padding: "3.5rem 2.5rem", textAlign: "center",
          background: "linear-gradient(135deg,rgba(37,99,235,0.15) 0%,rgba(124,58,237,0.12) 50%,rgba(244,114,182,0.08) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(circle at 50% 0%, rgba(37,99,235,0.25) 0%, transparent 60%)",
          }} />
          <div style={{ position: "relative" }}>
            <h2 style={{ fontSize: "clamp(1.5rem,3vw,2.25rem)", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: "0.75rem" }}>
              Ready to audit your lending model?
            </h2>
            <p style={{ color: "#71717a", fontSize: "1rem", marginBottom: "2rem", maxWidth: "30rem", margin: "0.75rem auto 2rem" }}>
              Upload a dataset and get a full fairness audit report in under 30 seconds — no setup required.
            </p>
            <Link href="/login" className="btn-glow" style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.85rem 2rem", borderRadius: "0.75rem",
              background: "linear-gradient(135deg,#2563eb,#4f46e5)",
              color: "#fff", fontWeight: 700, fontSize: "1rem", textDecoration: "none",
            }}>
              Get Started Free <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "2rem 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{
            width: 22, height: 22, borderRadius: "0.35rem",
            background: "linear-gradient(135deg,#2563eb,#7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ShieldCheck size={12} style={{ color: "#fff" }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#52525b" }}>FairLend AI</span>
        </div>
        <p style={{ fontSize: "0.78rem", color: "#3f3f46" }}>
          © {new Date().getFullYear()} FairLend AI · Employment, Insurance &amp; Scholarship modes coming soon.
        </p>
        <div style={{ display: "flex", gap: "1.25rem" }}>
          {["Privacy", "Terms", "Contact"].map(l => (
            <a key={l} href="/login" style={{ fontSize: "0.78rem", color: "#52525b", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#a1a1aa")}
              onMouseLeave={e => (e.currentTarget.style.color = "#52525b")}>
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
