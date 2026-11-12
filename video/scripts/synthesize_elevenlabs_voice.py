#!/usr/bin/env python3
from __future__ import annotations
"""
PayTable v2 Dual-Voice Conversational Product Launch Audio, Word-Boundary Lip-Sync,
and 6-Act Cinematic Score + Foley Pipeline (60 FPS, -14 LUFS).

1. Uses ElevenLabs REST API (`with-timestamps`, `eleven_multilingual_v2`) for two
   distinct studio hosts (`Alex` -> Brian, `Maya` -> Jessica) whenever
   `ELEVENLABS_API_KEY` is present in the environment.
2. Automatically uses Studio Neural TTS (`edge-tts` via `uvx` if needed:
   `en-US-AndrewMultilingualNeural` + `en-US-AvaMultilingualNeural`) with exact
   millisecond `WordBoundary` timestamps when `ELEVENLABS_API_KEY` is unset.
3. Falls back cleanly to macOS neural `say` (`Reed` + `Samantha`) if completely offline.
4. Composes a 92 BPM D-Dorian 6-act launch score (chord progression, warm sub-bass,
   Rhodes pad, syncopated marimba plucks, sidechain speech ducking) plus timed Foley
   SFX (whooshes, character pops, laser gate pulse, mechanical switch, harmonic chime)
   mastered to -14.0 LUFS (`master-mix.wav` 92.0s and `launch-mix.wav` 58.0s).
"""

import asyncio
import base64
import json
import math
import os
import random
import shutil
import struct
import subprocess
import sys
import tempfile
import urllib.request
import wave
from pathlib import Path

# Auto-bootstrap edge_tts via uvx when ELEVENLABS_API_KEY is unset and edge_tts is not in base python3
if not os.environ.get("ELEVENLABS_API_KEY", "").strip() and not os.environ.get("_PAYTABLE_UVX_BOOTSTRAPPED"):
    try:
        import edge_tts  # type: ignore # noqa: F401
    except ImportError:
        uvx_bin = shutil.which("uvx") or str(Path.home() / ".local" / "bin" / "uvx")
        if Path(uvx_bin).exists():
            env = dict(os.environ)
            env["_PAYTABLE_UVX_BOOTSTRAPPED"] = "1"
            os.execve(
                uvx_bin,
                [uvx_bin, "--from", "edge-tts", "python3", str(Path(__file__).resolve()), *sys.argv[1:]],
                env,
            )

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "public" / "audio"
MANIFEST_PATH = ROOT / "src" / "scene-manifest.json"
FPS = 60
SAMPLE_RATE = 44100

VOICES = {
    "alex": {
        "label": "Alex",
        "role": "Product Lead",
        "elevenlabs_id": os.environ.get("ELEVENLABS_VOICE_ID_ALEX", "nPczCjzI2devNBz1zQrb").strip(),
        "edge_voice": "en-US-AndrewMultilingualNeural",
        "edge_rate": "+4%",
        "say_voice": "Reed",
    },
    "maya": {
        "label": "Maya",
        "role": "Systems Architect",
        "elevenlabs_id": os.environ.get("ELEVENLABS_VOICE_ID_MAYA", "cgSgspJ2msm6clMCkdW9").strip(),
        "edge_voice": "en-US-AvaMultilingualNeural",
        "edge_rate": "+5%",
        "say_voice": "Samantha",
    },
}

