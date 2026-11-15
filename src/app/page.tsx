import { LandingPage } from "@/components/landing/landing-page";
import { AppShell } from "@/components/layout";
import { runDirectory } from "@/components/layout/run-directory-server";
import { loadPsi25Dataset } from "@/components/viz/dataset-bridge";
import { landingStats } from "@/lib/vision/landing";

export default function HomePage() {
  const stats = landingStats(loadPsi25Dataset());
  return (
    <AppShell bleed runs={runDirectory()}>
      <LandingPage stats={stats} />
    </AppShell>
  );
}
