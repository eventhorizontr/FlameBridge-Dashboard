import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/** Keys live only in .env.local / Vercel env. A value in the tracked example is a leak. */
describe(".env.example", () => {
  it("never contains a secret value", () => {
    const lines = readFileSync(join(process.cwd(), ".env.example"), "utf8").split(/\r?\n/);
    const leaked = lines.filter((l) => /^[A-Z0-9_]*(KEY|TOKEN|SECRET)[A-Z0-9_]*=\S+/.test(l)).map((l) => l.split("=")[0]);
    expect(leaked).toEqual([]);
  });
});