# 92.0s (5520 frames @ 60fps) Kurzgesagt-Inspired 6-Act Promotional Product Launch Film
MASTER_SCENES = [
    # Act 1 (0s..18s -> frames 0..1080): Cosmic Opening (#09134B / #243CDB / #22D7DA / #FFD244)
    {
        "id": "m01_cosmic_problem",
        "act": 1,
        "speaker": "alex",
        "start_frame": 0,
        "duration_frames": 540,
        "voice_offset_sec": 0.45,
        "text": "AI agents can plan trips, compare prices, and negotiate deals in seconds. Until today, the moment it was time to actually pay, everything stopped.",
        "caption": "AI agents negotiate deals in seconds, until checkout stops them cold.",
    },
    {
        "id": "m02_cosmic_launch",
        "act": 1,
        "speaker": "maya",
        "start_frame": 540,
        "duration_frames": 540,
        "voice_offset_sec": 0.28,
        "text": "Because nobody wants a bot touching their raw credit card. That changes with PayPal Linked Wallets for agents, and today we are launching PayTable.",
        "caption": "Launching PayTable: collaborative PayPal Linked Wallets for AI agents.",
    },
    # Act 2 (18s..42s -> frames 1080..2520): Guided 4-Step Product Launch (#141412 / #FFD244)
    {
        "id": "m03_step_one",
        "act": 2,
        "speaker": "alex",
        "start_frame": 1080,
        "duration_frames": 480,
        "voice_offset_sec": 0.32,
        "text": "Here is how you use PayTable in four clear steps. First, pick an everyday preset or type an at paytable prompt on the shared tabletop.",
        "caption": "Step 1: Pick any everyday preset or prompt @paytable on the shared tabletop.",
    },
    {
        "id": "m04_step_two",
        "act": 2,
        "speaker": "maya",
        "start_frame": 1560,
        "duration_frames": 510,
        "voice_offset_sec": 0.25,
        "text": "Second, watch Pip search live catalogs, compare three merchant quotes, and negotiate a studio monitor down from three hundred ten dollars to two sixty five.",
        "caption": "Step 2: Agent compares 3 quotes ($310 down to $265) and pauses at the human gate.",
    },
    {
        "id": "m05_step_three_four",
        "act": 2,
        "speaker": "alex",
        "start_frame": 2070,
        "duration_frames": 450,
        "voice_offset_sec": 0.25,
        "text": "Third, tune your wallet spend cap live, tap the yellow Approve button once, and fourth, inspect your signed mandate receipt.",
        "caption": "Step 3 & 4: Tune wallet caps live, tap Approve once, and inspect your receipt.",
    },
    # Act 3 (42s..58s -> frames 2520..3480): High-Energy Rust Vault Lab (#0B1D51 / #22D7DA / #FF851D)
    {
        "id": "m06_rust_laser_cap",
        "act": 3,
        "speaker": "maya",
        "start_frame": 2520,
        "duration_frames": 480,
        "voice_offset_sec": 0.32,
        "text": "Inside our Rust settlement lab, Vaulty guards every dollar. Any quote over your five hundred dollar single cap hits a laser gate and fails closed.",
        "caption": "Rust Vault Guardrail: quotes above your $500 single cap fail closed immediately.",
    },
    {
        "id": "m07_mandate_crystal",
        "act": 3,
        "speaker": "alex",
        "start_frame": 3000,
        "duration_frames": 480,
        "voice_offset_sec": 0.25,
        "text": "When you flip the orange human switch, Rust mints a SHA two fifty six mandate stamp, captures PayPal Orders v2, and blocks duplicate replays.",
        "caption": "Human switch mints a SHA-256 mandate, captures PayPal Orders v2, and blocks replays.",
    },
    # Act 4 (58s..72s -> frames 3480..4320): 5 Everyday Features & Calculators (#180A59 / #33B9D7 / #ED4BA4)
    {
        "id": "m08_dinner_and_fx",
        "act": 4,
        "speaker": "maya",
        "start_frame": 3480,
        "duration_frames": 450,
        "voice_offset_sec": 0.30,
        "text": "Every preset ships live calculators right on screen: split dinner receipts with tip by PayPal QR, or bill Berlin in euros with four-part Pay Later.",
        "caption": "Live calculators: QR Dinner Receipt Split + EUR Pay Later & Creator Payouts.",
    },
    {
        "id": "m09_shield_solar_aggrid",
        "act": 4,
        "speaker": "alex",
        "start_frame": 3930,
        "duration_frames": 390,
        "voice_offset_sec": 0.24,
        "text": "Hold duplicate subscriptions behind a dispute shield, pool neighborhood solar shares, and audit every cent in AG Grid.",
        "caption": "Dispute Shield, Neighborhood Solar Pool, and live AG Grid v36 reconciliation.",
    },
    # Act 5 (72s..84s -> frames 4320..5040): Warm Orange asciicn Agent Studio (#2A1215 / #FF851D / #FFD244)
    {
        "id": "m10_asciicn_studio",
        "act": 5,
        "speaker": "maya",
        "start_frame": 4320,
        "duration_frames": 390,
        "voice_offset_sec": 0.30,
        "text": "Open tab four for our built-in asciicn studio: sixty four shadcn ASCII effects, rotating 3D globes, shaders, and live Web Audio soundtracks.",
        "caption": "Tab [04] asciicn Studio: 3D globes, shaders, text effects, and Web Audio score.",
    },
    {
        "id": "m11_asciicn_export",
        "act": 5,
        "speaker": "alex",
        "start_frame": 4710,
        "duration_frames": 330,
        "voice_offset_sec": 0.22,
        "text": "Export frames to text, SVG, PNG, or WebM video, where one prompt teaches your coding agent.",
        "caption": "Export frames to .txt, .svg, .png, or .webm video. One prompt teaches your agent.",
    },
    # Act 6 (84s..92s -> frames 5040..5520): Final Hero Lockup & CTA (#09134B / #141412 / #FFD244)
    {
        "id": "m12_cta_maya",
        "act": 6,
        "speaker": "maya",
        "start_frame": 5040,
        "duration_frames": 180,
        "voice_offset_sec": 0.28,
        "text": "PayTable is live and open source today.",
        "caption": "PayTable v2.0 · Open Source MIT · PayPal Developer Sandbox",
    },
    {
        "id": "m13_cta_alex",
        "act": 6,
        "speaker": "alex",
        "start_frame": 5220,
        "duration_frames": 300,
        "voice_offset_sec": 0.18,
        "text": "Link an agent wallet, keep human approval on every purchase, and build with us on GitHub.",
        "caption": "github.com/harrymove-ctrl/paytable · Human approval on every purchase.",
    },
]

