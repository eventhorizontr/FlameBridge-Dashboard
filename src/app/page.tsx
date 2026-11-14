import { ArrowRight, Compass, FlaskConical, Radar } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout";
import { Badge, EmptyState, EvidenceChip, Panel, PanelBody, PanelHeader, PanelTitle, Stat } from "@/components/ui";
import { SITE } from "@/config/site";

export default function HomePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <Panel surface="surface-1" padded className="border-[var(--line-strong)]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">ISS Microgravity Science Glovebox</Badge>
                <EvidenceChip
                  id="doi:10.60555/4qc4-de67"
                  label="PSI-25 · BASS-II"
                  kind="dataset"
                  href="https://psi.nasa.gov/physci/repo/data/investigations/PSI-25"
                />
              </div>
              <h1 className="text-[2rem] sm:text-[3rem] font-semibold tracking-[-0.02em] leading-[1.1] text-[var(--text-1)]">
                {SITE.name}
              </h1>
              <p className="text-[1rem] text-[var(--text-2)] leading-relaxed">
                {SITE.tagline}. Orbital instrument workspace ready for PSI-25 experiment exploration,
                frame-by-frame flame inspection, What-if matching, and AI-driven navigation.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 min-h-9 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--bg)] text-[0.875rem] font-medium hover:brightness-110 transition-all"
                >
                  <Compass className="size-4" aria-hidden="true" />
                  <span>Open Experiment Explorer</span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/lab"
                  className="inline-flex items-center gap-2 min-h-9 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--line-strong)] text-[var(--text-1)] text-[0.875rem] font-medium hover:bg-[var(--surface-3)] transition-colors"
                >
                  <FlaskConical className="size-4 text-[var(--accent)]" aria-hidden="true" />
                  <span>Visual What-if Lab</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full lg:w-96 shrink-0">
              <Stat
                label="Test Runs"
                value={129}
                evidence={{ id: "PSI-25", label: "PSI-25 Table", kind: "dataset" }}
              />
              <Stat
                label="Investigators"
                value={6}
                evidence={{ id: "PSI-25-PIs", label: "BASS-II PIs", kind: "dataset" }}
              />
              <Stat
                label="O₂ Envelope"
                value="13.6–22.2"
                unit="% O₂"
                evidence={{ id: "PSI-25-O2", label: "MCA Calibrated", kind: "dataset" }}
              />
              <Stat
                label="Duct Airflow"
                value="0–40"
                unit="cm/s"
                evidence={{ id: "PSI-25-AIR", label: "MSG Tunnel", kind: "dataset" }}
              />
            </div>
          </div>
        </Panel>

        <Panel surface="surface-2">
          <PanelHeader>
            <PanelTitle
              eyebrow="Orbital Instrument Shell"
              title="Workspace Routes Ready"
            />
          </PanelHeader>
          <PanelBody>
            <EmptyState
              icon={<Radar className="size-5" />}
              eyebrow="Issue #5 · Foundation"
              title="Mission overview visualization coming next"
              description="The shell, design tokens, store-backed mode switch, command palette (⌘K), and collapsible AI assistant dock are live. Navigate between Explorer, Compare, What-if Lab, and Learn via the rail."
            />
          </PanelBody>
        </Panel>
      </div>
    </AppShell>
  );
}
