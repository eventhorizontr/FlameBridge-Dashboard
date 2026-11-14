import { AppShell } from "@/components/layout";
import { loadPsi25Dataset, loadPsi25Manifest } from "@/components/viz/dataset-bridge";
import { MissionOverview } from "@/components/viz/mission-overview";

export default function HomePage() {
  const dataset = loadPsi25Dataset();
  const manifest = loadPsi25Manifest();

  return (
    <AppShell>
      <MissionOverview dataset={dataset} manifest={manifest} />
    </AppShell>
  );
}
