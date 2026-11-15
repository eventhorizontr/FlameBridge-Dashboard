# Media credits

| Asset | Path | Source | Rights |
|---|---|---|---|
| ISS flame videos (streamed, not stored) | `/api/psi/file/PSI-25/{id}` → NASA S3 | NASA PSI-25 BASS-II, [DOI 10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67) | CC0 1.0 |
| Fallback clips B3, O1, T1 | `public/media/psi25-*.mp4` | Transcodes of the PSI-25 videos listed in [data-manifest.csv](data-manifest.csv) | CC0 1.0 |
| Keyframes, posters, similarity thumbnails | `public/data/psi-25/vision/frames/` | Frames cut from PSI-25 videos by `pipeline/vision/` | CC0 1.0 (source) |
| B12 still sequence (landing hero) | `public/landing/b12-still-sequence.jpg` | Stills from the PSI-25 B12 run, assembled from the owner's design file | CC0 1.0 (source) |
| FlameBridge mark | `public/brand/flamebridge-mark-*.png`, `src/app/icon.png`, `apple-icon.png`, `favicon.ico` | Team design (owner) | Team |
| Team mark and wordmark, horizon glow | `public/landing/team-mark.png`, `team-wordmark.png`, `horizon-glow.png` | Team design file (owner) | Team |
| Fonts | Geist, Geist Mono, Unbounded | Google Fonts via `next/font` | SIL Open Font License 1.1 |
| Icons | `lucide-react` | Lucide | ISC |

NASA content is used as released to the public. FlameBridge is not affiliated with or endorsed
by NASA, and no NASA logo or insignia is used.

## Presentation and video

The presentation video is produced outside this repository. Any generated scenes, voice-over or
music in it are credited in the video's own description. The demo video is at https://youtu.be/5k1sTZwlpyk;
its poster frames (`public/landing/demo-poster.webp`, `docs/media/demo-video.jpg`) are taken from
that video. On the landing page it loads from youtube-nocookie.com only after the viewer presses play. Nothing in this repository is
AI-generated media.

## Third-party code

Dependencies keep their own licences (`package.json`, `pipeline/vision/requirements.txt`). The
MIT licence of this repository's own code ([LICENSE](../LICENSE)) does not change them, and it
does not cover the team brand assets listed above.
