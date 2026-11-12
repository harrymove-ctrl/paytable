import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import manifest from "./scene-manifest.json";
import {
  PipAgentRig,
  VaultyGuardianRig,
  WordTiming,
  getMouthOpenness,
} from "./CharacterRig";
import { AsciiShaderBackdrop } from "./AsciiShaderBackdrop";
import { ActTransitionOverlay, ParallaxWorld } from "./ParallaxWorld";

const MONO = '"Commit Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = '"Inter Display", -apple-system, BlinkMacSystemFont, sans-serif';

interface SceneRecord {
  id: string;
  act: number;
  speaker: "alex" | "maya" | string;
  speaker_label: string;
  speaker_role: string;
  start_frame: number;
  duration_frames: number;
  voice_offset_sec: number;
  voice_duration_sec: number;
  text: string;
  caption: string;
  words: WordTiming[];
}

function useSodiumFonts() {
  const [handle] = useState(() => delayRender("Loading PayTable woff2 fonts"));
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const mono = new FontFace(
          "Commit Mono",
          `url(${staticFile("fonts/CommitMono-Regular.woff2")}) format("woff2")`
        );
        const sans = new FontFace(
          "Inter Display",
          `url(${staticFile("fonts/InterDisplay-Regular.woff2")}) format("woff2")`
        );
        const [m, s] = await Promise.all([mono.load(), sans.load()]);
        if (!cancelled) {
          document.fonts.add(m);
          document.fonts.add(s);
        }
      } catch {
        // Fallback fonts remain ready
      } finally {
        if (!cancelled) continueRender(handle);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [handle]);
}

function findActiveScene(scenes: SceneRecord[], frame: number): SceneRecord {
  for (let i = scenes.length - 1; i >= 0; i--) {
    if (frame >= scenes[i].start_frame) {
      return scenes[i];
    }
  }
  return scenes[0];
}

/**
 * Top Launch Film Chrome showing Act Tag, Dual-Voice Indicator, and PayPal Sandbox Status.
 */
const TopFilmHud: React.FC<{ actLabel: string; actTag: string }> = ({
  actLabel,
  actTag,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 32,
        left: 64,
        right: 64,
        height: 46,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 18px",
        borderRadius: 10,
        backgroundColor: "rgba(10, 14, 34, 0.78)",
        border: "1px solid rgba(255, 255, 255, 0.16)",
        fontFamily: MONO,
        fontSize: 13,
        letterSpacing: "0.08em",
        color: "#E2E8F0",
        zIndex: 60,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 18,
            height: 18,
            backgroundColor: "#FFD244",
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#09134B",
            fontWeight: 800,
            fontSize: 11,
          }}
        >
          P
        </div>
        <span style={{ color: "#FFFFFF", fontWeight: 700 }}>PAYTABLE v2.0</span>
        <span style={{ color: "#94A3B8" }}>·</span>
        <span style={{ color: "#FFD244" }}>{actTag}</span>
        <span style={{ color: "#CBD5E1" }}>{actLabel}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ color: "#22D7DA" }}>LINKED AGENT WALLET</span>
        <span
          style={{
            padding: "3px 9px",
            borderRadius: 6,
            backgroundColor: "rgba(61, 214, 140, 0.16)",
            border: "1px solid rgba(61, 214, 140, 0.45)",
            color: "#3DD68C",
            fontSize: 12,
          }}
        >
          HUMAN GATE ARMED
        </span>
      </div>
    </div>
  );
};

/**
 * Dual-Voice Conversational Subtitle & Word-Level Karaoke Highlight Pill.
 * Highlights spoken words smoothly along the measured baseline without scaling jitter.
 */