# 58.0s (3480 frames @ 60fps) Conversational Social / Explainer Launch Cut
LAUNCH_SCENES = [
    {
        "id": "l01_hook",
        "act": 1,
        "speaker": "alex",
        "start_frame": 0,
        "duration_frames": 468,
        "voice_offset_sec": 0.35,
        "text": "AI agents negotiate deals in seconds, until checkout stops them cold. Today we are launching PayTable for PayPal Linked Agent Wallets.",
        "caption": "Launching PayTable: PayPal Linked Agent Wallets with per-purchase approval.",
    },
    {
        "id": "l02_steps",
        "act": 2,
        "speaker": "maya",
        "start_frame": 468,
        "duration_frames": 552,
        "voice_offset_sec": 0.25,
        "text": "Use it in four simple steps: pick a preset, watch Pip negotiate three quotes down to two sixty five, tune your wallet cap, and tap Approve.",
        "caption": "4 clear steps: pick preset, compare quotes ($310 to $265), tune cap, tap Approve.",
    },
    {
        "id": "l03_lab",
        "act": 3,
        "speaker": "alex",
        "start_frame": 1020,
        "duration_frames": 510,
        "voice_offset_sec": 0.25,
        "text": "Inside our Rust lab, Vaulty blocks any overspend with a laser cap, while your switch mints a SHA two fifty six mandate for PayPal Orders v2.",
        "caption": "Rust Vault: $500 laser cap + SHA-256 mandate stamp + PayPal Orders v2.",
    },
    {
        "id": "l04_calculators",
        "act": 4,
        "speaker": "maya",
        "start_frame": 1530,
        "duration_frames": 570,
        "voice_offset_sec": 0.25,
        "text": "Tweak live calculators to split dinner receipts by PayPal QR, convert euros with Pay Later, shield duplicate subscriptions, and audit in AG Grid.",
        "caption": "Interactive QR Dinner Split, EUR Pay Later, Dispute Shield, Solar Pool & AG Grid.",
    },
    {
        "id": "l05_asciicn",
        "act": 5,
        "speaker": "alex",
        "start_frame": 2100,
        "duration_frames": 540,
        "voice_offset_sec": 0.25,
        "text": "Tab four launches our asciicn 3D shader and Web Audio studio: export text, SVG, PNG, or video, where one prompt teaches your agent.",
        "caption": "Built-in asciicn 3D shader & Web Audio studio (.txt, .svg, .png, .webm export).",
    },
    {
        "id": "l06_trust",
        "act": 6,
        "speaker": "maya",
        "start_frame": 2640,
        "duration_frames": 360,
        "voice_offset_sec": 0.25,
        "text": "Every agent action stays visible, audible, and gated by human approval.",
        "caption": "Visible, audible, and gated by human approval on every purchase.",
    },
    {
        "id": "l07_cta",
        "act": 6,
        "speaker": "alex",
        "start_frame": 3000,
        "duration_frames": 480,
        "voice_offset_sec": 0.22,
        "text": "PayTable. Linked PayPal wallets for AI agents, live and open source on GitHub today.",
        "caption": "PayTable · github.com/harrymove-ctrl/paytable · Open Source MIT",
    },
]


