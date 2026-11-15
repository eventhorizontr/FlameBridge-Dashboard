"""Per-investigation vision profiles.

Everything that is specific to one camera/recording setup lives here, so the same analysis code
runs on any PSI investigation that ships video. A new dataset only needs a new ``VisionProfile``.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path

ASSETS = Path(__file__).resolve().parent / "assets"


@dataclass(frozen=True)
class OsdField:
    """One numeric field burned into the video overlay (row 1 = value row under the labels)."""

    key: str
    label: str
    first_col: int
    last_col: int
    unit: str | None
    meaning: str
    scale: float = 1.0  # displayed value x scale = physical value


@dataclass(frozen=True)
class OsdLayout:
    label_template: str  # PNG in assets/: the static label row, cropped with a margin
    glyph_template: str  # PNG strip of glyphs, one per char of ``glyph_chars``
    glyph_chars: str
    template_offset: tuple[int, int]  # (dx, dy) from template top-left to the first glyph cell
    pitch_px: float  # horizontal distance between character cells
    row_px: int  # vertical distance between overlay rows
    cols: int
    fields: tuple[OsdField, ...]
    date_row: int  # overlay row holding "MM/DD/YY HH:MM:SS"
    displayed_date_offset_days: int  # documented clock error of the overlay (displayed - actual)
    min_register_score: float = 0.6
    min_glyph_score: float = 0.62


@dataclass(frozen=True)
class SegmentationParams:
    work_scale: float = 0.5  # analyse at half resolution (interlaced NTSC has 240 lines per field)
    blur_sigma: float = 0.7
    background_samples: int = 64
    background_percentile: float = 25.0
    low_sigma: float = 4.0  # weak threshold = max(low_floor, low_sigma * noise)
    low_floor: float = 6.0
    high_sigma: float = 14.0  # strong threshold = max(high_floor, high_sigma * noise)
    high_floor: float = 40.0
    dim_min_area_px: int = 40  # work-scale px; a component without strong pixels needs this area
    dim_min_mean_factor: float = 1.8  # ... and mean excess >= factor * weak threshold
    min_component_px: int = 4
    halo_px: float = 14.0  # work-scale px a weak pixel may sit from the luminous core (28 full-res px)
    core_fraction: float = 0.35  # core = excess above this fraction of the frame's P99.9 excess
    merge_px: float = 20.0  # work-scale gap below which regions belong to one flame (40 full-res px)
    min_mean_chroma: float = 7.0  # 8-bit counts of max-min channel; grey objects ~3, dim blue flame ~10
    saturated_value: float = 240.0  # work-scale (blurred) brightness that marks a saturated core
    lit_threshold: float = 22.0  # scene median (8-bit) above which the chamber counts as lit
    transient_factor: float = 3.0  # area > factor x rolling median (+-3 s) => transient
    transient_min_area_px: int = 15000  # ... and at least this large (~4 % of the frame): a glow, not flicker
    present_min_area_px: int = 60  # full-res px for a frame to count as "flame visible"
    present_min_run_s: float = 0.5
    contour_epsilon_px: float = 1.25
    contour_max_polygons: int = 3


@dataclass(frozen=True)
class VisionProfile:
    accession: str
    camera: str
    sample_hz: float  # analysis rate (OSD refreshes at 5 Hz on BASS-II)
    store_hz: float  # rate of the published per-frame series
    embed_hz: float  # rate of the deep-embedding pass
    osd: OsdLayout | None
    segmentation: SegmentationParams = field(default_factory=SegmentationParams)
    citation: str = ""

    def to_json(self) -> dict:
        data = asdict(self)
        return data


BASS_FIELDS = (
    OsdField("fuel", "FUEL", 0, 3, None, "Undocumented overlay field; published raw.", 1.0),
    OsdField("air", "AIR", 5, 8, "cm/s",
             "Flow speed measured in the duct (slow sensor, ~1 min response).", 1.0),
    OsdField("fanV", "FAN", 10, 13, "V", "Instantaneous fan voltage (display is volts x 10).", 0.1),
    OsdField("rad", "RAD", 15, 19, None,
             "Uncalibrated radiometer signal; relative flame intensity (gain varies by test).", 1.0),
)

PSI25 = VisionProfile(
    accession="PSI-25",
    camera="BASS-II MSG colour video (NTSC 720x480, 29.97 fps)",
    sample_hz=10.0,
    store_hz=5.0,
    embed_hz=2.0,
    osd=OsdLayout(
        label_template="osd-label-row.png",
        glyph_template="osd-glyphs.png",
        glyph_chars="0123456789-./:",
        template_offset=(4, 2),
        pitch_px=28.33,
        row_px=18,
        cols=20,
        fields=BASS_FIELDS,
        date_row=2,
        displayed_date_offset_days=1,
    ),
    citation=(
        "Overlay fields per PSI-25 BASS-II ReadMe (NASA PSI, DOI 10.60555/4qc4-de67). Image-based flame "
        "measurement precedent: Bhattacharjee et al., Fire Safety Journal (2017), DOI 10.1016/j.firesaf.2017.03.039."
    ),
)

PROFILES: dict[str, VisionProfile] = {"PSI-25": PSI25}


def profile_for(accession: str) -> VisionProfile:
    """Profile for an accession; unknown investigations get a generic overlay-free profile."""
    if accession in PROFILES:
        return PROFILES[accession]
    return VisionProfile(accession=accession, camera="unknown", sample_hz=10.0, store_hz=5.0,
                         embed_hz=2.0, osd=None)
