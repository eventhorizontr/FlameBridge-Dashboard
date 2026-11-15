"use client";

import Image from "next/image";
import { useState } from "react";

const VIDEO_ID = "5k1sTZwlpyk";
export const DEMO_VIDEO_URL = `https://youtu.be/${VIDEO_ID}`;

/**
 * The team's demo video. Shows a local poster first and loads YouTube (privacy-enhanced
 * youtube-nocookie.com) only when the viewer presses play, so the landing page stays fast and makes
 * no third-party request until then.
 */
export function LandingVideo() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="nf-video">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title="FlameBridge demo video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button type="button" className="nf-video-poster" onClick={() => setPlaying(true)} aria-label="Play the FlameBridge demo video">
          <Image
            src="/landing/demo-poster.webp"
            alt=""
            fill
            sizes="(min-width: 1240px) 1176px, calc(100vw - 32px)"
            style={{ objectFit: "cover" }}
          />
          <span className="nf-video-shade" aria-hidden="true" />
          <span className="nf-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
