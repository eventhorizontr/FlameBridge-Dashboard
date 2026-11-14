"use client";

import { useId, useState } from "react";

import { EvidenceChip, Panel, PanelBody, PanelHeader, PanelTitle, SegmentedControl } from "@/components/ui";
import { useDashboard } from "@/lib/store";

type SchematicView = "tunnel" | "gravity";
type FlowMode = "opposed" | "concurrent";

export function WindTunnelSchematic() {
  const mode = useDashboard((s) => s.mode);
  const [view, setView] = useState<SchematicView>("tunnel");
  const [flowMode, setFlowMode] = useState<FlowMode>("opposed");
  const descId = useId();

  return (
    <Panel surface="surface-1">
      <PanelHeader className="flex-wrap">
        <PanelTitle
          eyebrow="Apparatus & Microgravity Physics"
          title={
            mode === "learn"
              ? "How the Space Station Wind Tunnel Works"
              : "ISS Microgravity Science Glovebox — BASS-II Duct"
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl<SchematicView>
                ariaLabel="Schematic view"
                size="sm"
                value={view}
                onChange={setView}
                options={[
                  { value: "tunnel", label: "MSG Wind Tunnel" },
                  { value: "gravity", label: "1g vs. μg Flame" },
                ]}
              />
              {view === "tunnel" && (
                <SegmentedControl<FlowMode>
                  ariaLabel="Flow configuration"
                  size="sm"
                  value={flowMode}
                  onChange={setFlowMode}
                  options={[
                    { value: "opposed", label: "Opposed" },
                    { value: "concurrent", label: "Concurrent" },
                  ]}
                />
              )}
            </div>
          }
        />
      </PanelHeader>

      <PanelBody className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-8 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3 sm:p-4 overflow-hidden">
          {view === "tunnel" ? (
            <svg
              viewBox="0 0 760 280"
              className="w-full h-auto"
              role="img"
              aria-label={`BASS-II wind tunnel schematic in ${flowMode} flow configuration`}
              aria-describedby={descId}
            >
              <defs>
                <radialGradient id="tunnel-flame" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--flame-core)" stopOpacity="0.95" />
                  <stop offset="55%" stopColor="var(--accent)" stopOpacity="0.45" />
                  <stop offset="90%" stopColor="var(--flame-edge)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--surface-2)" stopOpacity="0" />
                </radialGradient>
                <marker
                  id="flow-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--accent)" />
                </marker>
              </defs>

              {/* Instrument gridlines */}
              <line x1="20" y1="40" x2="740" y2="40" stroke="var(--line)" strokeDasharray="3 4" />
              <line x1="20" y1="230" x2="740" y2="230" stroke="var(--line)" strokeDasharray="3 4" />

              {/* Glovebox duct housing */}
              <rect
                x="56"
                y="72"
                width="648"
                height="132"
                rx="10"
                fill="var(--surface-1)"
                stroke="var(--line-strong)"
                strokeWidth="1.5"
              />

              {/* Fan & Flow Restrictor (Left upstream) */}
              <rect x="74" y="92" width="64" height="92" rx="6" fill="var(--surface-3)" stroke="var(--line-strong)" />
              <circle cx="106" cy="138" r="20" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="6 4" />
              <circle cx="106" cy="138" r="5" fill="var(--accent)" />
              <text x="106" y="196" textAnchor="middle" fill="var(--text-2)" fontSize="11">
                Fan (0–12.2 V)
              </text>

              {/* Flow restrictor & honeycomb straightener */}
              <rect x="158" y="84" width="22" height="108" rx="3" fill="var(--surface-2)" stroke="var(--line-strong)" />
              <line x1="164" y1="92" x2="164" y2="184" stroke="var(--text-3)" strokeDasharray="4 4" />
              <line x1="174" y1="92" x2="174" y2="184" stroke="var(--text-3)" strokeDasharray="4 4" />
              <text x="169" y="62" textAnchor="middle" fill="var(--text-3)" fontSize="10">
                Restrictor 0–2
              </text>

              {/* Forced airflow vectors (left to right) */}
              <line x1="200" y1="108" x2="310" y2="108" stroke="var(--accent)" strokeWidth="1.75" markerEnd="url(#flow-arrow)" />
              <line x1="200" y1="138" x2="310" y2="138" stroke="var(--accent)" strokeWidth="1.75" markerEnd="url(#flow-arrow)" />
              <line x1="200" y1="168" x2="310" y2="168" stroke="var(--accent)" strokeWidth="1.75" markerEnd="url(#flow-arrow)" />
              <text x="252" y="96" textAnchor="middle" fill="var(--accent)" fontSize="11">
                Forced airflow
              </text>

              {/* Solid Fuel Sample (PMMA / SIBAL / Nomex) */}
              <rect
                x="355"
                y="130"
                width="175"
                height="16"
                rx="4"
                fill="var(--surface-3)"
                stroke="var(--text-2)"
                strokeWidth="1.5"
              />
              <text x="442" y="164" textAnchor="middle" fill="var(--text-2)" fontSize="11">
                Solid Fuel Sample (PMMA / Fabric)
              </text>

              {/* Ignition & Flame Zone depending on opposed vs concurrent */}
              {flowMode === "opposed" ? (
                <>
                  {/* Downstream ignition -> flame spreads upstream INTO incoming flow */}
                  <circle cx="518" cy="138" r="44" fill="url(#tunnel-flame)" />
                  <ellipse cx="510" cy="138" rx="18" ry="15" fill="none" stroke="var(--flame-edge)" strokeWidth="1.5" />
                  <circle cx="515" cy="138" r="6" fill="var(--flame-core)" />
                  <line x1="485" y1="112" x2="410" y2="112" stroke="var(--ember)" strokeWidth="2" markerEnd="url(#flow-arrow)" />
                  <text x="448" y="102" textAnchor="middle" fill="var(--ember)" fontSize="11">
                    Flame spread (opposed)
                  </text>
                  <text x="542" y="196" textAnchor="middle" fill="var(--text-3)" fontSize="10">
                    Downstream igniter
                  </text>
                </>
              ) : (
                <>
                  {/* Upstream ignition -> flame spreads downstream WITH incoming flow */}
                  <circle cx="372" cy="138" r="46" fill="url(#tunnel-flame)" />
                  <ellipse cx="386" cy="138" rx="22" ry="15" fill="none" stroke="var(--flame-edge)" strokeWidth="1.5" />
                  <circle cx="370" cy="138" r="6" fill="var(--flame-core)" />
                  <line x1="406" y1="112" x2="486" y2="112" stroke="var(--ember)" strokeWidth="2" markerEnd="url(#flow-arrow)" />
                  <text x="448" y="102" textAnchor="middle" fill="var(--ember)" fontSize="11">
                    Flame spread (concurrent)
                  </text>
                  <text x="366" y="196" textAnchor="middle" fill="var(--text-3)" fontSize="10">
                    Upstream igniter
                  </text>
                </>
              )}

              {/* Sensors: Radiometer, O2, CO2/CO, Optical cameras */}
              <rect x="406" y="48" width="90" height="22" rx="4" fill="var(--surface-3)" stroke="var(--line-strong)" />
              <text x="451" y="63" textAnchor="middle" fill="var(--text-2)" fontSize="10">
                Optical Cameras
              </text>

              <rect x="572" y="96" width="110" height="84" rx="6" fill="var(--surface-3)" stroke="var(--line)" />
              <text x="627" y="118" textAnchor="middle" fill="var(--text-1)" fontSize="11" fontWeight="600">
                Telemetry
              </text>
              <text x="627" y="136" textAnchor="middle" fill="var(--text-2)" fontSize="10">
                O₂ (MCA cal.)
              </text>
              <text x="627" y="151" textAnchor="middle" fill="var(--text-2)" fontSize="10">
                CO₂ (CDM) · CO
              </text>
              <text x="627" y="166" textAnchor="middle" fill="var(--text-2)" fontSize="10">
                Radiometer (5 Hz)
              </text>
            </svg>
          ) : (
            <svg
              viewBox="0 0 760 280"
              className="w-full h-auto"
              role="img"
              aria-label="Conceptual illustration of strong and weak buoyancy around a flame"
              aria-describedby={descId}
            >
              <defs>
                <radialGradient id="ug-sphere" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--flame-core)" stopOpacity="0.95" />
                  <stop offset="65%" stopColor="var(--accent)" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="var(--surface-2)" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="earth-plume" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.85" />
                  <stop offset="35%" stopColor="var(--flame-edge)" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="var(--ember)" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Left panel: 1g Earth */}
              <rect x="24" y="20" width="340" height="240" rx="8" fill="var(--surface-1)" stroke="var(--line)" />
              <text x="194" y="46" textAnchor="middle" fill="var(--text-1)" fontSize="13" fontWeight="600">
                Earth Gravity (1g) — Buoyant Convection
              </text>
              <rect x="184" y="198" width="20" height="36" rx="2" fill="var(--surface-3)" stroke="var(--text-2)" />
              <path
                d="M194 74 C222 128, 226 178, 194 196 C162 178, 166 128, 194 74 Z"
                fill="url(#earth-plume)"
                stroke="var(--flame-edge)"
                strokeWidth="1.25"
              />
              <text x="112" y="128" fill="var(--text-2)" fontSize="11">
                Hot gas rises ↑
              </text>
              <text x="112" y="144" fill="var(--text-3)" fontSize="10">
                Cool air pulled in ↓
              </text>
              <text x="194" y="248" textAnchor="middle" fill="var(--text-2)" fontSize="11">
                Arrows show a buoyant updraft
              </text>

              {/* Right panel: Microgravity */}
              <rect x="396" y="20" width="340" height="240" rx="8" fill="var(--surface-1)" stroke="var(--accent)" strokeOpacity="0.45" />
              <text x="566" y="46" textAnchor="middle" fill="var(--flame-core)" fontSize="13" fontWeight="600">
                Microgravity · Weak buoyancy
              </text>
              <circle cx="566" cy="144" r="64" fill="url(#ug-sphere)" />
              <circle cx="566" cy="144" r="34" fill="none" stroke="var(--flame-core)" strokeWidth="2" />
              <circle cx="566" cy="144" r="9" fill="var(--surface-3)" stroke="var(--text-1)" strokeWidth="1.5" />
              <text x="566" y="96" textAnchor="middle" fill="var(--flame-core)" fontSize="11">
                Molecular diffusion
              </text>
              <text x="566" y="248" textAnchor="middle" fill="var(--text-2)" fontSize="11">
                Conceptual illustration
              </text>
            </svg>
          )}
        </div>

        <div id={descId} className="lg:col-span-4 space-y-3 text-[0.875rem] text-[var(--text-2)] leading-relaxed">
          {view === "tunnel" ? (
            <>
              <p className="text-[var(--text-1)] font-medium">
                {flowMode === "opposed" ? "Opposed-Flow Flame Spread" : "Concurrent / Stagnation Spread"}
              </p>
              <p>
                {flowMode === "opposed"
                  ? "In opposed flow, air moves against the direction of flame spread."
                  : "In concurrent flow, air moves in the direction of flame spread."}
              </p>
              <p className="text-[0.8125rem] text-[var(--text-3)]">
                The duct air-speed display responds slowly to changes in fan settings. The BASS-II ReadMe describes an approximately one-minute response time.
              </p>
            </>
          ) : (
            <>
              <p className="text-[var(--text-1)] font-medium">How Buoyancy Changes Gas Transport</p>
              <p>On Earth, surrounding cooler air drives hot combustion gases upward by buoyancy.</p>
              <p>Buoyancy is weaker in orbital freefall. Molecular diffusion and forced airflow still transport gases.</p>
              <EvidenceChip
                id="doi:10.1038/s41598-017-18398-4"
                label="Link et al. (2018)"
                kind="publication"
                href="https://doi.org/10.1038/s41598-017-18398-4"
                detail="The effect of gravity on flame spread over PMMA cylinders"
              />
            </>
          )}
          <EvidenceChip
            id="doi:10.60555/4qc4-de67"
            label="BASS-II ReadMe & Apparatus"
            kind="dataset"
            href="https://psi.nasa.gov/physci/repo/data/investigations/PSI-25"
            detail="PSI-25 ReadMe FAQ: MSG wind tunnel, flow restrictor 0–2, MCA O₂ offset calibration, 5 Hz radiometer."
          />
        </div>
      </PanelBody>
    </Panel>
  );
}
