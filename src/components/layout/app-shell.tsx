"use client";

import { createContext, useContext, type ReactNode } from "react";

import { EvidenceChip } from "@/components/ui";
import { SITE } from "@/config/site";

import { AssistantDock } from "./assistant-dock";
import { CommandPalette } from "./command-palette";
import { LeftRail } from "./left-rail";
import { TopContextBar } from "./top-context-bar";

const AppShellMountedContext = createContext(false);

export function AppShell({ children }: { children: ReactNode }) {
  const alreadyMounted = useContext(AppShellMountedContext);
  if (alreadyMounted) return <>{children}</>;

  return (
    <AppShellMountedContext.Provider value={true}>
      <div className="min-h-screen flex bg-[var(--bg)] text-[var(--text-1)]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:rounded-[var(--radius-sm)] focus:bg-[var(--accent)] focus:text-[var(--bg)] focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>

        <LeftRail />

        <div className="flex-1 min-w-0 flex flex-col pb-14 md:pb-0">
          <TopContextBar />

          <div className="flex-1 flex min-w-0">
            <main id="main-content" className="flex-1 min-w-0">
              <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {children}
              </div>
            </main>
            <AssistantDock />
          </div>

          <footer className="border-t border-[var(--line)] bg-[var(--surface-1)]/60">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[0.75rem] text-[var(--text-2)]">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-[var(--text-1)]">{SITE.challenge}</span>
                <span aria-hidden="true" className="text-[var(--text-3)]">·</span>
                <span>
                  Team <strong className="font-medium text-[var(--text-1)]">{SITE.team.name}</strong>:{" "}
                  {SITE.team.members.join(" · ")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <EvidenceChip
                  id="doi:10.60555/4qc4-de67"
                  label="PSI-25 · CC0 1.0"
                  kind="dataset"
                  href="https://psi.nasa.gov/physci/repo/data/investigations/PSI-25"
                />
                <a
                  href={SITE.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--text-2)] hover:text-[var(--accent)] transition-colors"
                >
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </div>

        <CommandPalette />
      </div>
    </AppShellMountedContext.Provider>
  );
}
