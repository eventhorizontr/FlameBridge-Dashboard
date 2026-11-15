import { describe, expect, it } from "vitest";

import { EMPTY_FILTERS } from "@/types/dashboard";

import { createDashboardStore, LOG_LIMIT } from "./store";
import { fromUrlState, serializeUrl, toUrlState } from "./url";
import { INITIAL_DATA } from "./state";

const VIDEO = "6924803a7f6aa6a8302103cc";
const catalog = [
  { id: "PSI-25:B1", videoIds: [VIDEO] },
  { id: "PSI-25:B2", videoIds: [] },
  { id: "PSI-25:O13a", videoIds: [] },
];

const fresh = () => {
  const store = createDashboardStore();
  store.getState().setCatalog(catalog);
  return store;
};

describe("dispatch", () => {
  it("applies a valid action, logs a human label and the source", () => {
    const s = fresh();
    const r = s.getState().dispatch(
      { type: "setFilters", filters: { materials: ["PMMA"], geometries: ["rod"], o2InitialPct: { min: 15, max: 18 } } },
      { source: "ai" },
    );
    expect(r.ok).toBe(true);
    const st = s.getState();
    expect(st.filters.materials).toEqual(["PMMA"]);
    expect(st.filters.text).toBe("");
    expect(st.log[0]?.label).toBe("Filtered to PMMA · rod · 15–18 % O₂");
    expect(st.log[0]?.source).toBe("ai");
  });

  it("rejects schema-invalid and hallucinated actions without changing state", () => {
    const s = fresh();
    const before = s.getState();
    expect(s.getState().dispatch({ type: "setMode", mode: "god" }).ok).toBe(false);
    const r = s.getState().dispatch({ type: "openExperiment", id: "PSI-25:Z99" });
    expect(r).toEqual({ ok: false, error: "Unknown experiment PSI-25:Z99" });
    const v = s.getState().dispatch({ type: "seekVideo", experimentId: "PSI-25:B2", videoId: VIDEO, timeS: 3 });
    expect(v.ok).toBe(false);
    expect(s.getState().log).toHaveLength(0);
    expect(s.getState().filters).toBe(before.filters);
  });

  it("openExperiment and compare request navigation", () => {
    const s = fresh();
    s.getState().dispatch({ type: "openExperiment", id: "PSI-25:O13a" });
    expect(s.getState().navigationRequest?.route).toBe("/experiments/PSI-25%3AO13a");
    expect(s.getState().openExperimentId).toBe("PSI-25:O13a");
    s.getState().dispatch({ type: "compare", ids: ["PSI-25:B1", "PSI-25:B2"] });
    expect(s.getState().route).toBe("/compare");
    expect(s.getState().log.at(-1)?.label).toBe("Comparing B1 vs B2");
  });

  it("dispatchMany is atomic", () => {
    const s = fresh();
    const r = s.getState().dispatchMany([{ type: "setMode", mode: "learn" }, { type: "compare", ids: ["PSI-25:B1"] }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.index).toBe(1);
    expect(s.getState().mode).toBe("expert");
  });

  it("caps the log", () => {
    const s = fresh();
    for (let i = 0; i < LOG_LIMIT + 5; i++) s.getState().dispatch({ type: "highlight", target: `t${i}` });
    expect(s.getState().log).toHaveLength(LOG_LIMIT);
  });
});

describe("undo", () => {
  it("restores exactly the touched slice", () => {
    const s = fresh();
    s.getState().dispatch({ type: "setFilters", filters: { materials: ["PMMA"] } });
    s.getState().dispatch({ type: "setFilters", filters: { hasVideo: true } });
    expect(s.getState().undo()).toBe(1);
    expect(s.getState().filters).toEqual({ ...EMPTY_FILTERS, materials: ["PMMA"] });
    expect(s.getState().undo()).toBe(1);
    expect(s.getState().filters).toEqual(EMPTY_FILTERS);
    expect(s.getState().undo()).toBe(0);
  });

  it("reverts a whole AI turn and navigates back", () => {
    const s = fresh();
    s.getState().dispatch({ type: "setMode", mode: "learn" });
    s.getState().syncRoute("/explore");
    s.getState().dispatchMany(
      [
        { type: "setFilters", filters: { materials: ["SIBAL"] } },
        { type: "openExperiment", id: "PSI-25:B1" },
      ],
      { source: "ai", groupId: "turn-1" },
    );
    expect(s.getState().undo()).toBe(2);
    const st = s.getState();
    expect(st.filters.materials).toEqual([]);
    expect(st.openExperimentId).toBeNull();
    expect(st.route).toBe("/explore");
    expect(st.navigationRequest?.route).toBe("/explore");
    expect(st.mode).toBe("learn");
  });

  it("undoTo reverts the step and everything after it; highlight is not undoable", () => {
    const s = fresh();
    s.getState().dispatch({ type: "setMode", mode: "learn" });
    const second = s.getState().dispatch({ type: "setLabParams", params: { o2Pct: 21 } });
    s.getState().dispatch({ type: "highlight", target: "o2" });
    s.getState().dispatch({ type: "setLabParams", params: { k: 3 } });
    if (!second.ok) throw new Error("dispatch failed");
    expect(s.getState().undoTo(second.entry.id)).toBe(2);
    expect(s.getState().labParams).toEqual(INITIAL_DATA.labParams);
    expect(s.getState().mode).toBe("learn");
  });
});

describe("mode switch (ADR-026)", () => {
  it("Guided opens the Learn Academy, Expert returns to Home, and undo restores the page", () => {
    const s = fresh();
    s.getState().syncRoute("/explore");
    s.getState().dispatch({ type: "setMode", mode: "learn" });
    expect(s.getState().route).toBe("/learn");
    expect(s.getState().navigationRequest?.route).toBe("/learn");
    s.getState().dispatch({ type: "setMode", mode: "expert" });
    expect(s.getState().route).toBe("/overview");
    s.getState().undo();
    expect(s.getState().route).toBe("/learn");
    s.getState().undo();
    expect(s.getState().route).toBe("/explore");
    expect(s.getState().mode).toBe("expert");
  });

  it("keeps the page when the mode does not change or a module is already open", () => {
    const s = fresh();
    s.getState().syncRoute("/lab");
    s.getState().dispatch({ type: "setMode", mode: "expert" });
    expect(s.getState().route).toBe("/lab");
    s.getState().syncRoute("/learn/m2-gravity");
    s.getState().dispatch({ type: "setMode", mode: "learn" });
    expect(s.getState().route).toBe("/learn/m2-gravity");
  });
});

describe("URL mapping", () => {
  it("round-trips and drops invalid input", () => {
    const s = fresh();
    s.getState().dispatchMany([
      { type: "setMode", mode: "learn" },
      { type: "setFilters", filters: { materials: ["PMMA"], o2InitialPct: { min: 15 }, hasVideo: true, text: "blue" } },
      { type: "compare", ids: ["PSI-25:B1", "PSI-25:B2"] },
    ]);
    const url = toUrlState(s.getState());
    expect(serializeUrl("/explore", url)).toBe("/explore?mode=learn&mat=PMMA&o2=15~&vid=true&q=blue&cmp=PSI-25:B1,PSI-25:B2");
    const back = fromUrlState(url);
    expect(back.filters).toEqual(s.getState().filters);
    expect(back.compareIds).toEqual(["PSI-25:B1", "PSI-25:B2"]);
    expect(fromUrlState({ cmp: ["PSI-25:B1"], sel: ["<script>"] })).toMatchObject({ compareIds: [], selection: [] });
  });
});
