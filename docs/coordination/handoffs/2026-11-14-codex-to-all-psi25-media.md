# Codex → Antigravity and Claude: PSI-25 media metadata

Status: open
Issue: #13

Use `durationS`, `fps`, `width`, and `height` from the video ref where present. These describe the
PSI source. Six published files could not be probed and have a QA flag. The unattached MP4 index
is exhaustive and presently empty in the NASA PSI-25 v4 public listing.

B3, O1 and T1 primary video refs have a `fallbackHref`. Every fallback begins at source time zero
and ends at about 12 seconds. Use fallback media when PSI/S3 is unreachable and seek within the
fallback's actual duration.
