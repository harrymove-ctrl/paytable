#!/usr/bin/env python3
from __future__ import annotations
"""
PayTable ElevenLabs + Studio Foley Audio Pipeline.

1. Uses ElevenLabs REST API (`eleven_multilingual_v2`) automatically whenever
   `ELEVENLABS_API_KEY` is present in the environment.
2. Falls back cleanly to macOS neural TTS (`say`) + ffmpeg studio EQ/compression
   when `ELEVENLABS_API_KEY` is unset so full synced 1080p MP4 cuts always build
   deterministically offline or in CI.
3. Synthesizes a warm D-Dorian modular ambient pad + Sodium mechanical UI foley
   and masters both cuts (`master-mix.wav` 80s and `launch-mix.wav` 40s) to -14 LUFS.
"""

import json
import math
import os
import struct
import subprocess
import tempfile
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "public" / "audio"
MANIFEST_PATH = ROOT / "src" / "scene-manifest.json"
FPS = 30
SAMPLE_RATE = 44100

MASTER_SCENES = [
    {
        "id": "s01_hook",
        "start_frame": 0,
        "duration_frames": 270,
        "voice_offset_sec": 0.35,
        "text": "PayPal just opened a huge door. New linked wallets for agents mean an AI agent can spend on your behalf, with approval on every purchase.",
        "caption": "PayPal linked wallets let AI agents spend on your behalf, with approval on every purchase.",
    },
    {
        "id": "s02_tabletop",
        "start_frame": 270,
        "duration_frames": 300,
        "voice_offset_sec": 0.30,
        "text": "Meet PayTable. One shared tabletop where you prompt at paytable to shop, split group bills, invoice overseas clients, and move real money.",
        "caption": "Meet PayTable: one shared tabletop to prompt @paytable and move real Sandbox funds.",
    },
    {
        "id": "s03_gate",
        "start_frame": 570,
        "duration_frames": 420,
        "voice_offset_sec": 0.35,
        "text": "Watch an agent source a studio monitor across three merchants, negotiate the price down to two hundred sixty five dollars, and pause right at the orange human gate.",
        "caption": "Channel3 catalog search + A2A quote negotiation ($310 to $265), paused at Needs Approval.",
    },
    {
        "id": "s04_settle",
        "start_frame": 990,
        "duration_frames": 390,
        "voice_offset_sec": 0.35,
        "text": "Nothing leaves your PayPal wallet until you click Approve. One tap signs a cryptographic mandate, captures the Sandbox order, and locks carrier tracking.",
        "caption": "One tap signs a SHA-256 mandate, captures PayPal Orders v2, and registers Shipment Tracking.",
    },
    {
        "id": "s05_tracks",
        "start_frame": 1380,
        "duration_frames": 420,
        "voice_offset_sec": 0.35,
        "text": "Switch presets in one click: scan a dinner receipt into PayPal QR shares, bill Berlin in euros with Pay Later, flag duplicate subscriptions, or pool neighborhood solar funds.",
        "caption": "All 5 PayPal tracks: QR Dinner Split, EUR Pay Later + Creator Split, Budget Shield, Solar Pool.",
    },
    {
        "id": "s06_ledger",
        "start_frame": 1800,
        "duration_frames": 360,
        "voice_offset_sec": 0.35,
        "text": "Every run reconciles live in AG Grid, while the Rust engine blocks overspend caps, catches card declines, and rejects duplicate replay keys.",
        "caption": "Live AG Grid v36 ledger, APIMatic + MCP contracts, and fail-closed Rust spend guardrails.",
    },
    {
        "id": "s07_outro",
        "start_frame": 2160,
        "duration_frames": 240,
        "voice_offset_sec": 0.40,
        "text": "PayTable. Linked PayPal wallets for AI agents, with human approval on every purchase.",
        "caption": "PayTable · Linked PayPal Wallets for AI Agents · Open Source MIT",
    },
]

