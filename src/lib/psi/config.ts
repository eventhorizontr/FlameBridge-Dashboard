/**
 * Registered PSI investigations. Adding a dataset = add an entry here + a pipeline
 * builder that emits public/data/<accession>/{manifest,experiments}.json.
 */
export const PSI_API_BASE = "https://psi.nasa.gov/geode-py/ws";

export const INVESTIGATIONS = {
  "PSI-25": {
    acronym: "BASS-II",
    title: "Burning and Suppression of Solids – II",
    studyVersion: 4,
    doi: "10.60555/4qc4-de67",
    primary: true,
  },
  "PSI-20": {
    acronym: "ACME BRE",
    title: "Advanced Combustion via Microgravity Experiments – Burning Rate Emulator",
    studyVersion: 4,
    doi: "10.60555/vb93-3y72",
    primary: false,
  },
} as const;

export type RegisteredAccession = keyof typeof INVESTIGATIONS;

export function isRegisteredAccession(v: string): v is RegisteredAccession {
  return Object.prototype.hasOwnProperty.call(INVESTIGATIONS, v);
}
