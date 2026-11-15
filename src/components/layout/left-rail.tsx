"use client";

import { BookOpen, FlaskConical, GitCompareArrows, House, Rows3 } from "lucide-react";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { cn, Tooltip } from "@/components/ui";
import { useDashboard, useDispatch } from "@/lib/store";

import { useIsLearnMode } from "./learn-gate";

export interface NavItem {
  route: "/overview" | "/explore" | "/compare" | "/lab" | "/learn";
  label: string;
  shortLabel: string;
  description: string;
  Icon: typeof House;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    route: "/overview",
    label: "Home",
    shortLabel: "Home",
    description: "Mission overview: the apparatus, the data and where to start",
    Icon: House,
  },
  {
    route: "/explore",
    label: "Runs",
    shortLabel: "Runs",
    description: "Find any of the 129 burns: filters, table, map, gallery",
    Icon: Rows3,
  },
  {
    route: "/compare",
    label: "Compare",
    shortLabel: "Compare",
    description: "Watch burns in sync and see what differs",
    Icon: GitCompareArrows,
  },
  {
    route: "/lab",
    label: "What-if Lab",
    shortLabel: "Lab",
    description: "Set conditions, get the closest real ISS burns",
    Icon: FlaskConical,
  },
  {
    route: "/learn",
    label: "Learn",
    shortLabel: "Learn",
    description: "Five short chapters on real ISS footage",
    Icon: BookOpen,
  },
] as const;

/** Nav items for the current mode: the Learn track is shown only in Explore & Learn mode. */
function useNavItems(): readonly NavItem[] {
  const isLearn = useIsLearnMode();
  return isLearn ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.route !== "/learn");
}

function isItemActive(pathname: string, route: NavItem["route"]) {
  if (route === "/explore") return pathname.startsWith("/explore") || pathname.startsWith("/experiments");
  return pathname.startsWith(route);
}

function DesktopNavLinks() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const compareCount = useDashboard((s) => s.compareIds.length);
  const navItems = useNavItems();

  return (
    <nav className="flex flex-col items-center gap-1.5 flex-1 w-full px-2">
      {navItems.map(({ route, label, shortLabel, description, Icon }) => {
        const active = isItemActive(pathname, route);
        return (
          <Tooltip
            key={route}
            side="right"
            className="w-full"
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
                "relative w-full min-h-14 rounded-[var(--radius-sm)] flex flex-col items-center justify-center gap-1 px-1 py-2",
                "transition-colors duration-[var(--dur-1)] cursor-pointer border",
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40"
                  : "bg-transparent text-[var(--text-2)] border-transparent hover:bg-[var(--surface-3)] hover:text-[var(--text-1)]",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="text-[0.75rem] font-medium leading-none">
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
  const navItems = useNavItems();

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--line-strong)] bg-[rgb(11_16_25/0.92)] backdrop-blur-md px-1 py-1 grid grid-flow-col auto-cols-fr gap-0.5"
    >
      {navItems.map(({ route, label, shortLabel, Icon }) => {
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
            <span className="text-[0.6875rem] leading-none">{shortLabel}</span>
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
        className="hidden md:flex flex-col items-center w-[72px] shrink-0 border-r border-[var(--line)] bg-[var(--surface-1)] py-3 gap-2 sticky top-0 h-screen z-30"
      >
        <button
          type="button"
          onClick={() => dispatch({ type: "navigate", route: "/" })}
          aria-label="Fire in Freefall landing page"
          className="size-10 rounded-[var(--radius-sm)] flex items-center justify-center border border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--accent)]/60 transition-colors cursor-pointer mb-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/orbital-flame-mark.svg" alt="" className="size-7" />
        </button>

        <Suspense fallback={<DesktopNavLinksFallback />}>
          <DesktopNavLinks />
        </Suspense>

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
        <div key={route} className="w-full min-h-14 rounded-[var(--radius-sm)] bg-[var(--surface-2)]/40" />
      ))}
    </div>
  );
}
