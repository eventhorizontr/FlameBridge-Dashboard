import { getDataset, getManifest } from "@/lib/data";

export function loadPsi25Dataset() {
  return getDataset("PSI-25");
}

export function loadPsi25Manifest() {
  return getManifest("PSI-25");
}