def _words_from_elevenlabs_alignment(alignment: dict, text: str) -> list[dict]:
    chars = alignment.get("characters") or []
    starts = alignment.get("character_start_times_seconds") or []
    ends = alignment.get("character_end_times_seconds") or []
    if not chars or len(chars) != len(starts) or len(chars) != len(ends):
        return []
    words: list[dict] = []
    cur_chars: list[str] = []
    w_start = 0.0
    w_end = 0.0
    for ch, s, e in zip(chars, starts, ends):
        if ch.isspace():
            if cur_chars:
                words.append({"word": "".join(cur_chars), "start": round(float(w_start), 3), "end": round(float(w_end), 3)})
                cur_chars = []
        else:
            if not cur_chars:
                w_start = float(s)
            cur_chars.append(ch)
            w_end = float(e)
    if cur_chars:
        words.append({"word": "".join(cur_chars), "start": round(float(w_start), 3), "end": round(float(w_end), 3)})
    return words


def synth_clip_elevenlabs(text: str, out_mp3: Path, api_key: str, voice_id: str) -> tuple[bool, list[dict]]:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps"
    payload = json.dumps(
        {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.46,
                "similarity_boost": 0.82,
                "style": 0.18,
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
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        audio_b64 = body.get("audio_base64", "")
        if not audio_b64:
            return False, []
        out_mp3.write_bytes(base64.b64decode(audio_b64))
        words = _words_from_elevenlabs_alignment(body.get("alignment") or {}, text)
        return out_mp3.exists() and out_mp3.stat().st_size > 500, words
    except Exception as exc:
        print(f"[voice] ElevenLabs notice ({exc}); using studio neural voice.")
        return False, []


async def _edge_tts_synth_async(text: str, voice_name: str, rate: str, out_mp3: Path) -> list[dict]:
    import edge_tts  # type: ignore

    communicate = edge_tts.Communicate(text, voice_name, rate=rate, boundary="WordBoundary")
    words: list[dict] = []
    audio_chunks = bytearray()
    async for chunk in communicate.stream():
        ctype = chunk.get("type")
        if ctype == "audio":
            audio_chunks.extend(chunk["data"])
        elif ctype == "WordBoundary":
            start_s = float(chunk["offset"]) / 10_000_000.0
            dur_s = float(chunk["duration"]) / 10_000_000.0
            words.append(
                {
                    "word": str(chunk["text"]),
                    "start": round(start_s, 3),
                    "end": round(start_s + max(0.04, dur_s), 3),
                }
            )
    out_mp3.write_bytes(bytes(audio_chunks))
    return words


def synth_clip_edge_neural(text: str, out_wav: Path, tmp_dir: Path, speaker_cfg: dict) -> tuple[bool, list[dict]]:
    try:
        import edge_tts  # type: ignore # noqa: F401
    except ImportError:
        return False, []

    mp3_path = tmp_dir / f"{out_wav.stem}_edge.mp3"
    try:
        words = asyncio.run(
            _edge_tts_synth_async(
                text=text,
                voice_name=speaker_cfg["edge_voice"],
                rate=speaker_cfg["edge_rate"],
                out_mp3=mp3_path,
            )
        )
        if not mp3_path.exists() or mp3_path.stat().st_size < 400:
            return False, []
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-loglevel",
                "error",
                "-i",
                str(mp3_path),
                "-af",
                "highpass=f=80,equalizer=f=3200:width_type=q:w=1.2:g=1.4,acompressor=threshold=-19dB:ratio=2.1:attack=10:release=120",
                "-ar",
                str(SAMPLE_RATE),
                "-ac",
                "2",
                str(out_wav),
            ],
            check=True,
        )
        return True, words
    except Exception as exc:
        print(f"[voice] edge-tts notice ({exc}); falling back to macOS say.")
        return False, []


