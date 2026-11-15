import { LandingPage } from "@/components/landing/landing-page";
import { CommandPalette } from "@/components/layout/command-palette";
import { loadPsi25Dataset, loadPsi25Manifest } from "@/components/viz/dataset-bridge";
import { landingData } from "@/lib/vision/landing";

export default function HomePage() {
  return (
    <>
      <LandingPage data={landingData(loadPsi25Dataset(), loadPsi25Manifest())} />
      <CommandPalette />
    </>
  );
}
