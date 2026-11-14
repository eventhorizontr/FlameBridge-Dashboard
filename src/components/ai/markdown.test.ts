import { describe, expect, it } from "vitest";

import { splitTables } from "./assistant-message-card";

describe("splitTables", () => {
  it("separates a table glued to a sentence", () => {
    const block = "Opened [B3] and [O13a].\n| Condition | B3 | O13a |\n|---|---|---|\n| O₂ | 22.2 | 15.9 |";
    expect(splitTables(block).map((s) => [s.kind, s.lines.length])).toEqual([
      ["text", 1],
      ["table", 3],
    ]);
  });

  it("treats a lone pipe line as text", () => {
    expect(splitTables("| just one |")[0]?.kind).toBe("text");
  });
});