def _proportional_words(text: str, dur: float) -> list[dict]:
    tokens = [t for t in text.split() if t]
    if not tokens:
        return []
    weights = [max(1, len(t)) for t in tokens]
    total_w = sum(weights)
    cursor = 0.0
    out: list[dict] = []
    usable = max(0.3, dur - 0.08)
    for tok, w in zip(tokens, weights):
        span = usable * (w / total_w)
        out.append({"word": tok, "start": round(cursor, 3), "end": round(cursor + span * 0.92, 3)})
        cursor += span
    return out


def synth_clip_macos_say(text: str, out_wav: Path, tmp_dir: Path, speaker_cfg: dict) -> list[dict]:
    aiff_path = tmp_dir / f"{out_wav.stem}.aiff"
    subprocess.run(
        ["say", "-v", speaker_cfg["say_voice"], "-r", "182", "-o", str(aiff_path), text],
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
            "highpass=f=85,lowpass=f=11500,acompressor=threshold=-18dB:ratio=2.3:attack=8:release=110",
            "-ar",
            str(SAMPLE_RATE),
            "-ac",
            "2",
            str(out_wav),
        ],
        check=True,
    )
    dur = probe_duration(out_wav)
    return _proportional_words(text, dur)


def probe_duration(path: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        text=True,
    ).strip()
    return float(out or "1.0")