const DualHostDialogueBar: React.FC<{ scene: SceneRecord; globalFrame: number }> = ({
  scene,
  globalFrame,
}) => {
  const { fps } = useVideoConfig();
  const sceneSec = (globalFrame - scene.start_frame) / fps;
  const relVoiceSec = sceneSec - scene.voice_offset_sec;
  const isAlex = scene.speaker === "alex";
  const accent = isAlex ? "#22D7DA" : "#FFD244";
  const mouth = getMouthOpenness(sceneSec, scene.voice_offset_sec, scene.words, true);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 28,
        left: 110,
        right: 110,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "13px 22px",
        borderRadius: 14,
        backgroundColor: "rgba(9, 13, 28, 0.88)",
        border: `1.5px solid ${accent}66`,
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.45)",
        zIndex: 70,
      }}
    >
      {/* Active Host Pill + Live Waveform */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "7px 14px",
          borderRadius: 9,
          backgroundColor: isAlex
            ? "rgba(34, 215, 218, 0.14)"
            : "rgba(255, 210, 68, 0.14)",
          border: `1px solid ${accent}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 99,
            backgroundColor: accent,
          }}
        />
        <span
          style={{
            fontFamily: MONO,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: accent,
          }}
        >
          {scene.speaker_label.toUpperCase()}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            height: 16,
            marginLeft: 2,
          }}
        >
          {[0.6, 1.0, 0.8, 0.5].map((w, idx) => {
            const h = 4 + mouth * 12 * w;
            return (
              <div
                key={idx}
                style={{
                  width: 3,
                  height: h,
                  borderRadius: 2,
                  backgroundColor: accent,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Word-Timed Conversational Transcript */}
      <div
        style={{
          flex: 1,
          fontFamily: SANS,
          fontSize: 22,
          lineHeight: 1.32,
          fontWeight: 600,
          color: "#F8FAFC",
          display: "flex",
          flexWrap: "wrap",
          columnGap: 7,
          rowGap: 3,
        }}
      >
        {scene.words && scene.words.length > 0
          ? scene.words.map((w, idx) => {
              const spoken = relVoiceSec >= w.start - 0.03;
              const activeNow =
                relVoiceSec >= w.start - 0.03 && relVoiceSec <= w.end + 0.08;
              return (
                <span
                  key={idx}
                  style={{
                    color: activeNow
                      ? accent
                      : spoken
                      ? "#FFFFFF"
                      : "rgba(203, 213, 225, 0.52)",
                  }}
                >
                  {w.word}
                </span>
              );
            })
          : scene.caption}
      </div>
    </div>
  );
};

/**
 * Framed Sodium Product Window for Crisp Real v2 UI Plates.
 */
const ProductPlateWindow: React.FC<{
  src: string;
  title: string;
  badge: string;
  badgeColor?: string;
  width?: number;
  height?: number;
}> = ({
  src,
  title,
  badge,
  badgeColor = "#FFD244",
  width = 1140,
  height = 640,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 125, mass: 0.9 },
  });

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: "#141412",
        border: "2px solid rgba(255, 210, 68, 0.42)",
        boxShadow: "0 28px 70px rgba(0, 0, 0, 0.58)",
        transform: `scale(${0.94 + 0.06 * pop})`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 38,
          backgroundColor: "#1C1B19",
          borderBottom: "1px solid #2C2A25",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          fontFamily: MONO,
          fontSize: 12,
          color: "#C4C0B6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: "#FF6B57" }} />
          <span style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: "#FFD244" }} />
          <span style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: "#3DD68C" }} />
          <span style={{ marginLeft: 8, color: "#F5F3EE" }}>{title}</span>
        </div>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 4,
            border: `1px solid ${badgeColor}`,
            color: badgeColor,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <Img
          src={staticFile(src)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
          }}
        />
      </div>
    </div>
  );
};

/* ============================================================================
   ACT 1: COSMIC CHARACTER-LED LAUNCH OPENING (#09134B / #243CDB / #22D7DA / #FFD244)
   ============================================================================ */
const Act1CosmicOpening: React.FC<{
  durationInFrames: number;
  activeScene: SceneRecord;
  globalFrame: number;
}> = ({ durationInFrames, activeScene, globalFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const secondHalf = frame >= durationInFrames * 0.49;

  const sceneSec = (globalFrame - activeScene.start_frame) / fps;
  const alexSpeaking = activeScene.speaker === "alex";
  const pipMouth = getMouthOpenness(
    sceneSec,
    activeScene.voice_offset_sec,
    activeScene.words,
    alexSpeaking
  );
  const vaultyMouth = getMouthOpenness(
    sceneSec,
    activeScene.voice_offset_sec,
    activeScene.words,
    !alexSpeaking
  );

  const bridgeReveal = secondHalf
    ? spring({
        frame: Math.max(0, Math.floor(frame - durationInFrames * 0.49)),
        fps,
        config: { damping: 13, stiffness: 120 },
      })
    : 0;

  return (
    <ParallaxWorld theme="cosmic" cameraMove="push_in" durationInFrames={durationInFrames}>
      <TopFilmHud
        actTag="ACT 01 · LAUNCH STORY"
        actLabel="Why AI Agents Needed Linked PayPal Wallets"
      />

      {/* Hero Headline Block */}
      <div
        style={{
          position: "absolute",
          top: 108,
          left: 120,
          right: 120,
          textAlign: "center",
          zIndex: 25,
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "6px 16px",
            borderRadius: 99,
            backgroundColor: secondHalf
              ? "rgba(255, 210, 68, 0.18)"
              : "rgba(255, 77, 109, 0.18)",
            border: `1.5px solid ${secondHalf ? "#FFD244" : "#FF4D6D"}`,
            fontFamily: MONO,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.09em",
            color: secondHalf ? "#FFD244" : "#FF8FA3",
            marginBottom: 14,
          }}
        >
          {secondHalf
            ? "PRODUCT LAUNCH · PAYPAL LINKED AGENT WALLETS"
            : "THE AUTONOMOUS CHECKOUT WALL"}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 58,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            color: "#FFFFFF",
          }}
        >
          {secondHalf ? (
            <>
              Meet <span style={{ color: "#FFD244" }}>PayTable</span>: Agents Shop,{" "}
              <span style={{ color: "#22D7DA" }}>Humans Approve</span>
            </>
          ) : (
            <>
              Agents Negotiate in Seconds.{" "}
              <span style={{ color: "#FF6B8B" }}>Raw Cards Stop Them Cold.</span>
            </>
          )}
        </div>
      </div>

      {/* Illustrated Cosmic Stage SVG */}
      <svg
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{ position: "absolute", inset: 0, zIndex: 20 }}
      >
        {/* Three Floating Merchant Quote Cards on Left */}
        {[
          { y: 360, vendor: "Merchant A", price: "$310", col: "#94A3B8" },
          { y: 455, vendor: "Merchant B", price: "$289", col: "#38BDF8" },
          { y: 550, vendor: "Best Quote", price: "$265", col: "#FFD244" },
        ].map((q, idx) => {
          const floatY = q.y + Math.sin(t * 2.5 + idx) * 7;
          return (
            <g key={idx} transform={`translate(175, ${floatY})`}>
              <rect
                x={0}
                y={0}
                width={250}
                height={70}
                rx={16}
                fill="#121C5C"
                stroke={q.col}
                strokeWidth={3}
              />
              <text
                x={22}
                y={43}
                fill="#E2E8F0"
                fontFamily={SANS}
                fontSize={22}
                fontWeight={600}
              >
                {q.vendor}
              </text>
              <text
                x={228}
                y={44}
                textAnchor="end"
                fill={q.col}
                fontFamily={MONO}
                fontSize={24}
                fontWeight={700}
              >
                {q.price}
              </text>
            </g>
          );
        })}

        {/* First Half: Red Raw Credit Card Forcefield Wall */}
        {!secondHalf && (
          <g transform="translate(960, 560)">
            <rect
              x={-18}
              y={-210}
              width={36}
              height={420}
              rx={18}
              fill="#FF4D6D"
              opacity={0.75 + 0.2 * Math.sin(t * 10)}
            />
            <rect
              x={-155}
              y={-64}
              width={310}
              height={128}
              rx={22}
              fill="#2B0B26"
              stroke="#FF4D6D"
              strokeWidth={4}
            />
            <text
              x={0}
              y={-8}
              textAnchor="middle"
              fill="#FF8FA3"
              fontFamily={MONO}
              fontSize={19}
              fontWeight={700}
            >
              RAW CARD BLOCKED
            </text>
            <text
              x={0}
              y={26}
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily={SANS}
              fontSize={20}
              fontWeight={600}
            >
              Zero Spend Boundaries
            </text>
          </g>
        )}

        {/* Second Half: Golden Linked Agent Wallet Bridge Connecting Pip & Vaulty */}
        {secondHalf && (
          <g
            transform={`translate(960, 555) scale(${bridgeReveal})`}
            opacity={bridgeReveal}
          >
            {/* Glowing Connection Conduit */}
            <line
              x1={-320}
              y1={20}
              x2={320}
              y2={20}
              stroke="#FFD244"
              strokeWidth={10}
              strokeDasharray="22 14"
            />
            <rect
              x={-210}
              y={-95}
              width={420}
              height={190}
              rx={28}
              fill="#101C58"
              stroke="#FFD244"
              strokeWidth={5}
            />
            <rect x={-180} y={-68} width={360} height={42} rx={12} fill="#1E328F" />
            <text
              x={0}
              y={-40}
              textAnchor="middle"
              fill="#FFD244"
              fontFamily={MONO}
              fontSize={17}
              fontWeight={700}
            >
              wlt_agent_linked_01 · PAYPAL V2
            </text>
            <text
              x={0}
              y={14}
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily={SANS}
              fontSize={28}
              fontWeight={800}
            >
              $500 Single · $1,500 Daily Cap
            </text>
            <text
              x={0}
              y={54}
              textAnchor="middle"
              fill="#3DD68C"
              fontFamily={MONO}
              fontSize={18}
              fontWeight={700}
            >
              PER-PURCHASE HUMAN APPROVAL
            </text>
          </g>
        )}

        {/* Rigged Host 1: Pip the Courier Agent */}
        <PipAgentRig
          x={585}
          y={590}
          scale={1.32}
          mouthOpen={pipMouth}
          mood={secondHalf ? "happy" : "alert"}
          gesture={secondHalf ? "cheer" : "halt"}
        />

        {/* Rigged Host 2: Vaulty the Guardian */}
        <VaultyGuardianRig
          x={1365}
          y={585}
          scale={1.28}
          flipX
          mouthOpen={vaultyMouth}
          gateState={secondHalf ? "approved" : "armed"}
          gesture={secondHalf ? "point" : "halt"}
          enterDelayFrames={12}
        />
      </svg>
    </ParallaxWorld>
  );
};

/* ============================================================================
   ACT 2: STEP-BY-STEP GUIDED PRODUCT LAUNCH (#141412 / #FFD244 / #22D7DA)
   ============================================================================ */
const Act2GuidedSteps: React.FC<{
  durationInFrames: number;
  activeScene: SceneRecord;
  globalFrame: number;
}> = ({ durationInFrames, activeScene, globalFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = frame / Math.max(1, durationInFrames);

  const stepIndex = progress < 0.34 ? 0 : progress < 0.69 ? 1 : 2;
  const plateSrc =
    stepIndex === 0
      ? "plates/plate-01-awaiting-approval.png"
      : stepIndex === 1
      ? "plates/plate-02-approved-settled.png"
      : "plates/plate-03-mandate-dialog.png";

  const plateTitle =
    stepIndex === 0
      ? "STEP 01 & 02 · PICK TRACK & STAGE @PAYTABLE QUOTE ($310 -> $265)"
      : stepIndex === 1
      ? "STEP 03 · TUNE WALLET CAP LIVE & CLICK APPROVE ONCE"
      : "STEP 04 · VERIFIED SHA-256 MANDATE & PAYPAL SANDBOX RECEIPT";

  const sceneSec = (globalFrame - activeScene.start_frame) / fps;
  const isAlex = activeScene.speaker === "alex";
  const pipMouth = getMouthOpenness(
    sceneSec,
    activeScene.voice_offset_sec,
    activeScene.words,
    isAlex
  );
  const vaultyMouth = getMouthOpenness(
    sceneSec,
    activeScene.voice_offset_sec,
    activeScene.words,
    !isAlex
  );

  const steps = [
    { num: "01", label: "Pick Preset or Prompt" },
    { num: "02", label: "Compare 3 Quotes" },
    { num: "03", label: "Tune Cap & Approve" },
    { num: "04", label: "Signed Receipt" },
  ];

  return (
    <ParallaxWorld theme="tabletop" cameraMove="pan_right" durationInFrames={durationInFrames}>
      <TopFilmHud
        actTag="ACT 02 · HOW TO USE PAYTABLE"
        actLabel="Four Simple Steps From @paytable Prompt to Settled Receipt"
      />

      {/* 4-Step Interactive Progress Strip */}
      <div
        style={{
          position: "absolute",
          top: 96,
          left: 140,
          right: 140,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          zIndex: 40,
        }}
      >
        {steps.map((st, idx) => {
          const active =
            (stepIndex === 0 && idx === 0) ||
            (stepIndex === 1 && idx === 1) ||
            (stepIndex === 2 && (idx === 2 || idx === 3));
          return (
            <div
              key={st.num}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                backgroundColor: active ? "#3A3107" : "rgba(28, 27, 25, 0.9)",
                border: `2px solid ${active ? "#FFD244" : "#2C2A25"}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 15,
                  fontWeight: 800,
                  padding: "4px 8px",
                  borderRadius: 6,
                  backgroundColor: active ? "#FFD244" : "#22211E",
                  color: active ? "#141412" : "#A19C90",
                }}
              >
                {st.num}
              </span>
              <span
                style={{
                  fontFamily: SANS,
                  fontSize: 19,
                  fontWeight: 700,
                  color: active ? "#FFFFFF" : "#C4C0B6",
                }}
              >
                {st.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Centered Crisp Sodium UI Plate */}
      <div
        style={{
          position: "absolute",
          top: 176,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 30,
        }}
      >
        <ProductPlateWindow
          key={plateSrc}
          src={plateSrc}
          title={plateTitle}
          badge={stepIndex === 0 ? "NEEDS APPROVAL" : "APPROVED & SETTLED"}
          badgeColor={stepIndex === 0 ? "#FF9A52" : "#3DD68C"}
          width={1260}
          height={690}
        />
      </div>

      {/* Pip & Vaulty Co-Hosting Flanking the Product Window */}
      <svg
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{ position: "absolute", inset: 0, zIndex: 45, pointerEvents: "none" }}
      >
        <PipAgentRig
          x={155}
          y={740}
          scale={1.08}
          mouthOpen={pipMouth}
          mood="happy"
          gesture="point"
        />
        <VaultyGuardianRig
          x={1765}
          y={735}
          scale={1.05}
          flipX
          mouthOpen={vaultyMouth}
          gateState={stepIndex >= 1 ? "approved" : "armed"}
          gesture={stepIndex >= 1 ? "cheer" : "point"}
        />
      </svg>
    </ParallaxWorld>
  );
};

