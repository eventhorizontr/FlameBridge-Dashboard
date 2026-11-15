import type { Metadata } from "next";

import { LandingPage, PRODUCT_NAME, type LandingFacts } from "@/components/landing/landing-page";
import { loadPsi25Dataset } from "@/components/viz/dataset-bridge";
import { representativeAirflow } from "@/components/viz/dataset-queries";
import { pressureScale } from "@/lib/science/pressure";
import { getVisionIndex } from "@/lib/vision/server";

export const metadata: Metadata = {
  title: { absolute: `${PRODUCT_NAME} · Fire burns differently in space` },
  description:
    "NASA's real ISS fire experiments (PSI-25 BASS-II) as a readable, testable and honest research dashboard for spacecraft fire safety.",
};

/** The run whose still sequence is shown on the landing page (public/landing/b12-still-sequence.jpg). */
const SEQUENCE_RUN_ID = "PSI-25:B12";

export default function Home() {
  const dataset = loadPsi25Dataset();
  const index = getVisionIndex("PSI-25");
  const seq = dataset.experiments.find((e) => e.id === SEQUENCE_RUN_ID) ?? null;

  const facts: LandingFacts = {
    runCount: dataset.experiments.length,
    measuredVideoCount: index ? index.videos.filter((v) => v.status === "ok").length : null,
    runsWithPressure: pressureScale(dataset.experiments).runsWithPressure,
    sequenceRun: seq
      ? { testId: seq.testId, thicknessMm: seq.fuel.thicknessMm ?? null, airflowCmS: representativeAirflow(seq) }
      : null,
  };

  return <LandingPage facts={facts} />;
}
