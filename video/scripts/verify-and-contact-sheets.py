#!/usr/bin/env python3
from __future__ import annotations
"""
Verifies rendered 60 FPS PayTable MP4 launch films (ffprobe + loudnorm) and builds
Contact Sheet 1 (16 frames, 0s..46s) and Contact Sheet 2 (16 frames, 46s..92s)
matching the Kurzgesagt / AI Animation Director QA protocol.
"""

import json
import re
import subprocess
from pathlib import Path

VIDEO_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = VIDEO_ROOT.parent
OUT_DIR = VIDEO_ROOT / "out"
DOCS_VIDEO = PROJECT_ROOT / "docs" / "video"
FRAMES_DIR = DOCS_VIDEO / "frames"


def probe_mp4(mp4: Path) -> dict:
    raw = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration,size:stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate,sample_rate",
            "-of",
            "json",
            str(mp4),
        ],
        text=True,
    )
    data = json.loads(raw)
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(mp4), "-af", "loudnorm=print_format=json", "-f", "null", "-"],
        capture_output=True,
        text=True,
        check=True,
    )
    m = re.search(r"\{\s*\"input_i\"[\s\S]*?\}", proc.stderr)
    loud = json.loads(m.group(0)) if m else {}
    return {"ffprobe": data, "loudnorm": loud}


def build_contact_sheet(mp4: Path, out_png: Path, timestamps: list[float]) -> None:
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    extracted: list[Path] = []
    for idx, ts in enumerate(timestamps):
        fp = FRAMES_DIR / f"{out_png.stem}_{idx:02d}.png"
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-loglevel",
                "error",
                "-ss",
                f"{ts:.2f}",
                "-i",
                str(mp4),
                "-frames:v",
                "1",
                "-vf",
                "scale=480:270",
                str(fp),
            ],
            check=True,
        )
        extracted.append(fp)

    inputs: list[str] = []
    for fp in extracted:
        inputs.extend(["-i", str(fp)])

    # 4x4 xstack layout (1920x1080 contact sheet)
    layout_parts: list[str] = []
    for k in range(16):
        col = k % 4
        row = k // 4
        layout_parts.append(f"{col * 480}_{row * 270}")
    in_labels = "".join(f"[{k}:v]" for k in range(16))
    flt = f"{in_labels}xstack=inputs=16:layout={'|'.join(layout_parts)}[v]"

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            *inputs,
            "-filter_complex",
            flt,
            "-map",
            "[v]",
            str(out_png),
        ],
        check=True,
    )


def main() -> None:
    DOCS_VIDEO.mkdir(parents=True, exist_ok=True)
    master = OUT_DIR / "paytable-hackathon-master.mp4"
    launch = OUT_DIR / "paytable-x-launch.mp4"

    m_info = probe_mp4(master)
    l_info = probe_mp4(launch)

    # Contact Sheet 1: 16 evenly spaced & beat-keyed frames across 0.8s..45.2s
    ts_sheet_1 = [
        0.8, 3.6, 6.8, 9.6,
        12.5, 15.8, 18.0, 20.5,
        24.0, 28.0, 32.0, 36.2,
        39.5, 42.0, 43.8, 45.5,
    ]
    # Contact Sheet 2: 16 evenly spaced & beat-keyed frames across 47.0s..90.5s
    ts_sheet_2 = [
        47.0, 49.5, 52.5, 55.8,
        58.0, 60.5, 63.5, 67.2,
        70.2, 72.0, 74.8, 78.2,
        81.5, 84.0, 86.8, 90.2,
    ]

    cs1 = DOCS_VIDEO / "contact-sheet-1.png"
    cs2 = DOCS_VIDEO / "contact-sheet-2.png"
    build_contact_sheet(master, cs1, ts_sheet_1)
    build_contact_sheet(master, cs2, ts_sheet_2)

    summary = {
        "master": {
            "duration": m_info["ffprobe"]["format"]["duration"],
            "size_bytes": int(m_info["ffprobe"]["format"]["size"]),
            "streams": m_info["ffprobe"]["streams"],
            "input_i_lufs": m_info["loudnorm"].get("input_i"),
            "input_tp_dbtp": m_info["loudnorm"].get("input_tp"),
        },
        "launch": {
            "duration": l_info["ffprobe"]["format"]["duration"],
            "size_bytes": int(l_info["ffprobe"]["format"]["size"]),
            "streams": l_info["ffprobe"]["streams"],
            "input_i_lufs": l_info["loudnorm"].get("input_i"),
            "input_tp_dbtp": l_info["loudnorm"].get("input_tp"),
        },
        "contact_sheets": [str(cs1.relative_to(PROJECT_ROOT)), str(cs2.relative_to(PROJECT_ROOT))],
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
