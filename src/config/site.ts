/**
 * Site-wide constants rendered in the UI (credits, footer, About).
 * Owner: Claude. Single source of truth — do not hard-code these strings in components.
 */
export const SITE = {
  name: "FlameBridge",
  tagline: "Microgravity combustion, from NASA's ISS archive to your screen",
  challenge: "NASA Space Apps Challenge 2026 · Fire in Freefall",
  team: {
    name: "Event Horizon",
    members: [
      "Adil Sevim",
      "Hakan Celep",
      "Ceren Akgün",
      "Muhammed Ensar Aktaş",
    ],
  },
  repository: "https://github.com/eventhorizontr/Dashboardv1",
} as const;

export type SiteConfig = typeof SITE;