def generate_launch_score_and_foley(
    out_wav: Path,
    duration_sec: float,
    speech_windows: list[tuple[float, float]],
    whoosh_times: list[float],
    pop_times: list[float],
    laser_times: list[float],
    chime_times: list[float],
) -> None:
    """
    Synthesizes a 92 BPM D-Dorian 6-Act Cinematic Launch Score + Stereo Foley Bed:
    1. Chord progression (Dm9 -> Bbmaj7 -> Fmaj7 -> C6) cycling every 4 bars
    2. Warm sub-bass + stereo detuned Rhodes pad + syncopated marimba bell plucks
    3. Smooth dialogue ducking envelope so Alex & Maya always sit cleanly out front
    4. Layered Foley: stereo transition whooshes, character pops, laser cap pulse, and D-add9 chimes
    """
    total_samples = int(duration_sec * SAMPLE_RATE)
    bpm = 92.0
    beat_sec = 60.0 / bpm
    eighth_sec = beat_sec / 2.0
    bar_sec = beat_sec * 4.0

    chords = [
        {"bass": 73.42, "pad": [146.83, 174.61, 220.00, 329.63], "arp": [293.66, 349.23, 440.00, 659.25]},  # Dm9
        {"bass": 58.27, "pad": [116.54, 174.61, 220.00, 293.66], "arp": [233.08, 349.23, 440.00, 587.33]},  # Bbmaj7
        {"bass": 87.31, "pad": [174.61, 220.00, 261.63, 329.63], "arp": [349.23, 440.00, 523.25, 659.25]},  # Fmaj7
        {"bass": 65.41, "pad": [130.81, 196.00, 220.00, 329.63], "arp": [261.63, 392.00, 440.00, 659.25]},  # C6
    ]

    rng = random.Random(4204)
    noise_table = [rng.uniform(-1.0, 1.0) for _ in range(8192)]

    whoosh_idx = [int(t * SAMPLE_RATE) for t in whoosh_times]
    pop_idx = [int(t * SAMPLE_RATE) for t in pop_times]
    laser_idx = [int(t * SAMPLE_RATE) for t in laser_times]
    chime_idx = [int(t * SAMPLE_RATE) for t in chime_times]

    # Precompute smooth ducking gain at 100 Hz control rate
    ctrl_rate = 100
    ctrl_len = int(duration_sec * ctrl_rate) + 2
    duck_ctrl = [1.0] * ctrl_len
    for s_start, s_end in speech_windows:
        i0 = max(0, int((s_start - 0.14) * ctrl_rate))
        i1 = min(ctrl_len - 1, int((s_end + 0.20) * ctrl_rate))
        for k in range(i0, i1 + 1):
            duck_ctrl[k] = 0.38
    # Smooth ducking curve with 2-pass moving average
    for _ in range(2):
        smoothed = list(duck_ctrl)
        for k in range(2, ctrl_len - 2):
            smoothed[k] = (duck_ctrl[k - 2] + duck_ctrl[k - 1] + duck_ctrl[k] + duck_ctrl[k + 1] + duck_ctrl[k + 2]) / 5.0
        duck_ctrl = smoothed

    with wave.open(str(out_wav), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)

        buf = bytearray()
        two_pi = 2.0 * math.pi

        for i in range(total_samples):
            t = i / SAMPLE_RATE
            fade_in = min(1.0, t / 1.1)
            fade_out = min(1.0, (duration_sec - t) / 1.8)
            master_env = max(0.0, min(fade_in, fade_out))

            c_idx = min(ctrl_len - 1, int(t * ctrl_rate))
            duck = duck_ctrl[c_idx]

            bar_num = int(t / bar_sec)
            chord = chords[bar_num % 4]

            # Warm sub-bass with subtle beat pulse
            beat_phase = (t % beat_sec) / beat_sec
            bass_env = 0.72 + 0.28 * math.exp(-beat_phase * 4.5)
            bass = 0.14 * bass_env * math.sin(two_pi * chord["bass"] * t)

            # Stereo warm Rhodes pad
            pad_l = 0.0
            pad_r = 0.0
            lfo = 0.82 + 0.18 * math.sin(two_pi * 0.22 * t)
            for p_i, pf in enumerate(chord["pad"]):
                s1 = math.sin(two_pi * pf * 0.999 * t)
                s2 = math.sin(two_pi * pf * 1.001 * t + 0.5)
                amp = 0.045 / (1.0 + 0.18 * p_i)
                pad_l += amp * s1 * lfo
                pad_r += amp * s2 * lfo

            # Kurzgesagt-style gentle syncopated marimba/kalimba pluck on 8th notes
            eighth_num = int(t / eighth_sec)
            eighth_dt = t - eighth_num * eighth_sec
            arp_pattern = (0, 2, 1, 3, 2, 3, 1, 0)
            arp_note = chord["arp"][arp_pattern[eighth_num % 8]]
            # Rest on some 8ths for musical breathing
            play_pluck = (eighth_num % 8) in (0, 2, 3, 5, 6)
            pluck = 0.0
            if play_pluck and eighth_dt < 0.26:
                pluck_env = math.exp(-eighth_dt * 15.0)
                pluck = 0.055 * pluck_env * (
                    math.sin(two_pi * arp_note * eighth_dt)
                    + 0.28 * math.sin(two_pi * arp_note * 2.0 * eighth_dt)
                )
            pan = 0.5 + 0.32 * math.sin(eighth_num * 0.9)

            music_l = (bass + pad_l + pluck * pan) * duck * master_env
            music_r = (bass + pad_r + pluck * (1.0 - pan)) * duck * master_env

            # Foley layer (un-ducked so transitions and approvals sparkle cleanly)
            sfx_l = 0.0
            sfx_r = 0.0

            # Stereo transition whoosh + warm sub thump
            for ws in whoosh_idx:
                dt = (i - ws) / SAMPLE_RATE
                if -0.18 <= dt < 0.34:
                    u = (dt + 0.18) / 0.52
                    w_env = math.sin(math.pi * u) ** 1.6
                    n_val = noise_table[i & 8191]
                    sweep = math.sin(two_pi * (140.0 + 320.0 * u) * (dt + 0.2))
                    pan_w = u
                    sfx_l += 0.13 * w_env * (0.45 * n_val + 0.55 * sweep) * (1.0 - 0.5 * pan_w)
                    sfx_r += 0.13 * w_env * (0.45 * n_val + 0.55 * sweep) * (0.5 + 0.5 * pan_w)

            # Soft character / step pop
            for ps in pop_idx:
                dt = (i - ps) / SAMPLE_RATE
                if 0.0 <= dt < 0.075:
                    freq = 380.0 + 440.0 * (dt / 0.075)
                    p_val = 0.16 * math.exp(-dt * 42.0) * math.sin(two_pi * freq * dt)
                    sfx_l += p_val
                    sfx_r += p_val

            # Rust Vault $500 laser guardrail pulse
            for ls in laser_idx:
                dt = (i - ls) / SAMPLE_RATE
                if 0.0 <= dt < 0.28:
                    freq = 640.0 - 410.0 * (dt / 0.28)
                    l_val = 0.14 * math.exp(-dt * 11.0) * math.sin(two_pi * freq * dt)
                    sfx_l += l_val * 0.9
                    sfx_r += l_val * 1.1

            # Approval harmonic D-add9 sparkle chime + mechanical switch click
            for cs in chime_idx:
                dt = (i - cs) / SAMPLE_RATE
                if 0.0 <= dt < 0.03:
                    click_v = 0.18 * math.exp(-dt * 110.0) * math.sin(two_pi * 1750.0 * dt)
                    sfx_l += click_v
                    sfx_r += click_v
                if 0.0 <= dt < 0.55:
                    c_env = math.exp(-dt * 6.5)
                    ch_l = 0.11 * c_env * (
                        math.sin(two_pi * 587.33 * dt)
                        + 0.7 * math.sin(two_pi * 739.99 * dt)
                        + 0.5 * math.sin(two_pi * 1174.66 * dt)
                    )
                    ch_r = 0.11 * c_env * (
                        math.sin(two_pi * 587.33 * dt)
                        + 0.7 * math.sin(two_pi * 880.00 * dt)
                        + 0.5 * math.sin(two_pi * 1318.51 * dt)
                    )
                    sfx_l += ch_l
                    sfx_r += ch_r

            out_l = max(-0.95, min(0.95, music_l + sfx_l))
            out_r = max(-0.95, min(0.95, music_r + sfx_r))
            buf.extend(struct.pack("<hh", int(out_l * 32767), int(out_r * 32767)))

        wf.writeframes(bytes(buf))


