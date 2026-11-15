"use client";

import { BookOpen, Compass, FilterX, FlaskConical, GitCompareArrows, Microscope, Search, Sparkles, Undo2 } from "lucide-react";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { cn, Kbd, SegmentedControl } from "@/components/ui";
import { SITE } from "@/config/site";
import { dashboardStore, describeFilters, useDashboard, useDashboardShallow, useDispatch } from "@/lib/store";
import type { UserMode } from "@/types/dashboard";

import { shellUiStore, useShellUi } from "./shell-state";

export interface NavItem {
  route: "/explore" | "/compare" | "/lab" | "/learn";
  label: string;
  description: string;
  Icon: typeof Compass;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { route: "/explore", label: "Atlas", description: "Find runs: flame gallery, matrix and parameter map", Icon: Compass },
  { route: "/compare", label: "Compare", description: "Synchronised footage and condition differences", Icon: GitCompareArrows },
  { route: "/lab", label: "Lab", description: "Match a what-if against the measured envelope", Icon: FlaskConical },
  { route: "/learn", label: "Learn", description: "Guided chapters on real footage", Icon: BookOpen },
] as const;

export function isItemActive(pathname: string, route: NavItem["route"]) {
  if (route === "/explore") return pathname.startsWith("/explore") || pathname.startsWith("/experiments");
  return pathname.startsWith(route);
}

function NavTabs() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const compareCount = useDashboard((s) => s.compareIds.length);
  return (
    <nav aria-label="Primary" className="hidden md:flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-1)] p-1">
      {NAV_ITEMS.map(({ route, label, description }) => {
        const active = isItemActive(pathname, route);
        return (
          <button
            key={route}
            type="button"
            title={description}
            aria-current={active ? "page" : undefined}
            onClick={() => dispatch({ type: "navigate", route })}
            className={cn(
              "relative rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors cursor-pointer",
              active ? "text-[var(--text-1)]" : "text-[var(--text-2)] hover:text-[var(--text-1)]",
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 rounded-full bg-[var(--surface-3)] shadow-[inset_0_1px_0_var(--glow-line)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">
              {label}
              {route === "/compare" && compareCount > 0 && (
                <span className="num ml-1.5 rounded-full bg-[var(--accent)] px-1.5 text-[0.625rem] text-[var(--bg)]">{compareCount}</span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function TopNav() {
  const dispatch = useDispatch();
  const { mode, filters, log } = useDashboardShallow((s) => ({ mode: s.mode, filters: s.filters, log: s.log }));
  const assistantOpen = useShellUi((s) => s.assistantOpen);
  const filterSummary = describeFilters(filters);
  const canUndo = log.some((entry) => !entry.undone && entry.undoable);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgb(4_6_11/0.72)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => dispatch({ type: "navigate", route: "/" })}
          className="group flex shrink-0 items-center gap-2.5 cursor-pointer"
          aria-label={`${SITE.name} home`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/orbital-flame-mark.svg" alt="" className="size-8 transition-transform duration-[var(--dur-3)] group-hover:rotate-12" />
          <span className="hidden sm:block text-[0.9375rem] font-semibold tracking-[-0.02em] text-[var(--text-1)]">{SITE.name}</span>
        </button>

        <Suspense fallback={<div className="hidden md:block h-9 w-80" />}>
          <NavTabs />
        </Suspense>

        <button
          type="button"
          onClick={() => shellUiStore.getState().setPaletteOpen(true)}
          className="ml-auto flex h-9 min-w-0 flex-1 max-w-sm items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-1)] px-3 text-left text-[0.8125rem] text-[var(--text-3)] hover:border-[var(--line-strong)] hover:text-[var(--text-2)] cursor-pointer"
          aria-label="Search runs and commands"
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Search runs, PIs, conditions…</span>
          <Kbd className="ml-auto hidden sm:inline-flex">⌘K</Kbd>
        </button>

        {filterSummary && (
          <div className="hidden xl:inline-flex max-w-56 items-center gap-1.5 rounded-full border border-[var(--accent)]/35 bg-[var(--accent-soft)] py-1 pl-3 pr-1 text-[0.75rem] text-[var(--text-1)]">
            <span className="truncate">{filterSummary}</span>
            <button
              type="button"
              aria-label="Reset all filters"
              onClick={() => dispatch({ type: "resetFilters" })}
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-[var(--accent)] hover:bg-[var(--surface-3)] cursor-pointer"
            >
              <FilterX className="size-3.5" />
            </button>
          </div>
        )}

        {canUndo && (
          <button
            type="button"
            onClick={() => dashboardStore.getState().undo()}
            title="Undo latest dashboard action"
            aria-label="Undo latest dashboard action"
            className="hidden sm:flex size-9 items-center justify-center rounded-full border border-[var(--line)] text-[var(--text-2)] hover:text-[var(--text-1)] cursor-pointer"
          >
            <Undo2 className="size-4" aria-hidden="true" />
          </button>
        )}

        <div className="hidden lg:block" data-highlight="mode-switch">
          <SegmentedControl<UserMode>
            ariaLabel="Dashboard mode"
            size="sm"
            value={mode}
            onChange={(nextMode) => dispatch({ type: "setMode", mode: nextMode })}
            options={[
              { value: "expert", label: "Expert", icon: <Microscope className="size-3.5" aria-hidden="true" /> },
              { value: "learn", label: "Learn", icon: <BookOpen className="size-3.5" aria-hidden="true" /> },
            ]}
          />
        </div>

        <button
          type="button"
          onClick={() => shellUiStore.getState().toggleAssistant()}
          aria-expanded={assistantOpen}
          data-highlight="assistant-toggle"
          aria-label={assistantOpen ? "Close research assistant" : "Open research assistant"}
          className="group relative flex h-9 shrink-0 items-center gap-2 rounded-full p-px cursor-pointer"
        >
          <span aria-hidden="true" style={{ backgroundImage: "var(--grad-flame)" }} className="absolute inset-0 rounded-full opacity-80 transition-opacity group-hover:opacity-100" />
          <span className="relative flex h-full items-center gap-2 rounded-full bg-[var(--bg-raise)] px-3.5 text-[0.8125rem] font-medium text-[var(--text-1)]">
            <Sparkles className="size-4 text-[var(--flame-hot)]" aria-hidden="true" />
            <span className="hidden sm:inline">{assistantOpen ? "Close AI" : "Ask AI"}</span>
          </span>
        </button>
      </div>
    </header>
  );
}

/** Bottom tab bar on phones. */
export function MobileTabs() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 gap-0.5 border-t border-[var(--line-strong)] bg-[rgb(4_6_11/0.88)] px-1 py-1 backdrop-blur-xl"
    >
      {NAV_ITEMS.map(({ route, label, Icon }) => {
        const active = isItemActive(pathname, route);
        return (
          <button
            key={route}
            type="button"
            onClick={() => dispatch({ type: "navigate", route })}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] py-1 cursor-pointer",
              active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-2)]",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="text-[0.625rem]">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