/* ============================================================================
   ACT 3: HIGH-ENERGY RUST VAULT LABORATORY (#0B1D51 / #22D7DA / #FF851D)
   ============================================================================ */
const Act3RustLaboratory: React.FC<{
  durationInFrames: number;
  activeScene: SceneRecord;
  globalFrame: number;
}> = ({ durationInFrames, activeScene, globalFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const secondBeat = frame >= durationInFrames * 0.5;

  const sceneSec = (globalFrame - activeScene.start_frame) / fps;
  const isAlex = activeScene.speaker === "alex";
  const pipMouth = getMouthOpenness(
    sceneSec,
    activeScene.voice_offset_sec,
    activeScene.words,
    isAlex
  );
  const vaultyMouth = getMouthOpenness(
    sceneSec,
    activeScene.voice_offset_sec,
    activeScene.words,
    !isAlex
  );

  // Beat 1: Rogue $620 capsule approaches laser at x=960 and gets deflected
  const beat1Progress = Math.min(1, frame / Math.max(1, durationInFrames * 0.45));
  const rogueX = beat1Progress < 0.52
    ? interpolate(beat1Progress, [0, 0.52], [320, 860])
    : interpolate(beat1Progress, [0.52, 1], [860, 520]);
  const rogueY = beat1Progress < 0.52
    ? 610
    : interpolate(beat1Progress, [0.52, 1], [610, 420]);

  // Beat 2: Valid $265 capsule gets stamped by SHA-256 crystal press
  const beat2Local = Math.max(0, frame - durationInFrames * 0.5);
  const stampPop = spring({
    frame: Math.max(0, Math.floor(beat2Local - 35)),
    fps,
    config: { damping: 11, stiffness: 160 },
  });

  return (
    <ParallaxWorld theme="laboratory" cameraMove="portal_zoom" durationInFrames={durationInFrames}>
      <TopFilmHud
        actTag="ACT 03 · HIGH-ASSURANCE RUST ENGINE"
        actLabel="Fail-Closed Spend Caps, Human Switch & SHA-256 Mandate Stamp"
      />

      <div
        style={{
          position: "absolute",
          top: 102,
          left: 140,
          right: 140,
          textAlign: "center",
          zIndex: 35,
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: "#FFFFFF",
          }}
        >
          {secondBeat ? (
            <>
              Flip the <span style={{ color: "#FF851D" }}>Human Switch</span>: Mint{" "}
              <span style={{ color: "#3DD68C" }}>SHA-256 Mandate</span> &amp; Capture Orders v2
            </>
          ) : (
            <>
              Inside the <span style={{ color: "#22D7DA" }}>Rust Vault Lab</span>: Quotes Over{" "}
              <span style={{ color: "#FF4D6D" }}>$500 Cap</span> Fail Closed
            </>
          )}
        </div>
      </div>

      <svg
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{ position: "absolute", inset: 0, zIndex: 30 }}
      >
        {/* Conveyor Track */}
        <rect x={260} y={670} width={1400} height={38} rx={19} fill="#10255E" stroke="#3B82F6" strokeWidth={3} />
        {Array.from({ length: 16 }).map((_, idx) => {
          const cx = 295 + ((idx * 88 + frame * 3) % 1330);
          return <circle key={idx} cx={cx} cy={689} r={8} fill="#60A5FA" opacity={0.65} />;
        })}

        {/* Central Laser / Crystal Stamp Archway */}
        <g transform="translate(960, 470)">
          <rect x={-165} y={-190} width={330} height={390} rx={32} fill="#091945" stroke={secondBeat ? "#3DD68C" : "#FF4D6D"} strokeWidth={6} />
          <rect x={-135} y={-160} width={270} height={54} rx={14} fill="#132D7A" />
          <text
            x={0}
            y={-125}
            textAnchor="middle"
            fill={secondBeat ? "#3DD68C" : "#FFD244"}
            fontFamily={MONO}
            fontSize={18}
            fontWeight={700}
          >
            {secondBeat ? "MANDATE STAMP ARMED" : "MAX SINGLE CAP: $500"}
          </text>

          {!secondBeat ? (
            <>
              {/* High-Energy Vertical Laser Gate */}
              <line
                x1={0}
                y1={-95}
                x2={0}
                y2={195}
                stroke="#FF4D6D"
                strokeWidth={12 + Math.sin(t * 28) * 4}
                opacity={0.9}
              />
              <line x1={0} y1={-95} x2={0} y2={195} stroke="#FFFFFF" strokeWidth={4} />
              {beat1Progress >= 0.48 && (
                <g transform="translate(0, 50)">
                  <circle cx={0} cy={0} r={54} fill="#FF4D6D" opacity={0.28} />
                  <text
                    x={0}
                    y={-75}
                    textAnchor="middle"
                    fill="#FF8FA3"
                    fontFamily={MONO}
                    fontSize={19}
                    fontWeight={800}
                  >
                    HTTP 422 · BLOCKED!
                  </text>
                </g>
              )}
            </>
          ) : (
            <>
              {/* Tactile Orange Human Switch + Descending SHA-256 Crystal Stamp */}
              <g transform="translate(0, -45)">
                <rect x={-90} y={-24} width={180} height={48} rx={24} fill="#173A2B" stroke="#3DD68C" strokeWidth={3} />
                <circle cx={58 * stampPop} cy={0} r={19} fill="#FFD244" />
                <text x={-22} y={6} textAnchor="middle" fill="#3DD68C" fontFamily={MONO} fontSize={14} fontWeight={800}>
                  HUMAN ON
                </text>
              </g>
              <g transform={`translate(0, ${28 + stampPop * 46})`}>
                <polygon
                  points="-70,-36 70,-36 90,10 0,52 -90,10"
                  fill="#22D7DA"
                  stroke="#FFFFFF"
                  strokeWidth={3}
                />
                <text x={0} y={8} textAnchor="middle" fill="#09134B" fontFamily={MONO} fontSize={16} fontWeight={800}>
                  SHA-256 SEAL
                </text>
              </g>
            </>
          )}
        </g>

        {/* Moving Payment Capsule */}
        {!secondBeat ? (
          <g transform={`translate(${rogueX}, ${rogueY}) rotate(${beat1Progress > 0.52 ? -22 : 0})`}>
            <rect x={-95} y={-44} width={190} height={88} rx={22} fill="#7F1D1D" stroke="#FF4D6D" strokeWidth={4} />
            <text x={0} y={-4} textAnchor="middle" fill="#FCA5A5" fontFamily={MONO} fontSize={16} fontWeight={700}>
              ROGUE QUOTE
            </text>
            <text x={0} y={26} textAnchor="middle" fill="#FFFFFF" fontFamily={MONO} fontSize={26} fontWeight={800}>
              $620.00
            </text>
          </g>
        ) : (
          <g transform={`translate(${960 + stampPop * 330}, 605)`}>
            <rect x={-105} y={-46} width={210} height={92} rx={22} fill="#143829" stroke="#3DD68C" strokeWidth={4} />
            <text x={0} y={-6} textAnchor="middle" fill="#3DD68C" fontFamily={MONO} fontSize={15} fontWeight={700}>
              ORDERS V2 CAPTURED
            </text>
            <text x={0} y={25} textAnchor="middle" fill="#FFD244" fontFamily={MONO} fontSize={26} fontWeight={800}>
              $265.00 OK
            </text>
          </g>
        )}

        {/* Pip & Vaulty Operating the Lab */}
        <PipAgentRig
          x={320}
          y={745}
          scale={1.2}
          mouthOpen={pipMouth}
          mood={secondBeat ? "happy" : "curious"}
          gesture={secondBeat ? "cheer" : "point"}
        />
        <VaultyGuardianRig
          x={1590}
          y={735}
          scale={1.24}
          flipX
          mouthOpen={vaultyMouth}
          gateState={secondBeat ? "approved" : "blocked"}
          gesture={secondBeat ? "stamp" : "halt"}
        />
      </svg>
    </ParallaxWorld>
  );
};