def build_cut_mix(
    scenes: list[dict],
    total_frames: int,
    out_wav: Path,
    whooshes: list[float],
    pops: list[float],
    lasers: list[float],
    chimes: list[float],
    api_key: str | None,
) -> tuple[str, list[dict]]:
    duration_sec = total_frames / FPS
    used_provider = "macos_neural_say"
    enriched_scenes: list[dict] = []

    with tempfile.TemporaryDirectory() as tmp_str:
        tmp_dir = Path(tmp_str)
        clip_records: list[tuple[Path, int, float]] = []
        speech_windows: list[tuple[float, float]] = []

        for sc in scenes:
            speaker_key = sc["speaker"]
            speaker_cfg = VOICES[speaker_key]
            clip_wav = tmp_dir / f"{sc['id']}.wav"
            max_slot_sec = (sc["duration_frames"] / FPS) - sc["voice_offset_sec"] - 0.18
            words: list[dict] = []

            if api_key:
                mp3_path = tmp_dir / f"{sc['id']}_el.mp3"
                ok, el_words = synth_clip_elevenlabs(
                    sc["text"], mp3_path, api_key, speaker_cfg["elevenlabs_id"]
                )
                if ok:
                    used_provider = "elevenlabs_multilingual_v2_dual_host"
                    words = el_words
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
                ok_edge, edge_words = synth_clip_edge_neural(sc["text"], clip_wav, tmp_dir, speaker_cfg)
                if ok_edge:
                    if used_provider == "macos_neural_say":
                        used_provider = "studio_neural_dual_host_edge_tts"
                    words = edge_words

            if not clip_wav.exists():
                words = synth_clip_macos_say(sc["text"], clip_wav, tmp_dir, speaker_cfg)

            clip_dur = probe_duration(clip_wav)
            tempo = 1.0
            fitted_wav = clip_wav
            if clip_dur > max_slot_sec and max_slot_sec > 1.0:
                tempo = min(1.26, max(1.01, clip_dur / max_slot_sec))
                fitted_wav = tmp_dir / f"{sc['id']}_fit.wav"
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
                clip_dur = probe_duration(fitted_wav)

            if not words:
                words = _proportional_words(sc["text"], clip_dur)
            elif tempo > 1.001:
                words = [
                    {
                        "word": w["word"],
                        "start": round(w["start"] / tempo, 3),
                        "end": round(w["end"] / tempo, 3),
                    }
                    for w in words
                ]

            scene_abs_voice_start = (sc["start_frame"] / FPS) + sc["voice_offset_sec"]
            speech_windows.append((scene_abs_voice_start, scene_abs_voice_start + clip_dur))
            start_ms = int(scene_abs_voice_start * 1000)
            clip_records.append((fitted_wav, start_ms, clip_dur))

            enriched = dict(sc)
            enriched["speaker_label"] = speaker_cfg["label"]
            enriched["speaker_role"] = speaker_cfg["role"]
            enriched["voice_duration_sec"] = round(clip_dur, 3)
            enriched["words"] = words
            enriched_scenes.append(enriched)

        bed_wav = tmp_dir / "bed.wav"
        generate_launch_score_and_foley(
            bed_wav,
            duration_sec=duration_sec,
            speech_windows=speech_windows,
            whoosh_times=whooshes,
            pop_times=pops,
            laser_times=lasers,
            chime_times=chimes,
        )

        inputs = ["-i", str(bed_wav)]
        filter_parts = ["[0:a]volume=0.95[bed]"]
        mix_labels = ["[bed]"]

        for idx, (wav_path, start_ms, _dur) in enumerate(clip_records, start=1):
            inputs.extend(["-i", str(wav_path)])
            lbl = f"v{idx}"
            filter_parts.append(f"[{idx}:a]adelay={start_ms}|{start_ms},volume=1.42[{lbl}]")
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

    return used_provider, enriched_scenes