LAUNCH_SCENES = [
    {
        "id": "l01_hook",
        "start_frame": 0,
        "duration_frames": 270,
        "voice_offset_sec": 0.30,
        "text": "PayPal just opened a huge door. New linked wallets mean an AI agent can spend on your behalf, with approval on every purchase.",
        "caption": "New linked PayPal wallets for AI agents, with approval on every purchase.",
    },
    {
        "id": "l02_gate",
        "start_frame": 270,
        "duration_frames": 330,
        "voice_offset_sec": 0.30,
        "text": "On PayTable, your agent negotiates a studio monitor down to two hundred sixty five dollars and pauses at the orange human approval gate.",
        "caption": "Agent negotiates $310 down to $265 and halts at Sodium's orange Needs Approval gate.",
    },
    {
        "id": "l03_settle",
        "start_frame": 600,
        "duration_frames": 360,
        "voice_offset_sec": 0.30,
        "text": "One click signs a cryptographic mandate, settles PayPal Orders, splits QR dinner bills, and reconciles live in AG Grid.",
        "caption": "1-click approval settles Orders v2, QR Dinner Splits, EUR Pay Later, and AG Grid.",
    },
    {
        "id": "l04_outro",
        "start_frame": 960,
        "duration_frames": 240,
        "voice_offset_sec": 0.35,
        "text": "PayTable. Collaborative agent commerce on PayPal Sandbox.",
        "caption": "PayTable · Built with Sodium, Rust, and PayPal Developer Sandbox",
    },
]


def synth_clip_elevenlabs(text: str, out_mp3: Path, api_key: str, voice_id: str) -> bool:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    payload = json.dumps(
        {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.50,
                "similarity_boost": 0.80,
                "style": 0.12,
                "use_speaker_boost": True,
            },
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            out_mp3.write_bytes(resp.read())
        return out_mp3.exists() and out_mp3.stat().st_size > 500
    except Exception as exc:
        print(f"[voice] ElevenLabs request warning ({exc}); falling back to local studio voice.")
        return False


def synth_clip_local(text: str, out_wav: Path, tmp_dir: Path) -> None:
    aiff_path = tmp_dir / (out_wav.stem + ".aiff")
    subprocess.run(
        ["say", "-v", "Samantha", "-r", "180", "-o", str(aiff_path), text],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(aiff_path),
            "-af",
            "highpass=f=85,lowpass=f=11500,acompressor=threshold=-18dB:ratio=2.4:attack=8:release=110",
            "-ar",
            str(SAMPLE_RATE),
            "-ac",
            "2",
            str(out_wav),
        ],
        check=True,
    )


def generate_bed_and_foley(out_wav: Path, duration_sec: float, click_times: list[float], chime_times: list[float]) -> None:
    total_samples = int(duration_sec * SAMPLE_RATE)
    freqs = [73.42, 110.00, 146.83, 164.81, 220.00]  # D2, A2, D3, E3, A3 warm modular pad

    click_samples = [int(t * SAMPLE_RATE) for t in click_times]
    chime_samples = [int(t * SAMPLE_RATE) for t in chime_times]

    with wave.open(str(out_wav), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)

        buf = bytearray()
        for i in range(total_samples):
            t = i / SAMPLE_RATE
            fade_in = min(1.0, t / 1.4)
            fade_out = min(1.0, (duration_sec - t) / 1.8)
            env = max(0.0, min(fade_in, fade_out))

            lfo = 0.72 + 0.28 * math.sin(2.0 * math.pi * 0.14 * t)
            pulse = 0.85 + 0.15 * math.sin(2.0 * math.pi * (92.0 / 60.0) * t)
            pad = 0.0
            for idx, f in enumerate(freqs):
                detune = 1.0 + (idx - 2) * 0.0009
                pad += (0.28 / (idx + 1.1)) * math.sin(2.0 * math.pi * f * detune * t)

            val = pad * lfo * pulse * env * 0.10

            for cs in click_samples:
                dt = (i - cs) / SAMPLE_RATE
                if 0.0 <= dt < 0.045:
                    val += 0.22 * math.exp(-dt * 95.0) * math.sin(2.0 * math.pi * 1650.0 * dt)

            for ch in chime_samples:
                dt = (i - ch) / SAMPLE_RATE
                if 0.0 <= dt < 0.36:
                    val += 0.15 * math.exp(-dt * 9.5) * (
                        math.sin(2.0 * math.pi * 528.0 * dt)
                        + 0.6 * math.sin(2.0 * math.pi * 792.0 * dt)
                    )

            clamped = max(-0.95, min(0.95, val))
            pcm = int(clamped * 32767)
            buf.extend(struct.pack("<hh", pcm, pcm))

        wf.writeframes(bytes(buf))


