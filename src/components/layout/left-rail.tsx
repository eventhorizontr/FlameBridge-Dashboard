"use client";

import { BookOpen, Compass, FlaskConical, GitCompareArrows, Radar } from "lucide-react";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { cn, Tooltip } from "@/components/ui";
import { useDashboard, useDispatch } from "@/lib/store";

export interface NavItem {
  route: "/" | "/explore" | "/compare" | "/lab" | "/learn";
  label: string;
  shortLabel: string;
  description: string;
  Icon: typeof Radar;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    route: "/",
    label: "Mission overview",
    shortLabel: "Overview",
    description: "BASS-II apparatus, telemetry coverage & mission brief",
    Icon: Radar,
  },
  {
    route: "/explore",
    label: "Experiment explorer",
    shortLabel: "Explore",
    description: "129 runs matrix + O₂ × flow parameter-space map",
    Icon: Compass,
  },
  {
    route: "/compare",
    label: "Compare runs",
    shortLabel: "Compare",
    description: "Side-by-side footage, conditions diff & flow overlay",
    Icon: GitCompareArrows,
  },
  {
    route: "/lab",
    label: "What-if Lab",
    shortLabel: "Lab",
    description: "Match parameter combinations against real ISS burns",
    Icon: FlaskConical,
  },
  {
    route: "/learn",
    label: "Explore & Learn",
    shortLabel: "Learn",
    description: "Guided microgravity combustion chapters on real footage",
    Icon: BookOpen,
  },
] as const;

function isItemActive(pathname: string, route: NavItem["route"]) {
  if (route === "/") return pathname === "/";
  if (route === "/explore") return pathname.startsWith("/explore") || pathname.startsWith("/experiments");
  return pathname.startsWith(route);
}

function DesktopNavLinks() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const compareCount = useDashboard((s) => s.compareIds.length);

  return (
    <nav className="flex flex-col items-center gap-1.5 flex-1 w-full px-2">
      {NAV_ITEMS.map(({ route, label, shortLabel, description, Icon }) => {
        const active = isItemActive(pathname, route);
        return (
          <Tooltip
            key={route}
            side="bottom"
            content={
              <span>
                <strong className="font-medium text-[var(--text-1)]">{label}</strong>
                <span className="block text-[var(--text-2)]">{description}</span>
              </span>
            }
          >
            <button
              type="button"
              onClick={() => dispatch({ type: "navigate", route })}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative w-full min-h-11 rounded-[var(--radius-sm)] flex flex-col items-center justify-center gap-0.5 px-1 py-1.5",
                "transition-colors duration-[var(--dur-1)] cursor-pointer border",
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40"
                  : "bg-transparent text-[var(--text-2)] border-transparent hover:bg-[var(--surface-3)] hover:text-[var(--text-1)]",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="text-[0.625rem] font-medium leading-none tracking-tight">
                {shortLabel}
              </span>
              {route === "/compare" && compareCount > 0 && (
                <span
                  aria-hidden="true"
                  className="num absolute top-1 right-1 min-w-3.5 h-3.5 px-1 rounded-full bg-[var(--accent)] text-[var(--bg)] text-[0.5625rem] font-semibold leading-[14px] text-center"
                >
                  {compareCount}
                </span>
              )}
            </button>
          </Tooltip>
        );
      })}
    </nav>
  );
}

function MobileNavLinks() {
  const pathname = usePathname();
  const dispatch = useDispatch();

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--line-strong)] bg-[rgb(11_16_25/0.92)] backdrop-blur-md px-1 py-1 grid grid-cols-5 gap-0.5"
    >
      {NAV_ITEMS.map(({ route, label, shortLabel, Icon }) => {
        const active = isItemActive(pathname, route);
        return (
          <button
            key={route}
            type="button"
            onClick={() => dispatch({ type: "navigate", route })}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative min-h-11 rounded-[var(--radius-sm)] flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer",
              active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-2)] hover:text-[var(--text-1)]",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="text-[0.625rem] leading-none">{shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function LeftRail() {
  const dispatch = useDispatch();

  return (
    <>
      {/* Desktop slim orbital instrument rail */}
      <aside
        aria-label="Primary navigation"
        className="hidden md:flex flex-col items-center w-16 shrink-0 border-r border-[var(--line)] bg-[var(--surface-1)] py-3 gap-2 sticky top-0 h-screen z-30"
      >
        <button
          type="button"
          onClick={() => dispatch({ type: "navigate", route: "/" })}
          aria-label="Fire in Freefall home"
          className="size-10 rounded-[var(--radius-sm)] flex items-center justify-center border border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--accent)]/60 transition-colors cursor-pointer mb-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/orbital-flame-mark.svg" alt="" className="size-7" />
        </button>

        <Suspense fallback={<DesktopNavLinksFallback />}>
          <DesktopNavLinks />
        </Suspense>

        <div className="text-[0.5625rem] num uppercase tracking-[0.1em] text-[var(--text-3)] rotate-180 [writing-mode:vertical-rl] py-2 select-none">
          ISS · MSG · PSI-25
        </div>
      </aside>

      {/* Mobile bottom bar (< 768px) */}
      <Suspense fallback={null}>
        <MobileNavLinks />
      </Suspense>
    </>
  );
}

function DesktopNavLinksFallback() {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 w-full px-2" aria-hidden="true">
      {NAV_ITEMS.map(({ route }) => (
        <div key={route} className="w-full min-h-11 rounded-[var(--radius-sm)] bg-[var(--surface-2)]/40" />
      ))}
    </div>
  );
}
