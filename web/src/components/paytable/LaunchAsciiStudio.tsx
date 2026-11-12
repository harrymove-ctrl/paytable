"use client";

import { useRef, useState } from "react";
import {
  AsciiCanvas,
  charsets,
  palettes,
  type AsciiHandle,
  type CharsetName,
} from "@/lib/ascii";
import { backgrounds } from "@/components/ascii/ascii-background";
import { AsciiDonut } from "@/components/ascii/ascii-donut";
import { AsciiGlobe } from "@/components/ascii/ascii-globe";
import { AsciiMatrix } from "@/components/ascii/ascii-matrix";
import { AsciiText } from "@/components/ascii/ascii-text";
import { Button } from "@/components/sodium/ui/button";
import {
  Frame,
  FrameBody,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FrameMeta,
  FrameStatus,
  FrameTitle,
  FrameValue,
} from "@/components/sodium/ui/frame";
import { Status } from "@/components/sodium/ui/status";
import { soundEngine } from "@/lib/sound-engine";

export type HeroBgVariant =
  | "topography"
  | "grid"
  | "starfield"
  | "waves"
  | "plasma"
  | "aurora"
  | "off";

type StudioScene =
  | "globe"
  | "donut"
  | "topography"
  | "grid"
  | "plasma"
  | "matrix"
  | "banner";

type PaletteKey = "sodium" | "thermal" | "cyanotype" | "matrix" | "sunset";

const STUDIO_PALETTES: Record<PaletteKey, readonly string[]> = {
  sodium: ["#2c2a25", "#8a6d1b", "#ff9a52", "#ffd400", "#f5f3ee"],
  thermal: palettes.thermal,
  cyanotype: palettes.cyanotype,
  matrix: palettes.matrix,
  sunset: palettes.sunset,
};

const ONE_PROMPT_AGENT_SKILL = `Teach my agent PayTable + asciicn + ElevenLabs MCP:
1. Read .mcp.json to connect @paypal/mcp (SANDBOX) and elevenlabs-mcp (2-voice narration: Brian + Jessica).
2. Stage spend intents via POST http://localhost:4184/api/runs/stage { track, prompt, amount_usd } and pause at Needs Approval; never move funds without human POST /api/runs/:id/approve { idempotency_key }.
3. Render ASCII 3D scenes and shader backgrounds with <AsciiCanvas>, <AsciiGlobe>, <AsciiDonut>, and <AsciiBackground> from @/lib/ascii, using dither="bayer" and ref.current.{text,svg,png}() for deterministic frame export.`;

interface LaunchAsciiStudioProps {
  heroBg: HeroBgVariant;
  onChangeHeroBg: (next: HeroBgVariant) => void;
  settledTotalUsd: number;
}