def main() -> None:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)

    api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip() or None

    master_provider, master_enriched = build_cut_mix(
        scenes=MASTER_SCENES,
        total_frames=5520,
        out_wav=AUDIO_DIR / "master-mix.wav",
        whooshes=[18.0, 42.0, 58.0, 72.0, 84.0],
        pops=[0.4, 9.1, 18.6, 26.2, 34.8, 58.5, 65.6, 72.5],
        lasers=[46.0],
        chimes=[38.2, 52.8, 84.4],
        api_key=api_key,
    )

    launch_provider, launch_enriched = build_cut_mix(
        scenes=LAUNCH_SCENES,
        total_frames=3480,
        out_wav=AUDIO_DIR / "launch-mix.wav",
        whooshes=[7.8, 17.0, 25.5, 35.0, 44.0, 51.0],
        pops=[0.35, 8.1, 25.8, 35.3],
        lasers=[19.8],
        chimes=[14.8, 22.8, 51.2],
        api_key=api_key,
    )

    manifest = {
        "fps": FPS,
        "width": 1920,
        "height": 1080,
        "voice_provider": master_provider,
        "launch_voice_provider": launch_provider,
        "voices": {
            "alex": {"label": "Alex", "role": "Product Lead", "accent": "#22D7DA"},
            "maya": {"label": "Maya", "role": "Systems Architect", "accent": "#FFD244"},
        },
        "master_total_frames": 5520,
        "launch_total_frames": 3480,
        "master_scenes": master_enriched,
        "launch_scenes": launch_enriched,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(
        f"[voice] Built master-mix.wav (92.0s @ 60fps) and launch-mix.wav (58.0s @ 60fps) via {master_provider}"
    )


if __name__ == "__main__":
    main()
