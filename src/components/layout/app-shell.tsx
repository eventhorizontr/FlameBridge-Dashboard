"use client";

import { createContext, Suspense, useContext, type ReactNode } from "react";

import { EvidenceChip } from "@/components/ui";
import { SITE } from "@/config/site";

import { AssistantDock } from "./assistant-dock";
import { CommandPalette } from "./command-palette";
import { RunDirectoryContext, type RunDirectoryEntry } from "./run-directory";
import { MobileTabs, TopNav } from "./top-nav";

const AppShellMountedContext = createContext(false);

/**
 * App frame (ADR-020): glass top navigation, content, assistant dock, compact footer.
 * `bleed` lets a page (the landing) span the full width and manage its own spacing.
 */
export function AppShell({ children, bleed = false, runs = [] }: { children: ReactNode; bleed?: boolean; runs?: RunDirectoryEntry[] }) {
  const alreadyMounted = useContext(AppShellMountedContext);
  if (alreadyMounted) return <>{children}</>;

  return (
    <AppShellMountedContext.Provider value={true}>
      <RunDirectoryContext.Provider value={runs}>
      <div className="flex min-h-screen flex-col text-[var(--text-1)]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-[var(--radius-sm)] focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--bg)]"
        >
          Skip to main content
        </a>

        <TopNav />

        <div className="flex min-w-0 flex-1 pb-14 md:pb-0">
          <main id="main-content" className="min-w-0 flex-1">
            {bleed ? children : <div className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 sm:py-8">{children}</div>}
          </main>
          <AssistantDock />
        </div>

        <footer className="border-t border-[var(--line)]">
          <div className="mx-auto flex max-w-[1680px] flex-col justify-between gap-2 px-4 py-5 text-[0.75rem] text-[var(--text-3)] sm:flex-row sm:items-center sm:px-6">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[var(--text-2)]">{SITE.challenge}</span>
              <span aria-hidden="true">·</span>
              <span>
                Built by <strong className="font-medium text-[var(--text-1)]">{SITE.team.name}</strong> — {SITE.team.members.join(", ")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <EvidenceChip
                id="doi:10.60555/4qc4-de67"
                label="NASA PSI-25 · CC0 1.0"
                kind="dataset"
                href="https://psi.nasa.gov/physci/repo/data/investigations/PSI-25"
              />
              <a href={SITE.repository} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)]">
                GitHub
              </a>
            </div>
          </div>
        </footer>

        <Suspense fallback={null}>
          <MobileTabs />
        </Suspense>
        <CommandPalette />
      </div>
      </RunDirectoryContext.Provider>
    </AppShellMountedContext.Provider>
  );
}