export function LaunchAsciiStudio({
  heroBg,
  onChangeHeroBg,
  settledTotalUsd,
}: LaunchAsciiStudioProps) {
  const asciiRef = useRef<AsciiHandle>(null);
  const [scene, setScene] = useState<StudioScene>("globe");
  const [charset, setCharset] = useState<CharsetName>("standard");
  const [dither, setDither] = useState<"bayer" | "floyd" | "none">("bayer");
  const [paletteKey, setPaletteKey] = useState<PaletteKey>("sodium");
  const [fontSize, setFontSize] = useState<number>(11);
  const [bannerText, setBannerText] = useState<string>("PAYTABLE");
  const [exportedPreview, setExportedPreview] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string>(
    "Ready: export live ASCII frames to .txt, .svg, .png, or 3s .webm video."
  );
  const [recordingVideo, setRecordingVideo] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  const activePalette = STUDIO_PALETTES[paletteKey];

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const handleExportTxt = () => {
    soundEngine.playClick("medium");
    const txt = asciiRef.current?.text() ?? "";
    if (!txt) {
      setExportNotice("Canvas still warming up; try again in a moment.");
      return;
    }
    const previewLines = txt.split("\n").slice(0, 10).join("\n");
    setExportedPreview(previewLines);
    triggerDownload(
      new Blob([txt], { type: "text/plain;charset=utf-8" }),
      `paytable-${scene}.txt`
    );
    setExportNotice(
      `Exported paytable-${scene}.txt (${txt.split("\n").length} ASCII rows).`
    );
  };

  const handleExportSvg = () => {
    soundEngine.playClick("medium");
    const svg = asciiRef.current?.svg() ?? "";
    if (!svg) return;
    triggerDownload(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      `paytable-${scene}.svg`
    );
    setExportNotice(
      `Exported vector paytable-${scene}.svg (${(svg.length / 1024).toFixed(1)} KB).`
    );
  };

  const handleExportPng = async () => {
    soundEngine.playClick("medium");
    const blob = await asciiRef.current?.png();
    if (!blob) return;
    triggerDownload(blob, `paytable-${scene}.png`);
    setExportNotice(
      `Exported raster paytable-${scene}.png (${(blob.size / 1024).toFixed(1)} KB).`
    );
  };

  const handleExportVideo = () => {
    const canvas = asciiRef.current?.canvas;
    if (!canvas || typeof MediaRecorder === "undefined") {
      setExportNotice("MediaRecorder video capture is unavailable in this browser.");
      return;
    }
    soundEngine.playStage();
    setRecordingVideo(true);
    setExportNotice("Recording 3.0s 30fps ASCII WebM clip from live shader...");

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      triggerDownload(blob, `paytable-${scene}-loop.webm`);
      setRecordingVideo(false);
      soundEngine.playApproveChime();
      setExportNotice(
        `Exported 3.0s video paytable-${scene}-loop.webm (${(blob.size / 1024).toFixed(1)} KB).`
      );
    };
    recorder.start();
    window.setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, 3000);
  };

  const copyAgentPrompt = async () => {
    soundEngine.playApproveChime();
    try {
      await navigator.clipboard.writeText(ONE_PROMPT_AGENT_SKILL);
    } catch {
      // Clipboard fallback ignored in headless contexts
    }
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 2200);
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)]">
      {/* Left: Live asciicn 3D / Shader Stage + 4-Format Exporter */}
      <Frame
        aria-label="asciicn live 3D and shader stage"
        data-testid="ascii-studio-frame"
      >
        <FrameHeader>
          <FrameTitle>asciicn-motion-stage</FrameTitle>
          <FrameStatus>
            <Status size="sm" live status="running">
              {scene} · {charset}
            </Status>
          </FrameStatus>
          <FrameValue meta>64-component engine</FrameValue>
        </FrameHeader>

        <FrameBody>
          <FrameDescription>
            Compose live 3D ASCII scenes, procedural FBM shaders, and display typography for PayTable launch cards, then export any frame to .txt, .svg, .png, or .webm video.
          </FrameDescription>

          {/* Scene Selector */}
          <div
            role="group"
            aria-label="ASCII scene preset"
            className="flex flex-wrap gap-1.5"
          >
            {(
              [
                ["globe", "3D Globe"],
                ["donut", "3D Vault Torus"],
                ["topography", "Topography"],
                ["grid", "Horizon Grid"],
                ["plasma", "Plasma Wave"],
                ["matrix", "Ledger Rain"],
                ["banner", "Display Type"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                data-testid={`ascii-scene-${key}`}
                onClick={() => {
                  soundEngine.playClick("light");
                  setScene(key);
                }}
                className={`cursor-pointer border px-2.5 py-1 type-label-sm transition-colors ${
                  scene === key
                    ? "selected border-accent-edge text-text-1"
                    : "border-line bg-well text-text-2 hover:bg-hover hover:text-text-1"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 16:9 Live ASCII Canvas Viewport */}
          <div className="relative aspect-video w-full overflow-hidden border border-line bg-[#0e0e0c]">
            {scene === "globe" && (
              <AsciiGlobe
                ref={asciiRef}
                speed={1.4}
                charset={charset}
                dither={dither}
                color={activePalette}
                fontSize={fontSize}
                className="size-full"
              />
            )}
            {scene === "donut" && (
              <AsciiDonut
                ref={asciiRef}
                speed={1.3}
                thickness={0.48}
                charset={charset}
                dither={dither}
                color={activePalette}
                fontSize={fontSize}
                className="size-full"
              />
            )}
            {(scene === "topography" ||
              scene === "grid" ||
              scene === "plasma") && (
              <AsciiCanvas
                ref={asciiRef}
                aria-label={`ASCII ${scene} shader`}
                field={(x, y, t, s) => backgrounds[scene](x, y, t * 1.15, s)}
                charset={charset}
                dither={dither}
                color={activePalette}
                fontSize={fontSize}
                opacity
                className="size-full"
              />
            )}
            {scene === "matrix" && (
              <AsciiMatrix
                ref={asciiRef}
                speed={15}
                density={0.72}
                glyphs={charsets.katakana.trim() + "PAYPAL0123456789$"}
                color={activePalette}
                fontSize={fontSize}
                className="size-full"
              />
            )}
            {scene === "banner" && (
              <div className="flex size-full items-center justify-center p-6">
                <AsciiText
                  ref={asciiRef}
                  text={bannerText || "PAYTABLE"}
                  charset={charset}
                  dither={dither}
                  color={activePalette}
                  fontSize={Math.max(7, fontSize - 2)}
                />
              </div>
            )}

            {/* Minimalist Launch HUD Overlay */}
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between border border-line bg-page/90 px-3 py-1.5">
              <span className="type-code-sm text-accent-text">
                PAYTABLE LAUNCH STAGE · {scene.toUpperCase()}
              </span>
              <span className="type-code-sm text-text-2">
                SETTLED ${settledTotalUsd.toFixed(2)} · 60 FPS READY
              </span>
            </div>
          </div>

          {/* Shader Parameter Bar */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <label className="flex flex-col gap-1 border border-line bg-well p-2">
              <span className="type-label-sm text-text-2">Charset Ramp</span>
              <select
                value={charset}
                onChange={(e) => setCharset(e.target.value as CharsetName)}
                className="bg-transparent type-code-sm text-text-1 focus:outline-none"
              >
                {(
                  [
                    "standard",
                    "blocks",
                    "braille",
                    "quadrants",
                    "donut",
                    "katakana",
                    "binary",
                    "dots",
                  ] as const
                ).map((c) => (
                  <option key={c} value={c} className="bg-panel text-text-1">
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 border border-line bg-well p-2">
              <span className="type-label-sm text-text-2">Dither Kernel</span>
              <select
                value={dither}
                onChange={(e) =>
                  setDither(e.target.value as "bayer" | "floyd" | "none")
                }
                className="bg-transparent type-code-sm text-text-1 focus:outline-none"
              >
                <option value="bayer" className="bg-panel text-text-1">
                  bayer (ordered)
                </option>
                <option value="floyd" className="bg-panel text-text-1">
                  floyd-steinberg
                </option>
                <option value="none" className="bg-panel text-text-1">
                  none (linear)
                </option>
              </select>
            </label>

            <label className="flex flex-col gap-1 border border-line bg-well p-2">
              <span className="type-label-sm text-text-2">Color Map</span>
              <select
                value={paletteKey}
                onChange={(e) => setPaletteKey(e.target.value as PaletteKey)}
                className="bg-transparent type-code-sm text-text-1 focus:outline-none"
              >
                <option value="sodium" className="bg-panel text-text-1">
                  sodium gold
                </option>
                <option value="cyanotype" className="bg-panel text-text-1">
                  cyanotype lab
                </option>
                <option value="thermal" className="bg-panel text-text-1">
                  thermal Kurz
                </option>
                <option value="matrix" className="bg-panel text-text-1">
                  matrix phosphor
                </option>
                <option value="sunset" className="bg-panel text-text-1">
                  warm sunset
                </option>
              </select>
            </label>

            <label className="flex flex-col gap-1 border border-line bg-well p-2">
              <span className="type-label-sm text-text-2">
                {scene === "banner" ? "Banner Word" : `Cell Size (${fontSize}px)`}
              </span>
              {scene === "banner" ? (
                <input
                  type="text"
                  maxLength={14}
                  value={bannerText}
                  onChange={(e) => setBannerText(e.target.value.toUpperCase())}
                  className="bg-transparent type-code-sm text-text-1 focus:outline-none"
                />
              ) : (
                <input
                  type="range"
                  min={8}
                  max={16}
                  step={1}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="accent-[#ffd400]"
                />
              )}
            </label>
          </div>

          {exportedPreview && (
            <pre
              data-testid="ascii-txt-preview"
              className="max-h-36 overflow-auto border border-line bg-page p-2.5 font-mono text-[10px] leading-tight text-text-2"
            >
              {exportedPreview}
            </pre>
          )}
        </FrameBody>

        <FrameFooter className="flex-wrap gap-2">
          <FrameMeta data-testid="ascii-export-status">{exportNotice}</FrameMeta>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportTxt}
              data-testid="export-ascii-txt-btn"
            >
              Export .txt
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportSvg}
              data-testid="export-ascii-svg-btn"
            >
              Export .svg
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPng}
              data-testid="export-ascii-png-btn"
            >
              Export .png
            </Button>
            <Button
              variant="primary"
              size="sm"
              pending={recordingVideo}
              pendingLabel="Recording 3s"
              onClick={handleExportVideo}
              data-testid="export-ascii-video-btn"
            >
              Export .webm video
            </Button>
          </div>
        </FrameFooter>
      </Frame>

      {/* Right: Agent Launch Editor, Hero Backdrop Sync & Dual-Voice MCP Studio */}
      <div className="flex min-w-0 flex-col gap-5">
        <Frame aria-label="One prompt teaches your agent">
          <FrameHeader>
            <FrameTitle>one-prompt-agent-skill</FrameTitle>
            <FrameValue meta>.mcp.json + asciicn</FrameValue>
          </FrameHeader>
          <FrameBody>
            <FrameDescription>
              One prompt teaches Claude Code, Cursor, or Antigravity how to stage Linked Wallet purchases, run ElevenLabs 2-voice launch narration, and mount asciicn shaders.
            </FrameDescription>
            <pre className="overflow-x-auto border border-line bg-well p-3 type-code-sm text-text-1 whitespace-pre-wrap">
              {ONE_PROMPT_AGENT_SKILL}
            </pre>

            <div className="flex flex-col gap-1.5">
              <span className="type-label-sm text-text-2">
                Tabletop Hero Background Shader
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    "topography",
                    "grid",
                    "starfield",
                    "waves",
                    "plasma",
                    "aurora",
                    "off",
                  ] as const
                ).map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick("light");
                      onChangeHeroBg(bg);
                    }}
                    className={`cursor-pointer border px-2 py-1 type-label-sm ${
                      heroBg === bg
                        ? "selected border-accent-edge text-text-1"
                        : "border-line bg-panel text-text-2 hover:text-text-1"
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>
          </FrameBody>
          <FrameFooter>
            <FrameMeta>elevenlabs-mcp + @paypal/mcp ready</FrameMeta>
            <Button
              variant="primary"
              size="sm"
              onClick={copyAgentPrompt}
              data-testid="copy-agent-prompt-btn"
            >
              {copiedPrompt ? "Copied agent prompt" : "Copy agent prompt"}
            </Button>
          </FrameFooter>
        </Frame>

        <Frame aria-label="Dual-voice ElevenLabs MCP launch cast">
          <FrameHeader>
            <FrameTitle>dual-voice-launch-cast</FrameTitle>
            <FrameStatus>
              <Status size="sm" status="ok">
                2 Voices Synced
              </Status>
            </FrameStatus>
          </FrameHeader>
          <FrameBody padding="none">
            <div className="divide-y divide-line-faint">
              <div className="p-inset">
                <div className="flex items-center justify-between gap-2">
                  <span className="type-code text-text-1">
                    [VOICE 01] Alex · Founder Host
                  </span>
                  <span className="type-caption text-accent-text">
                    ElevenLabs Brian / Andrew Neural
                  </span>
                </div>
                <p className="mt-1 type-caption text-text-2">
                  &ldquo;PayPal just opened a huge door: linked wallets for AI agents, with your approval on every single purchase.&rdquo;
                </p>
              </div>
              <div className="p-inset">
                <div className="flex items-center justify-between gap-2">
                  <span className="type-code text-text-1">
                    [VOICE 02] Maya · Agent Launch Director
                  </span>
                  <span className="type-caption text-ok">
                    ElevenLabs Jessica / Ava Neural
                  </span>
                </div>
                <p className="mt-1 type-caption text-text-2">
                  &ldquo;Pick any workflow on PayTable, adjust diners or currency caps live, and tap Approve once to stamp a SHA-256 PayPal mandate.&rdquo;
                </p>
              </div>
            </div>
          </FrameBody>
        </Frame>
      </div>
    </div>
  );
}
