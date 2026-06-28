"use client";

import Link from "next/link";
import { useState } from "react";

import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

import { BenchmarkSection } from "./benchmark";
import { CalibrationSection } from "./calibration";

import "../trust.css";

export type TrustViewState = "loaded" | "loading" | "empty" | "error";

export function TrustScreen({ initialState }: { initialState: TrustViewState }) {
  const [view, setView] = useState<TrustViewState>(initialState);

  return (
    <div className="trust-page">
      <header className="pub-bar">
        <Link className="brand brand-link" href="/dashboard" aria-label="Glasshouse">
          <span className="brand-mark">
            <Icon name="scan" size={18} />
          </span>
          <span className="brand-text">
            <span className="brand-name">Glasshouse</span>
          </span>
        </Link>
        <div className="pub-right">
          <ThemeToggle />
          <Link href="/onboarding" className={buttonVariants()}>
            Start your audit
          </Link>
        </div>
      </header>

      <main className="trust-wrap">
        <section className="trust-hero">
          <p className="eyebrow-trust">Accuracy &amp; trust</p>
          <h1 className="trust-h1">How do we know these numbers?</h1>
          <p className="trust-lead">
            Every reliability figure in your audit is <b>measured, then calibrated</b> — validated
            on a public benchmark with known answers before it&rsquo;s ever applied to you.
            Here&rsquo;s exactly how, and how far we&rsquo;ll and won&rsquo;t go in claiming it.
          </p>
          <div className="trust-keystats">
            <div className="keystat keystat-accent">
              <div className="keystat-v">
                ~85<span className="keystat-unit">% top-1</span>
              </div>
              <div className="keystat-l">Text accuracy on SynthPAI, the public benchmark</div>
            </div>
            <div className="keystat">
              <div className="keystat-v">
                0.04 <span className="keystat-unit">ECE</span>
              </div>
              <div className="keystat-l">Expected calibration error — lower is better</div>
            </div>
            <div className="keystat">
              <div className="keystat-v">Calibrated</div>
              <div className="keystat-l">
                You never see a raw model confidence — only the calibrated number
              </div>
            </div>
          </div>
        </section>

        {(view === "loaded" || view === "loading") && (
          <>
            <BenchmarkSection loading={view === "loading"} />
            <CalibrationSection loading={view === "loading"} />
          </>
        )}
        {view === "empty" && (
          <section className="trust-sec">
            <EmptyState
              icon="bar-chart-3"
              title="No benchmark yet"
              message="Run the eval to populate this page. We score the engine on SynthPAI — a public set of synthetic profiles with known answers — then calibrate every reliability number against it."
              message2="Until then, the medical-test analogy below explains what these numbers will mean."
              action="Run the eval"
              actionHref="/trust"
            />
          </section>
        )}
        {view === "error" && (
          <section className="trust-sec">
            <ErrorState
              title="Couldn't load the benchmark"
              message="We couldn't fetch the latest eval results — almost always a temporary connection issue. The numbers themselves are fine."
              onRetry={() => setView("loaded")}
              retryLabel="Try again"
              details={"request_id: bench_5c2e10\nreason: results service unavailable (503)"}
            />
          </section>
        )}

        <section className="trust-sec">
          <p className="sec-eyebrow">
            <Icon name="life-buoy" size={14} /> Why it holds for you
          </p>
          <h2 className="trust-h2">Like a validated medical test</h2>
          <p className="trust-p">
            A blood test isn&rsquo;t re-validated on every patient — it&rsquo;s validated once on a
            population with known outcomes, then trusted for the next person. Calibration works the
            same way.
          </p>
          <div className="analogy">
            <div className="ana-step">
              <div className="ana-ic">
                <Icon name="users" size={20} />
              </div>
              <div className="ana-num">01</div>
              <div className="ana-t">Validate on a population</div>
              <div className="ana-d">
                Run the engine over thousands of benchmark profiles whose answers are already known.
              </div>
            </div>
            <div className="ana-step">
              <div className="ana-ic">
                <Icon name="gauge" size={20} />
              </div>
              <div className="ana-num">02</div>
              <div className="ana-t">Calibrate once</div>
              <div className="ana-d">
                Learn how often each confidence level is truly correct, per attribute, and store it
                as a map.
              </div>
            </div>
            <div className="ana-step">
              <div className="ana-ic">
                <Icon name="user" size={20} />
              </div>
              <div className="ana-num">03</div>
              <div className="ana-t">Apply to you</div>
              <div className="ana-d">
                Your audit reuses that map. You&rsquo;re the new patient — scored against a
                validated test, not re-validated.
              </div>
            </div>
          </div>
          <p className="analogy-note">
            <Icon name="info" size={16} />
            <span>
              <b>The honest boundary:</b> this assumes your footprint resembles the benchmark
              population. When it doesn&rsquo;t, reliability is reported as a wider band — or we
              abstain rather than guess.
            </span>
          </p>
        </section>

        <section className="trust-sec">
          <p className="sec-eyebrow">
            <Icon name="image" size={14} /> Images — handled humbly
          </p>
          <h2 className="trust-h2">Image accuracy is supplementary</h2>
          <div className="img-card">
            <div className="img-stat">
              <div className="img-stat-v">77.6%</div>
              <div className="img-stat-ci">95% CI [71.6 – 79.8]</div>
              <div className="img-stat-l">Reference image top-1 on the VIP benchmark</div>
            </div>
            <div className="img-body">
              <span className="img-tag">
                <Icon name="info" size={13} /> Supplementary
              </span>
              <p className="trust-p" style={{ marginTop: "var(--space-3)" }}>
                The public image benchmark (VIP) is access-gated and our own labeled photo set is
                small, so image inference is <b>harder to validate</b> than text. We treat it as
                supplementary: always reported <b>with intervals</b>, never headlined, and never
                used to overclaim. <b>Text remains our rigorous metric.</b>
              </p>
            </div>
          </div>
        </section>

        <section className="trust-cta">
          <h2>See what an AI can infer about you</h2>
          <p>
            Run your own private audit — consent-first, advise-only, and measured the same way you
            just read about.
          </p>
          <div className="trust-cta-row">
            <Link href="/onboarding" className={buttonVariants()}>
              Start your audit <Icon name="arrow-right" size={15} />
            </Link>
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "secondary" }))}>
              View a sample dashboard
            </Link>
          </div>
          <p className="trust-foot-note">
            Benchmarks update with every eval · last run: SynthPAI, June 2026 · engine_version
            pinned per result.
          </p>
        </section>
      </main>
    </div>
  );
}
