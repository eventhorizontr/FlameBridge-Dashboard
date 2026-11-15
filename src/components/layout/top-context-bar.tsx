"use client";

import { ChevronRight, Command, FilterX, GraduationCap, Microscope, PanelRightClose, PanelRightOpen, Undo2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { Badge, Button, IconButton, Kbd, SegmentedControl } from "@/components/ui";
import { LEARN_MODULES } from "@/components/learn/curriculum";
import { SITE } from "@/config/site";
import { dashboardStore, describeFilters, useDashboard, useDashboardShallow, useDispatch } from "@/lib/store";
import type { UserMode } from "@/types/dashboard";

import { shellUiStore, useShellUi } from "./shell-state";

const SECTION: Record<string, string> = {
  overview: "Home",
  explore: "Runs",
  experiments: "Runs",
  compare: "Compare",
  lab: "What-if Lab",
  learn: "Learn",
};

const SECTION_HREF: Record<string, string> = { experiments: "/explore", learn: "/learn" };

/** Where am I: "Runs / B1", "Compare", … (the brand lives in the rail). */
function Breadcrumb() {
  const pathname = usePathname();
  const [first, second] = pathname.split("/").filter(Boolean);
  if (!first) return <span className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-[var(--text-1)]">{SITE.name}</span>;
  const section = SECTION[first] ?? first;
  // second crumb: a run ("Runs › B1") or a Learn module ("Learn › M2")
  const run =
    first === "experiments" && second
      ? decodeURIComponent(second).split(":").pop()
      : first === "learn" && second
        ? (LEARN_MODULES.find((m) => m.id === second)?.code ?? null)
        : null;
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[0.9375rem]">
      {run ? (
        <>
          <Link href={SECTION_HREF[first] ?? "/explore"} className="text-[var(--text-2)] hover:text-[var(--text-1)]">
            {section}
          </Link>
          <ChevronRight className="size-3.5 shrink-0 text-[var(--text-3)]" aria-hidden="true" />
          <span className="num truncate font-semibold text-[var(--text-1)]" aria-current="page">
            {run}
          </span>
        </>
      ) : (
        <span className="font-semibold text-[var(--text-1)]" aria-current="page">
          {section}
        </span>
      )}
    </nav>
  );
}

export function TopContextBar() {
  const { mode, filters, log } = useDashboardShallow((s) => ({
    mode: s.mode,
    filters: s.filters,
    log: s.log,
  }));
  const selectionCount = useDashboard((s) => s.selection.length);
  const dispatch = useDispatch();
  const assistantOpen = useShellUi((s) => s.assistantOpen);

  const filterSummary = describeFilters(filters);
  const canUndo = log.some((entry) => !entry.undone && entry.undoable);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgb(6_9_15/0.88)] backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 min-h-14 py-2 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Brand & Investigation context */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => dispatch({ type: "navigate", route: "/" })}
            className="md:hidden size-8 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-2)] flex items-center justify-center shrink-0 cursor-pointer"
            aria-label={SITE.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/flamebridge-mark-128.png" alt="" className="size-6" />
          </button>

          <Suspense fallback={<span className="text-[0.9375rem] font-semibold">{SITE.name}</span>}>
            <Breadcrumb />
          </Suspense>
        </div>

        {/* Center/Right: Active filter pill + Undo + Mode switch + Command palette + AI dock */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {filterSummary && (
            <div className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/35 bg-[var(--accent-soft)] pl-2.5 pr-1 py-0.5 text-[0.75rem] text-[var(--text-1)] max-w-64">
              <span className="truncate">{filterSummary}</span>
              <button
                type="button"
                aria-label="Reset all filters"
                onClick={() => dispatch({ type: "resetFilters" })}
                className="size-5 rounded-full hover:bg-[var(--surface-3)] flex items-center justify-center text-[var(--accent)] cursor-pointer shrink-0"
              >
                <FilterX className="size-3" />
              </button>
            </div>
          )}

          {selectionCount > 0 && (
            <Badge variant="neutral" className="hidden lg:inline-flex num">
              {selectionCount} selected
            </Badge>
          )}

          {canUndo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dashboardStore.getState().undo()}
              title="Undo latest dashboard action"
              className="hidden sm:inline-flex"
            >
              <Undo2 className="size-3.5" aria-hidden="true" />
              <span className="hidden lg:inline">Undo</span>
            </Button>
          )}

          <div data-highlight="mode-switch">
            <SegmentedControl<UserMode>
              ariaLabel="Dashboard mode"
              size="sm"
              value={mode}
              onChange={(nextMode) => dispatch({ type: "setMode", mode: nextMode })}
              options={[
                {
                  value: "expert",
                  label: "Expert",
                  icon: <Microscope className="size-3.5" aria-hidden="true" />,
                },
                {
                  value: "learn",
                  label: "Guided",
                  icon: <GraduationCap className="size-3.5" aria-hidden="true" />,
                },
              ]}
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => shellUiStore.getState().setPaletteOpen(true)}
            aria-label="Open command palette"
            className="hidden sm:inline-flex"
          >
            <Command className="size-3.5 text-[var(--text-2)]" aria-hidden="true" />
            <span className="hidden md:inline text-[var(--text-2)]">Command</span>
            <Kbd>⌘K</Kbd>
          </Button>
          <IconButton
            label="Open command palette"
            size="sm"
            onClick={() => shellUiStore.getState().setPaletteOpen(true)}
            className="sm:hidden"
          >
            <Command className="size-3.5" aria-hidden="true" />
          </IconButton>

          <Button
            variant={assistantOpen ? "accent-soft" : "secondary"}
            size="sm"
            onClick={() => shellUiStore.getState().toggleAssistant()}
            aria-expanded={assistantOpen}
            data-highlight="assistant-toggle"
            aria-label={assistantOpen ? "Close research assistant" : "Open research assistant"}
          >
            <span className="sm:hidden">AI</span>
            <span className="hidden sm:inline">Research AI</span>
            {assistantOpen ? (
              <PanelRightClose className="size-3.5 hidden sm:inline" aria-hidden="true" />
            ) : (
              <PanelRightOpen className="size-3.5 hidden sm:inline" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