/* ============================================================================
   ACT 4: 5 EVERYDAY FEATURES & INTERACTIVE CALCULATORS (#180A59 / #33B9D7 / #ED4BA4)
   ============================================================================ */
const Act4EverydayFeatures: React.FC<{
  durationInFrames: number;
  activeScene: SceneRecord;
  globalFrame: number;
}> = ({ durationInFrames, activeScene, globalFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const secondBeat = frame >= durationInFrames * 0.52;

  const sceneSec = (globalFrame - activeScene.start_frame) / fps;
  const isAlex = activeScene.speaker === "alex";
  const pipMouth = getMouthOpenness(
    sceneSec,
    activeScene.voice_offset_sec,
    activeScene.words,
    isAlex
  );
  const vaultyMouth = getMouthOpenness(
    sceneSec,
    activeScene.voice_offset_sec,
    activeScene.words,
    !isAlex
  );

  const leftPlate = secondBeat
    ? "plates/plate-06-aggrid-ledger.png"
    : "plates/plate-04-dinner-qr-split.png";
  const rightPlate = secondBeat
    ? "plates/plate-07-schedule-sdk.png"
    : "plates/plate-05-fx-creator-split.png";

  return (
    <ParallaxWorld theme="everyday" cameraMove="pan_left" durationInFrames={durationInFrames}>
      <TopFilmHud
        actTag="ACT 04 · 5 PAYPAL TRACKS + LIVE CALCULATORS"
        actLabel="QR Dinner Split, EUR Pay Later, Dispute Shield, Solar Pool & AG Grid v36"
      />

      {/* Feature Pill Strip */}
      <div
        style={{
          position: "absolute",
          top: 98,
          left: 110,
          right: 110,
          display: "flex",
          justifyContent: "center",
          gap: 14,
          zIndex: 40,
        }}
      >
        {[
          { tag: "TRACK 02", name: "2-8 Diner + Tip QR Split", col: "#22D7DA", on: !secondBeat },
          { tag: "TRACK 03", name: "EUR/GBP/JPY + 4x Pay Later", col: "#FFD244", on: !secondBeat },
          { tag: "TRACK 04", name: "Duplicate Dispute Shield", col: "#ED4BA4", on: secondBeat },
          { tag: "TRACK 05", name: "Solar Pool + AG Grid v36", col: "#3DD68C", on: secondBeat },
        ].map((pill) => (
          <div
            key={pill.tag}
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              backgroundColor: pill.on ? "rgba(255,255,255,0.13)" : "rgba(15, 10, 48, 0.75)",
              border: `2px solid ${pill.on ? pill.col : "rgba(255,255,255,0.16)"}`,
              fontFamily: SANS,
              fontSize: 17,
              fontWeight: 700,
              color: pill.on ? "#FFFFFF" : "#94A3B8",
            }}
          >
            <span style={{ fontFamily: MONO, color: pill.col, marginRight: 8 }}>
              {pill.tag}
            </span>
            {pill.name}
          </div>
        ))}
      </div>

      {/* Side-by-Side Interactive Calculator & AG Grid Windows */}
      <div
        style={{
          position: "absolute",
          top: 178,
          left: 84,
          right: 84,
          display: "flex",
          justifyContent: "center",
          gap: 28,
          zIndex: 30,
        }}
      >
        <ProductPlateWindow
          key={leftPlate}
          src={leftPlate}
          title={
            secondBeat
              ? "AG GRID V36 LIVE SANDBOX RECONCILIATION"
              : "RECEIPT SCAN & 6-DINER PAYPAL QR CALCULATOR"
          }
          badge={secondBeat ? "AG GRID V36" : "$28.00 / PERSON"}
          badgeColor="#22D7DA"
          width={850}
          height={560}
        />
        <ProductPlateWindow
          key={rightPlate}
          src={rightPlate}
          title={
            secondBeat
              ? "MILESTONE SCHEDULE + PAYPAL MCP & APIMATIC"
              : "MULTI-CURRENCY EUR INVOICE + 4X PAY LATER"
          }
          badge={secondBeat ? "MCP + APIMATIC" : "4X $113.40"}
          badgeColor="#FFD244"
          width={850}
          height={560}
        />
      </div>

      <svg
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{ position: "absolute", inset: 0, zIndex: 45, pointerEvents: "none" }}
      >
        <PipAgentRig
          x={145}
          y={815}
          scale={0.96}
          mouthOpen={pipMouth}
          mood="happy"
          gesture="point"
        />
        <VaultyGuardianRig
          x={1775}
          y={810}
          scale={0.95}
          flipX
          mouthOpen={vaultyMouth}
          gateState="approved"
          gesture="cheer"
        />
      </svg>
    </ParallaxWorld>
  );
};

