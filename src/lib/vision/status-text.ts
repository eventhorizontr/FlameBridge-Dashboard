/**
 * Plain-language text for a video the vision layer did not measure. The pipeline's `reason` is
 * technical ("no index/moov atom"); viewers need to know what happened and what still works.
 */
export function visionStatusText(status: string, reason?: string | null): { title: string; body: string } {
  switch (status) {
    case "unreadable":
      return {
        title: "NASA's file for this view is incomplete",
        body: "The MP4 in NASA's archive was cut off at upload (it has no index), so no browser can play it and it could not be measured. Other camera views of this run still play.",
      };
    case "skipped":
      return { title: "This camera view is not measured", body: reason || "Flame geometry is measured on the primary view." };
    case "not-instrument-footage":
      return { title: "Not experiment footage", body: reason || "This file does not show the burn, so it is not measured." };
    default:
      return { title: "This video is not measured", body: reason || "The footage could not be analysed." };
  }
}
