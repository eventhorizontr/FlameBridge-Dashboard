import type { ExperimentDataset, InvestigationManifest } from "@/types/experiment";

import { computeOverviewStats } from "./dataset-queries";
import { MissionOverviewClient } from "./mission-overview-client";

export function MissionOverview({
  dataset,
  manifest,
}: {
  dataset: ExperimentDataset;
  manifest: InvestigationManifest;
}) {
  const { accession, doi, license } = dataset;
  const { acronym, title } = manifest;
  const catalog = dataset.experiments.map(({ id, videos }) => ({
    id,
    videos: videos.map(({ id: videoId }) => ({ id: videoId })),
  }));

  return (
    <MissionOverviewClient
      dataset={{ accession, doi, license }}
      manifest={{ acronym, title }}
      stats={computeOverviewStats(dataset, manifest)}
      catalog={catalog}
    />
  );
}
