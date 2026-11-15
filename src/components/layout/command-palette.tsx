"use client";

import {
  ArrowRight,
  BookOpen,
  Compass,
  Filter,
  FlaskConical,
  GitCompareArrows,
  Microscope,
  Radar,
  RotateCcw,
  Search,
  MessagesSquare,
  Gauge,
  GraduationCap,
  House,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { cn, Kbd } from "@/components/ui";
import { LEARN_MODULES } from "@/components/learn/curriculum";
import { useAssistant } from "@/lib/ai/client/use-assistant";
import { useDispatch } from "@/lib/store";

import { useIsLearnMode } from "./learn-gate";

import { shellUiStore, useShellUi } from "./shell-state";

interface PaletteCommand {
  id: string;
  group: "Navigate" | "Mode" | "What-if Lab" | "Learn Academy" | "Quick Filters" | "Representative Runs" | "AI Assistant";
  label: string;
  hint: string;
  icon: ReactNode;
  run: () => void;
}

const FEATURED_RUNS = [
  { id: "PSI-25:B3", label: "Open run B3 — Bhattacharjee 100 µm PMMA film (22.2 % O₂)" },
  { id: "PSI-25:M5", label: "Open run M5 — Miller PMMA slab (>500 ppm CO bound)" },
  { id: "PSI-25:O1", label: "Open run O1 — Olson clear PMMA rod (concurrent)" },
  { id: "PSI-25:O13a", label: "Open run O13a — Olson rod (stepped airflow & QA flag)" },
  { id: "PSI-25:P1", label: "Open run P1 — Fernandez-Pello black PMMA rod (opposed)" },
  { id: "PSI-25:T1", label: "Open run T1 — T'ien SIBAL cotton/fiberglass fabric" },
  { id: "PSI-25:F2", label: "Open run F2 — Ferkul Nomex III flame test" },
] as const;

export function CommandPalette() {
  const open = useShellUi((s) => s.paletteOpen);
  const dispatch = useDispatch();
  const isLearn = useIsLearnMode();
  const { send } = useAssistant();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        shellUiStore.getState().togglePalette();
      } else if (e.key === "Escape" && shellUiStore.getState().paletteOpen) {
        shellUiStore.getState().setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      setQuery("");
      setActiveIndex(0);
      inputRef.current?.focus();
    }, 10);
    return () => window.clearTimeout(id);
  }, [open]);

  const commands = useMemo<PaletteCommand[]>(() => {
    const close = () => shellUiStore.getState().setPaletteOpen(false);
    const base: PaletteCommand[] = [
      {
        id: "nav-landing",
        group: "Navigate",
        label: "Landing page",
        hint: "/",
        icon: <House className="size-4 text-[var(--accent)]" />,
        run: () => {
          dispatch({ type: "navigate", route: "/" });
          close();
        },
      },
      {
        id: "nav-overview",
        group: "Navigate",
        label: "Home · Mission overview",
        hint: "/overview",
        icon: <Radar className="size-4 text-[var(--accent)]" />,
        run: () => {
          dispatch({ type: "navigate", route: "/overview" });
          close();
        },
      },
      {
        id: "nav-explore",
        group: "Navigate",
        label: "Experiment Explorer (129 runs)",
        hint: "/explore",
        icon: <Compass className="size-4 text-[var(--accent)]" />,
        run: () => {
          dispatch({ type: "navigate", route: "/explore" });
          close();
        },
      },
      {
        id: "nav-compare",
        group: "Navigate",
        label: "Compare Runs (2–4 runs)",
        hint: "/compare",
        icon: <GitCompareArrows className="size-4 text-[var(--accent)]" />,
        run: () => {
          dispatch({ type: "navigate", route: "/compare" });
          close();
        },
      },
      {
        id: "nav-lab",
        group: "Navigate",
        label: "Visual What-if Lab",
        hint: "/lab",
        icon: <FlaskConical className="size-4 text-[var(--accent)]" />,
        run: () => {
          dispatch({ type: "navigate", route: "/lab" });
          close();
        },
      },
      ...(isLearn
        ? ([
            {
              id: "nav-learn",
              group: "Navigate",
              label: "Learn Academy",
              hint: "/learn",
              icon: <BookOpen className="size-4 text-[var(--accent)]" />,
              run: () => {
                dispatch({ type: "navigate", route: "/learn" });
                close();
              },
            },
          ] satisfies PaletteCommand[])
        : []),
      {
        id: "mode-expert",
        group: "Mode",
        label: "Switch to Expert Mode",
        hint: "Dense telemetry & QA",
        icon: <Microscope className="size-4 text-[var(--text-2)]" />,
        run: () => {
          dispatch({ type: "setMode", mode: "expert" });
          close();
        },
      },
      {
        id: "mode-learn",
        group: "Mode",
        label: "Switch to Guided mode",
        hint: "Guided narrative",
        icon: <BookOpen className="size-4 text-[var(--text-2)]" />,
        run: () => {
          dispatch({ type: "setMode", mode: "learn" });
          close();
        },
      },
      {
        id: "lab-exploration-atmosphere",
        group: "What-if Lab",
        label: "Lab: exploration atmosphere (34 % O₂ · 56.5 kPa)",
        hint: "NASA/TP-2010-216134",
        icon: <Gauge className="size-4 text-[var(--accent)]" />,
        run: () => {
          dispatch({ type: "setLabParams", params: { o2Pct: 34, pressureKpa: 56.5 } });
          dispatch({ type: "navigate", route: "/lab" });
          close();
        },
      },
      {
        id: "lab-clear-pressure",
        group: "What-if Lab",
        label: "Lab: stop comparing pressure",
        hint: "pressure → not compared",
        icon: <Gauge className="size-4 text-[var(--text-2)]" />,
        run: () => {
          dispatch({ type: "setLabParams", params: { pressureKpa: null } });
          dispatch({ type: "navigate", route: "/lab" });
          close();
        },
      },
      ...LEARN_MODULES.map(
        (m): PaletteCommand => ({
          id: `learn-${m.id}`,
          group: "Learn Academy",
          label: `${m.code} · ${m.title}`,
          hint: isLearn ? m.subtitle : "Switches to Guided mode",
          icon: <GraduationCap className="size-4 text-[var(--flame-core)]" />,
          run: () => {
            if (!isLearn) dispatch({ type: "setMode", mode: "learn" });
            dispatch({ type: "navigate", route: `/learn/${m.id}` });
            close();
          },
        }),
      ),
      {
        id: "filter-pmma-rods",
        group: "Quick Filters",
        label: "Filter: PMMA Rods",
        hint: "Explore · rod",
        icon: <Filter className="size-4 text-[var(--series-2)]" />,
        run: () => {
          dispatch({ type: "setFilters", filters: { materials: ["PMMA"], geometries: ["rod"] } });
          dispatch({ type: "navigate", route: "/explore" });
          close();
        },
      },
      {
        id: "filter-low-o2",
        group: "Quick Filters",
        label: "Filter: Low Oxygen (≤ 18 % O₂)",
        hint: "Explore · O₂ ≤ 18%",
        icon: <Filter className="size-4 text-[var(--series-1)]" />,
        run: () => {
          dispatch({ type: "setFilters", filters: { o2InitialPct: { max: 18 } } });
          dispatch({ type: "navigate", route: "/explore" });
          close();
        },
      },
      {
        id: "filter-reset",
        group: "Quick Filters",
        label: "Reset All Filters",
        hint: "Clear query",
        icon: <RotateCcw className="size-4 text-[var(--text-2)]" />,
        run: () => {
          dispatch({ type: "resetFilters" });
          close();
        },
      },
      ...FEATURED_RUNS.map((r) => ({
        id: `run-${r.id}`,
        group: "Representative Runs" as const,
        label: r.label,
        hint: r.id,
        icon: <ArrowRight className="size-4 text-[var(--flame-core)]" />,
        run: () => {
          dispatch({ type: "navigate", route: `/experiments/${encodeURIComponent(r.id)}` });
          close();
        },
      })),
      {
        id: "ai-open",
        group: "AI Assistant",
        label: query.trim() ? `Ask AI: “${query.trim()}”` : "Open AI Research Assistant",
        hint: "OpenAI / Claude",
        icon: <MessagesSquare className="size-4 text-[var(--accent)]" />,
        run: () => {
          const prompt = query.trim();
          shellUiStore.getState().setAssistantOpen(true);
          close();
          if (prompt) void send(prompt);
        },
      },
    ];

    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (c) =>
        c.id === "ai-open" ||
        c.label.toLowerCase().includes(q) ||
        c.hint.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q),
    );
  }, [dispatch, isLearn, query, send]);

  if (!open) return null;

  const clampedIndex = Math.min(activeIndex, Math.max(0, commands.length - 1));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-[rgb(6_9_15/0.68)] backdrop-blur-sm"
      onClick={() => shellUiStore.getState().setPaletteOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-[var(--radius-lg)] bg-[rgb(11_16_25/0.88)] backdrop-blur-md border border-[var(--line-strong)] overflow-hidden shadow-2xl"
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--line)]">
          <Search className="size-4 text-[var(--text-3)] shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % Math.max(1, commands.length));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => (i - 1 + commands.length) % Math.max(1, commands.length));
              } else if (e.key === "Enter" && commands[clampedIndex]) {
                e.preventDefault();
                commands[clampedIndex].run();
              }
            }}
            placeholder="Jump to a route, run (B3, O13a), filter, or ask the AI…"
            className="flex-1 bg-transparent text-[0.9375rem] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none"
          />
          <button
            type="button"
            aria-label="Close command palette"
            onClick={() => shellUiStore.getState().setPaletteOpen(false)}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <ul role="listbox" className="max-h-80 overflow-y-auto p-2 space-y-0.5">
          {commands.map((cmd, idx) => {
            const selected = idx === clampedIndex;
            return (
              <li key={cmd.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={cmd.run}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-left transition-colors cursor-pointer",
                    selected
                      ? "bg-[var(--accent-soft)] text-[var(--text-1)]"
                      : "text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text-1)]",
                  )}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    {cmd.icon}
                    <span className="text-[0.875rem] truncate">{cmd.label}</span>
                  </span>
                  <span className="num text-[0.6875rem] text-[var(--text-3)] shrink-0">
                    {cmd.hint}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--line)] bg-[var(--surface-1)]/80 text-[0.75rem] text-[var(--text-3)]">
          <span className="flex items-center gap-2">
            <Kbd>↑↓</Kbd> navigate <Kbd>Enter</Kbd> run
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