/* ============================================================================
   ACT 5: WARM ORANGE ASCIICN AGENT MOTION STUDIO (#2A1215 / #FF851D / #FFD244)
   ============================================================================ */
const Act5WarmAsciiStudio: React.FC<{
  durationInFrames: number;
  activeScene: SceneRecord;
  globalFrame: number;
}> = ({ durationInFrames, activeScene, globalFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const showDonut = frame >= durationInFrames * 0.52;

  const sceneSec = (globalFrame - activeScene.start_frame) / fps;
  const isAlex = activeScene.speaker === "alex";
  const pipMouth = getMouthOpenness(
    sceneSec,
    activeScene.voice_offset_sec,
    activeScene.words,
    isAlex
  );
  const vaultyMouth = getMouthOpenness(
    sceneSec,
    activeScene.voice_offset_sec,
    activeScene.words,
    !isAlex
  );

  return (
    <ParallaxWorld theme="warm_ascii" cameraMove="push_in" durationInFrames={durationInFrames}>
      <TopFilmHud
        actTag="ACT 05 · ASCIICN + WEB AUDIO STUDIO"
        actLabel="64 shadcn ASCII Effects · 3D Scenes · .TXT / .SVG / .PNG / .WEBM Export"
      />

      <div
        style={{
          position: "absolute",
          top: 108,
          left: 96,
          right: 96,
          display: "flex",
          gap: 30,
          alignItems: "stretch",
          height: 690,
          zIndex: 35,
        }}
      >
        {/* Left: Live 60 FPS 3D ASCII Monolith + Export Badges */}
        <div
          style={{
            width: 680,
            borderRadius: 18,
            backgroundColor: "rgba(20, 12, 16, 0.9)",
            border: "2px solid #FF851D",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "relative", zIndex: 10 }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 13,
                fontWeight: 700,
                color: "#FFD244",
                letterSpacing: "0.08em",
              }}
            >
              INTRODUCING ASCIICN INSIDE PAYTABLE
            </div>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 34,
                fontWeight: 800,
                color: "#FFFFFF",
                lineHeight: 1.15,
                marginTop: 6,
              }}
            >
              Every ASCII Effect You Want, as a shadcn Component
            </div>
          </div>

          {/* Live 60 FPS 3D ASCII Canvas Stage */}
          <div
            style={{
              position: "relative",
              height: 390,
              borderRadius: 12,
              backgroundColor: "#110B0E",
              border: "1px solid rgba(255, 210, 68, 0.35)",
              overflow: "hidden",
            }}
          >
            <AsciiShaderBackdrop
              mode={showDonut ? "donut" : "globe"}
              width={632}
              height={390}
              cellSize={13}
              primaryColor="#FFD244"
              secondaryColor="#FF851D"
              opacity={0.95}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              position: "relative",
              zIndex: 10,
            }}
          >
            {[
              "64 SHADCN COMPONENTS",
              "EXPORT .TXT / .SVG / .PNG / .WEBM",
              "ONE PROMPT TEACHES YOUR AGENT",
            ].map((tag, idx) => (
              <span
                key={tag}
                style={{
                  padding: "7px 12px",
                  borderRadius: 8,
                  backgroundColor: idx === 2 ? "#FFD244" : "rgba(255, 133, 29, 0.18)",
                  color: idx === 2 ? "#141412" : "#FFD244",
                  fontFamily: MONO,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Real Captured Tab [04] Launch & ASCII Studio Plate */}
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <ProductPlateWindow
            src="plates/plate-08-ascii-studio.png"
            title="TAB [04] · LAUNCH & ASCIICN STUDIO + .MCP.JSON AGENT SKILL"
            badge="ELEVENLABS + PAYPAL MCP"
            badgeColor="#FF851D"
            width={1010}
            height={688}
          />
        </div>
      </div>

      <svg
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{ position: "absolute", inset: 0, zIndex: 45, pointerEvents: "none" }}
      >
        <PipAgentRig
          x={120}
          y={830}
          scale={0.95}
          mouthOpen={pipMouth}
          mood="happy"
          gesture="cheer"
        />
        <VaultyGuardianRig
          x={1800}
          y={825}
          scale={0.94}
          flipX
          mouthOpen={vaultyMouth}
          gateState="approved"
          gesture="point"
        />
      </svg>
    </ParallaxWorld>
  );
};

/* ============================================================================
   ACT 6: FINAL HERO COMPOSITION & CALL TO ACTION (#09134B / #141412 / #FFD244)
   ============================================================================ */
const Act6HeroCta: React.FC<{
  durationInFrames: number;
  activeScene: SceneRecord;
  globalFrame: number;
}> = ({ durationInFrames, activeScene, globalFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  const sceneSec = (globalFrame - activeScene.start_frame) / fps;
  const isAlex = activeScene.speaker === "alex";
  const pipMouth = getMouthOpenness(
    sceneSec,
    activeScene.voice_offset_sec,
    activeScene.words,
    isAlex
  );
  const vaultyMouth = getMouthOpenness(
    sceneSec,
    activeScene.voice_offset_sec,
    activeScene.words,
    !isAlex
  );

  return (
    <ParallaxWorld theme="hero_cta" cameraMove="pull_back" durationInFrames={durationInFrames}>
      <TopFilmHud
        actTag="OPEN SOURCE MIT · READY TO RUN"
        actLabel="PayPal AI Hackathon · Linked Agent Wallets + Rust + Sodium + asciicn"
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 60,
          zIndex: 35,
          transform: `scale(${0.93 + 0.07 * pop})`,
        }}
      >
        {/* Geometric PayTable Mark */}
        <div
          style={{
            width: 86,
            height: 86,
            borderRadius: 18,
            backgroundColor: "#141412",
            border: "3px solid #FFD244",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 22,
            boxShadow: "0 18px 50px rgba(255, 210, 68, 0.28)",
          }}
        >
          <svg width={52} height={52} viewBox="0 0 28 28">
            <rect x={3} y={3} width={12} height={12} fill="#FFD244" />
            <rect
              x={13}
              y={13}
              width={12}
              height={12}
              fill="none"
              stroke="#22D7DA"
              strokeWidth={2.5}
            />
          </svg>
        </div>

        <div
          style={{
            fontFamily: SANS,
            fontSize: 92,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            color: "#FFFFFF",
            lineHeight: 1.0,
          }}
        >
          PayTable
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 30,
            fontWeight: 600,
            color: "#E2E8F0",
            marginTop: 16,
            maxWidth: 980,
            textAlign: "center",
          }}
        >
          Linked PayPal Wallets for AI Agents, With{" "}
          <span style={{ color: "#FFD244" }}>Human Approval on Every Purchase</span>
        </div>

        {/* CTA Repository Pill */}
        <div
          style={{
            marginTop: 34,
            padding: "16px 34px",
            borderRadius: 14,
            backgroundColor: "#FFD244",
            color: "#09134B",
            fontFamily: MONO,
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "0.02em",
            boxShadow: "0 20px 55px rgba(255, 210, 68, 0.35)",
          }}
        >
          github.com/harrymove-ctrl/paytable
        </div>

        <div
          style={{
            marginTop: 22,
            display: "flex",
            gap: 14,
            fontFamily: MONO,
            fontSize: 14,
            color: "#94A3B8",
          }}
        >
          <span>PAYPAL SANDBOX V2</span>
          <span>·</span>
          <span>RUST AXUM VAULT</span>
          <span>·</span>
          <span>SODIUM + ASCIICN</span>
          <span>·</span>
          <span>2-VOICE LAUNCH STUDIO</span>
        </div>
      </div>

      <svg
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{ position: "absolute", inset: 0, zIndex: 40, pointerEvents: "none" }}
      >
        <PipAgentRig
          x={290}
          y={675}
          scale={1.32}
          mouthOpen={pipMouth}
          mood="happy"
          gesture="cheer"
        />
        <VaultyGuardianRig
          x={1630}
          y={670}
          scale={1.28}
          flipX
          mouthOpen={vaultyMouth}
          gateState="approved"
          gesture="cheer"
        />
      </svg>
    </ParallaxWorld>
  );
};