def build_cut_mix(
    scenes: list[dict],
    total_frames: int,
    out_wav: Path,
    clicks: list[float],
    chimes: list[float],
    api_key: str | None,
    voice_id: str,
) -> str:
    duration_sec = total_frames / FPS
    used_provider = "local_neural_say"

    with tempfile.TemporaryDirectory() as tmp_str:
        tmp_dir = Path(tmp_str)
        bed_wav = tmp_dir / "bed.wav"
        generate_bed_and_foley(bed_wav, duration_sec, clicks, chimes)

        inputs = ["-i", str(bed_wav)]
        filter_parts = ["[0:a]volume=0.88[bed]"]
        mix_labels = ["[bed]"]

        for idx, sc in enumerate(scenes, start=1):
            clip_wav = tmp_dir / f"{sc['id']}.wav"
            max_slot_sec = (sc["duration_frames"] / FPS) - sc["voice_offset_sec"] - 0.18

            if api_key:
                mp3_path = tmp_dir / f"{sc['id']}.mp3"
                if synth_clip_elevenlabs(sc["text"], mp3_path, api_key, voice_id):
                    used_provider = "elevenlabs_multilingual_v2"
                    subprocess.run(
                        [
                            "ffmpeg",
                            "-y",
                            "-loglevel",
                            "error",
                            "-i",
                            str(mp3_path),
                            "-ar",
                            str(SAMPLE_RATE),
                            "-ac",
                            "2",
                            str(clip_wav),
                        ],
                        check=True,
                    )
            if not clip_wav.exists():
                synth_clip_local(sc["text"], clip_wav, tmp_dir)

            # Measure clip duration and gently speed up if slightly longer than scene slot
            probe = subprocess.check_output(
                [
                    "ffprobe",
                    "-v",
                    "error",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "default=noprint_wrappers=1:nokey=1",
                    str(clip_wav),
                ],
                text=True,
            ).strip()
            clip_dur = float(probe or "1.0")
            fitted_wav = tmp_dir / f"{sc['id']}_fit.wav"
            if clip_dur > max_slot_sec and max_slot_sec > 1.0:
                tempo = min(1.32, max(1.01, clip_dur / max_slot_sec))
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-loglevel",
                        "error",
                        "-i",
                        str(clip_wav),
                        "-af",
                        f"atempo={tempo:.3f}",
                        str(fitted_wav),
                    ],
                    check=True,
                )
            else:
                fitted_wav = clip_wav

            start_ms = int(((sc["start_frame"] / FPS) + sc["voice_offset_sec"]) * 1000)
            inputs.extend(["-i", str(fitted_wav)])
            lbl = f"v{idx}"
            filter_parts.append(f"[{idx}:a]adelay={start_ms}|{start_ms},volume=1.35[{lbl}]")
            mix_labels.append(f"[{lbl}]")

        amix_count = len(mix_labels)
        filter_parts.append(
            f"{''.join(mix_labels)}amix=inputs={amix_count}:normalize=0,"
            f"loudnorm=I=-14:TP=-1.5:LRA=9,apad,atrim=0:{duration_sec:.3f}[out]"
        )

        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-loglevel",
                "error",
                *inputs,
                "-filter_complex",
                ";".join(filter_parts),
                "-map",
                "[out]",
                "-ar",
                str(SAMPLE_RATE),
                "-ac",
                "2",
                str(out_wav),
            ],
            check=True,
        )

    return used_provider


def main() -> None:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)

    api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip() or None
    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb").strip()

    master_provider = build_cut_mix(
        MASTER_SCENES,
        2400,
        AUDIO_DIR / "master-mix.wav",
        clicks=[0.4, 9.2, 19.3, 35.4, 46.5, 51.0, 55.5, 60.4],
        chimes=[24.8, 36.1, 72.3],
        api_key=api_key,
        voice_id=voice_id,
    )
    launch_provider = build_cut_mix(
        LAUNCH_SCENES,
        1200,
        AUDIO_DIR / "launch-mix.wav",
        clicks=[0.35, 9.2, 20.6, 26.0],
        chimes=[14.8, 21.2, 32.3],
        api_key=api_key,
        voice_id=voice_id,
    )

    manifest = {
        "fps": FPS,
        "width": 1920,
        "height": 1080,
        "voice_provider": master_provider,
        "launch_voice_provider": launch_provider,
        "master_total_frames": 2400,
        "launch_total_frames": 1200,
        "master_scenes": MASTER_SCENES,
        "launch_scenes": LAUNCH_SCENES,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"[voice] Built master-mix.wav (80.0s) and launch-mix.wav (40.0s) via {master_provider}")


if __name__ == "__main__":
    main()
