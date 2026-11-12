import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { AsciiShaderBackdrop } from "./AsciiShaderBackdrop";

export type WorldTheme =
  | "cosmic"
  | "tabletop"
  | "laboratory"
  | "everyday"
  | "warm_ascii"
  | "hero_cta";

export type CameraMove = "push_in" | "pull_back" | "pan_right" | "pan_left" | "portal_zoom";

interface ParallaxWorldProps {
  theme: WorldTheme;
  cameraMove?: CameraMove;
  durationInFrames: number;
  children?: React.ReactNode;
}

/**
 * 3-Layer Kurzgesagt-inspired Parallax World + Virtual 2D Camera:
 * Layer 1 (0.34x): Illustrated sky, starfields, blueprint grids, or `asciicn` shaders
 * Layer 2 (0.68x): Midground architectural structures, orbital rings, lab tubes, warm trees
 * Layer 3 (1.00x): Character rigs & focal product compositions (`children`)
 * Layer 4 (1.22x): Foreground framing particles, depth-of-field orbs, and atmospheric rim glow
 */
export const ParallaxWorld: React.FC<ParallaxWorldProps> = ({
  theme,
  cameraMove = "push_in",
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const u = Math.max(0, Math.min(1, frame / Math.max(1, durationInFrames)));
  const eased = Easing.inOut(Easing.sin)(u);

  let camScale = 1.0;
  let camX = 0;
  let camY = 0;

  if (cameraMove === "push_in") {
    camScale = interpolate(eased, [0, 1], [1.0, 1.055]);
    camY = interpolate(eased, [0, 1], [0, -12]);
  } else if (cameraMove === "pull_back") {
    camScale = interpolate(eased, [0, 1], [1.06, 1.0]);
    camY = interpolate(eased, [0, 1], [-10, 0]);
  } else if (cameraMove === "pan_right") {
    camScale = 1.03;
    camX = interpolate(eased, [0, 1], [-24, 24]);
  } else if (cameraMove === "pan_left") {
    camScale = 1.03;
    camX = interpolate(eased, [0, 1], [24, -24]);
  } else if (cameraMove === "portal_zoom") {
    camScale = interpolate(eased, [0, 1], [0.98, 1.07]);
  }

  const bgGradient =
    theme === "cosmic"
      ? "radial-gradient(circle at 68% 32%, #243CDB 0%, #180A59 46%, #09134B 100%)"
      : theme === "tabletop"
      ? "radial-gradient(circle at 50% 24%, #23211C 0%, #171614 55%, #11110F 100%)"
      : theme === "laboratory"
      ? "radial-gradient(circle at 50% 35%, #1D4ED8 0%, #0B1D51 58%, #071235 100%)"
      : theme === "everyday"
      ? "radial-gradient(circle at 65% 28%, #3B1C8C 0%, #180A59 56%, #0D0636 100%)"
      : theme === "warm_ascii"
      ? "radial-gradient(circle at 55% 30%, #8C2D19 0%, #3E1524 52%, #1C0D18 100%)"
      : "radial-gradient(circle at 50% 38%, #1F35B8 0%, #121526 58%, #0B0D16 100%)";

  return (
    <AbsoluteFill style={{ background: bgGradient, overflow: "hidden" }}>
      {/* LAYER 1: Deep Background (0.34x Parallax) */}
      <div
        style={{
          position: "absolute",
          inset: -60,
          transform: `translate(${camX * 0.34}px, ${camY * 0.34}px) scale(${1 + (camScale - 1) * 0.35})`,
          transformOrigin: "center center",
        }}
      >
        {theme === "tabletop" && (
          <AsciiShaderBackdrop
            mode="topography"
            cellSize={20}
            primaryColor="#FFD244"
            secondaryColor="#736D61"
            opacity={0.22}
          />
        )}
        {theme === "warm_ascii" && (
          <AsciiShaderBackdrop
            mode="plasma"
            cellSize={22}
            primaryColor="#FFD244"
            secondaryColor="#FF851D"
            opacity={0.28}
          />
        )}
        {theme === "hero_cta" && (
          <AsciiShaderBackdrop
            mode="globe"
            cellSize={18}
            primaryColor="#FFD244"
            secondaryColor="#22D7DA"
            opacity={0.34}
          />
        )}

        <svg width={2040} height={1200} viewBox="0 0 2040 1200">
          {theme === "cosmic" && (
            <g>
              {/* Nebula ribbons */}
              <path
                d="M -100 320 C 420 140, 920 520, 1540 260 C 1820 140, 2020 260, 2140 210 L 2140 620 C 1660 720, 1140 420, 540 680 L -100 580 Z"
                fill="#37228C"
                opacity={0.38}
              />
              <path
                d="M -80 760 C 480 620, 1080 940, 1780 680 L 2140 820 L 2140 1200 L -80 1200 Z"
                fill="#120842"
                opacity={0.68}
              />
              {/* Twinkling geometric stars */}
              {Array.from({ length: 34 }).map((_, idx) => {
                const sx = ((idx * 211) % 1920) + 60;
                const sy = ((idx * 137) % 880) + 60;
                const tw = 0.45 + 0.55 * Math.sin(t * 2.6 + idx * 1.3);
                const col = idx % 4 === 0 ? "#FFD244" : idx % 3 === 0 ? "#22D7DA" : "#FFFFFF";
                return (
                  <circle
                    key={idx}
                    cx={sx}
                    cy={sy}
                    r={(idx % 3) + 2.2}
                    fill={col}
                    opacity={tw * 0.85}
                  />
                );
              })}
            </g>
          )}

          {theme === "laboratory" && (
            <g>
              {/* Scientific Blueprint Grid */}
              {Array.from({ length: 22 }).map((_, gx) => (
                <line
                  key={`vx-${gx}`}
                  x1={gx * 96}
                  y1={0}
                  x2={gx * 96}
                  y2={1200}
                  stroke="#3B82F6"
                  strokeOpacity={0.14}
                  strokeWidth={1.5}
                />
              ))}
              {Array.from({ length: 14 }).map((_, gy) => (
                <line
                  key={`hy-${gy}`}
                  x1={0}
                  y1={gy * 96}
                  x2={2040}
                  y2={gy * 96}
                  stroke="#3B82F6"
                  strokeOpacity={0.14}
                  strokeWidth={1.5}
                />
              ))}
            </g>
          )}

          {theme === "everyday" && (
            <g>
              <circle cx={1580} cy={260} r={240} fill="#ED4BA4" opacity={0.14} />
              <circle cx={380} cy={320} r={290} fill="#33B9D7" opacity={0.12} />
              <path
                d="M 0 880 Q 520 760 1040 860 T 2040 820 L 2040 1200 L 0 1200 Z"
                fill="#120742"
                opacity={0.82}
              />
            </g>
          )}

          {theme === "warm_ascii" && (
            <g>
              {/* Warm Kurzgesagt sunset sun & layered horizon hills */}
              <circle cx={1480} cy={310} r={210} fill="#FFD244" opacity={0.18} />
              <circle cx={1480} cy={310} r={145} fill="#FF851D" opacity={0.24} />
              <path
                d="M 0 850 C 420 720, 860 920, 1380 790 C 1690 710, 1900 810, 2040 770 L 2040 1200 L 0 1200 Z"
                fill="#2B101C"
                opacity={0.88}
              />
            </g>
          )}
        </svg>
      </div>

      {/* LAYER 2: Midground Illustrated Props & Machinery (0.68x Parallax) */}
      <div
        style={{
          position: "absolute",
          inset: -30,
          transform: `translate(${camX * 0.68}px, ${camY * 0.68}px) scale(${1 + (camScale - 1) * 0.68})`,
          transformOrigin: "center center",
          pointerEvents: "none",
        }}
      >
        <svg width={1980} height={1140} viewBox="0 0 1980 1140">
          {theme === "cosmic" && (
            <g>
              {/* Orbital Linked Wallet Rings */}
              <g transform={`translate(990, 520) rotate(${-12 + t * 2.2})`}>
                <ellipse
                  cx={0}
                  cy={0}
                  rx={680}
                  ry={210}
                  fill="none"
                  stroke="#22D7DA"
                  strokeOpacity={0.26}
                  strokeWidth={3}
                  strokeDasharray="18 14"
                />
                <ellipse
                  cx={0}
                  cy={0}
                  rx={510}
                  ry={155}
                  fill="none"
                  stroke="#FFD244"
                  strokeOpacity={0.28}
                  strokeWidth={2.5}
                />
              </g>
              {/* Stylized Ringed Planet */}
              <g transform={`translate(${240 + Math.sin(t * 0.6) * 12}, ${230 + Math.cos(t * 0.7) * 10})`}>
                <circle cx={0} cy={0} r={62} fill="#ED4BA4" />
                <path d="M -44 -40 A 62 62 0 0 1 52 -24" stroke="#FF9AD5" strokeWidth={8} fill="none" strokeLinecap="round" />
                <ellipse cx={0} cy={6} rx={104} ry={22} fill="none" stroke="#FFD244" strokeWidth={7} transform="rotate(-18)" />
              </g>
            </g>
          )}

          {theme === "laboratory" && (
            <g>
              {/* Left & Right Glowing Cyan Reagent Cylinders & Overhead Conduits */}
              <rect x={84} y={180} width={92} height={540} rx={46} fill="#0E2A6E" stroke="#22D7DA" strokeWidth={4} opacity={0.75} />
              <rect x={98} y={380} width={64} height={320} rx={32} fill="#22D7DA" opacity={0.35} />
              {[0, 1, 2, 3].map((b) => {
                const by = 660 - ((t * 75 + b * 85) % 280);
                return <circle key={b} cx={130 + (b % 2) * 14 - 7} cy={by} r={8 + (b % 3) * 3} fill="#9CF4F5" opacity={0.75} />;
              })}

              <rect x={1804} y={210} width={92} height={510} rx={46} fill="#0E2A6E" stroke="#FF851D" strokeWidth={4} opacity={0.75} />
              <rect x={1818} y={420} width={64} height={280} rx={32} fill="#FF851D" opacity={0.35} />

              {/* Lab Floor Deck */}
              <rect x={0} y={920} width={1980} height={220} fill="#071233" />
              <line x1={0} y1={920} x2={1980} y2={920} stroke="#22D7DA" strokeWidth={4} strokeOpacity={0.5} />
            </g>
          )}

          {theme === "warm_ascii" && (
            <g>
              {/* Stylized Kurzgesagt Rounded Geometric Trees & Warm Arches */}
              {[130, 250, 1740, 1850].map((tx, idx) => (
                <g key={tx} transform={`translate(${tx}, ${830 + (idx % 2) * 28})`}>
                  <rect x={-7} y={0} width={14} height={70} rx={6} fill="#4A192C" />
                  <circle cx={0} cy={-26} r={42 - (idx % 2) * 8} fill={idx % 2 === 0 ? "#FF851D" : "#ED4BA4"} opacity={0.82} />
                </g>
              ))}
            </g>
          )}
        </svg>
      </div>

      {/* LAYER 3: Focal Action & Rigged Characters (1.00x Camera Plane) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${camX}px, ${camY}px) scale(${camScale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>

      {/* LAYER 4: Foreground Atmospheric Framing & Subtle Vignette (1.22x Parallax) */}
      <div
        style={{
          position: "absolute",
          inset: -40,
          transform: `translate(${camX * 1.22}px, ${camY * 1.22}px) scale(${1 + (camScale - 1) * 1.15})`,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 64%, rgba(5,7,20,0.42) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

export type TransitionVariant = "color_wipe" | "whip_pan" | "portal_iris" | "diagonal_shutter";

/**
 * Varied Kurzgesagt-style visual transitions triggered across Act boundaries
 * so consecutive acts never repeat the same transition mechanic.
 */
export const ActTransitionOverlay: React.FC<{
  triggerFrames: Array<{ frame: number; kind: TransitionVariant }>;
}> = ({ triggerFrames }) => {
  const frame = useCurrentFrame();

  for (const tr of triggerFrames) {
    const rel = frame - tr.frame;
    if (rel < -14 || rel > 16) continue;
    const u = (rel + 14) / 30; // 0..1 across 0.50s (30 frames @ 60fps)

    if (tr.kind === "color_wipe") {
      const x1 = interpolate(u, [0, 1], [-2200, 2200], { easing: Easing.inOut(Easing.cubic) });
      return (
        <AbsoluteFill style={{ pointerEvents: "none", zIndex: 90 }}>
          <svg width={1920} height={1080} viewBox="0 0 1920 1080">
            <g transform={`translate(${x1}, 0)`}>
              <polygon points="-400,0 520,0 360,1080 -560,1080" fill="#FFD244" />
              <polygon points="120,0 920,0 760,1080 -40,1080" fill="#22D7DA" />
              <polygon points="560,0 1260,0 1100,1080 400,1080" fill="#243CDB" />
            </g>
          </svg>
        </AbsoluteFill>
      );
    }

    if (tr.kind === "whip_pan") {
      const streakOpacity = Math.sin(Math.PI * u);
      const shiftX = interpolate(u, [0, 1], [1920, -1920], { easing: Easing.inOut(Easing.quad) });
      return (
        <AbsoluteFill style={{ pointerEvents: "none", zIndex: 90, opacity: streakOpacity }}>
          <svg width={1920} height={1080} viewBox="0 0 1920 1080">
            <g transform={`translate(${shiftX}, 0)`}>
              {[140, 290, 450, 620, 790, 930].map((ly, i) => (
                <rect
                  key={i}
                  x={0}
                  y={ly}
                  width={1500}
                  height={28 + (i % 3) * 14}
                  rx={18}
                  fill={i % 2 === 0 ? "#22D7DA" : "#FF851D"}
                  opacity={0.88}
                />
              ))}
            </g>
          </svg>
        </AbsoluteFill>
      );
    }

    if (tr.kind === "portal_iris") {
      const ringR = interpolate(u, [0, 0.5, 1], [0, 1280, 2200], {
        easing: Easing.out(Easing.cubic),
      });
      const alpha = interpolate(u, [0, 0.45, 1], [0.9, 0.85, 0]);
      return (
        <AbsoluteFill style={{ pointerEvents: "none", zIndex: 90 }}>
          <svg width={1920} height={1080} viewBox="0 0 1920 1080">
            <circle
              cx={960}
              cy={540}
              r={ringR}
              fill="none"
              stroke="#FFD244"
              strokeWidth={140}
              opacity={alpha}
            />
            <circle
              cx={960}
              cy={540}
              r={Math.max(0, ringR - 95)}
              fill="none"
              stroke="#ED4BA4"
              strokeWidth={70}
              opacity={alpha * 0.85}
            />
          </svg>
        </AbsoluteFill>
      );
    }

    if (tr.kind === "diagonal_shutter") {
      const yOff = interpolate(u, [0, 1], [1300, -1300], { easing: Easing.inOut(Easing.cubic) });
      return (
        <AbsoluteFill style={{ pointerEvents: "none", zIndex: 90 }}>
          <svg width={1920} height={1080} viewBox="0 0 1920 1080">
            <g transform={`translate(0, ${yOff})`}>
              <polygon points="0,120 1920,-140 1920,420 0,680" fill="#FF851D" />
              <polygon points="0,520 1920,260 1920,760 0,1020" fill="#FFD244" />
            </g>
          </svg>
        </AbsoluteFill>
      );
    }
  }

  return null;
};