/* ============================================================================
   ROOT COMPOSITIONS: MASTER (92.0s @ 60FPS) & SOCIAL LAUNCH (58.0s @ 60FPS)
   ============================================================================ */
export const PayTableMasterFilm: React.FC = () => {
  useSodiumFonts();
  const frame = useCurrentFrame();
  const scenes = manifest.master_scenes as unknown as SceneRecord[];
  const activeScene = findActiveScene(scenes, frame);

  return (
    <AbsoluteFill style={{ backgroundColor: "#09134B" }}>
      <Audio src={staticFile("audio/master-mix.wav")} />

      {/* Act 1: 0s..18s (frames 0..1080) */}
      <Sequence from={0} durationInFrames={1080}>
        <Act1CosmicOpening
          durationInFrames={1080}
          activeScene={activeScene}
          globalFrame={frame}
        />
      </Sequence>

      {/* Act 2: 18s..42s (frames 1080..2520) */}
      <Sequence from={1080} durationInFrames={1440}>
        <Act2GuidedSteps
          durationInFrames={1440}
          activeScene={activeScene}
          globalFrame={frame}
        />
      </Sequence>

      {/* Act 3: 42s..58s (frames 2520..3480) */}
      <Sequence from={2520} durationInFrames={960}>
        <Act3RustLaboratory
          durationInFrames={960}
          activeScene={activeScene}
          globalFrame={frame}
        />
      </Sequence>

      {/* Act 4: 58s..72s (frames 3480..4320) */}
      <Sequence from={3480} durationInFrames={840}>
        <Act4EverydayFeatures
          durationInFrames={840}
          activeScene={activeScene}
          globalFrame={frame}
        />
      </Sequence>

      {/* Act 5: 72s..84s (frames 4320..5040) */}
      <Sequence from={4320} durationInFrames={720}>
        <Act5WarmAsciiStudio
          durationInFrames={720}
          activeScene={activeScene}
          globalFrame={frame}
        />
      </Sequence>

      {/* Act 6: 84s..92s (frames 5040..5520) */}
      <Sequence from={5040} durationInFrames={480}>
        <Act6HeroCta
          durationInFrames={480}
          activeScene={activeScene}
          globalFrame={frame}
        />
      </Sequence>

      {/* Varied Kurzgesagt Transitions Across Act Seams */}
      <ActTransitionOverlay
        triggerFrames={[
          { frame: 1080, kind: "color_wipe" },
          { frame: 2520, kind: "whip_pan" },
          { frame: 3480, kind: "portal_iris" },
          { frame: 4320, kind: "diagonal_shutter" },
          { frame: 5040, kind: "color_wipe" },
        ]}
      />

      {/* Persistent Dual-Voice Host Pill + Word-Synced Subtitle Bar */}
      <DualHostDialogueBar scene={activeScene} globalFrame={frame} />
    </AbsoluteFill>
  );
};

