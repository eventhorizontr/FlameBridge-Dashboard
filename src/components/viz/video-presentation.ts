const localPosters: Record<string, string> = {
  "/media/psi25-b3.mp4": "/media/psi25-b3.webp",
  "/media/psi25-o1.mp4": "/media/psi25-o1.webp",
  "/media/psi25-t1.mp4": "/media/psi25-t1.webp",
};

/** Each poster is the first decoded frame of the corresponding NASA fallback clip. */
export function localVideoPoster(fallbackHref: string | undefined): string | undefined {
  return fallbackHref && Object.hasOwn(localPosters, fallbackHref) ? localPosters[fallbackHref] : undefined;
}

export function formatSourceFps(fps: number | null | undefined): string {
  return fps == null ? "— source FPS unavailable" : `${fps.toFixed(2)} fps`;
}