export const PayTableLaunchFilm: React.FC = () => {
  useSodiumFonts();
  const frame = useCurrentFrame();
  const scenes = manifest.launch_scenes as unknown as SceneRecord[];
  const activeScene = findActiveScene(scenes, frame);

  return (
    <AbsoluteFill style={{ backgroundColor: "#09134B" }}>
      <Audio src={staticFile("audio/launch-mix.wav")} />

      {/* Act 1: 0..468 */}
      <Sequence from={0} durationInFrames={468}>
        <Act1CosmicOpening
          durationInFrames={468}
          activeScene={activeScene}
          globalFrame={frame}
        />
      </Sequence>

      {/* Act 2: 468..1020 */}
      <Sequence from={468} durationInFrames={552}>
        <Act2GuidedSteps
          durationInFrames={552}
          activeScene={activeScene}
          globalFrame={frame}
        />
      </Sequence>

      {/* Act 3: 1020..1530 */}
      <Sequence from={1020} durationInFrames={510}>
        <Act3RustLaboratory
          durationInFrames={510}
          activeScene={activeScene}
          globalFrame={frame}
        />
      </Sequence>

      {/* Act 4: 1530..2100 */}
      <Sequence from={1530} durationInFrames={570}>
        <Act4EverydayFeatures
          durationInFrames={570}
          activeScene={activeScene}
          globalFrame={frame}
        />
      </Sequence>

      {/* Act 5: 2100..2640 */}
      <Sequence from={2100} durationInFrames={540}>
        <Act5WarmAsciiStudio
          durationInFrames={540}
          activeScene={activeScene}
          globalFrame={frame}
        />
      </Sequence>

      {/* Act 6: 2640..3480 */}
      <Sequence from={2640} durationInFrames={840}>
        <Act6HeroCta
          durationInFrames={840}
          activeScene={activeScene}
          globalFrame={frame}
        />
      </Sequence>

      <ActTransitionOverlay
        triggerFrames={[
          { frame: 468, kind: "color_wipe" },
          { frame: 1020, kind: "whip_pan" },
          { frame: 1530, kind: "portal_iris" },
          { frame: 2100, kind: "diagonal_shutter" },
          { frame: 2640, kind: "color_wipe" },
        ]}
      />

      <DualHostDialogueBar scene={activeScene} globalFrame={frame} />
    </AbsoluteFill>
  );
};
