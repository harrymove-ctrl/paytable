import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

/**
 * Computes normalized mouth openness (0..1) from exact scene-relative word timings
 * so rigged character beaks/mouths articulate syllables naturally at 60 FPS.
 */
export function getMouthOpenness(
  sceneTimeSec: number,
  voiceOffsetSec: number,
  words: WordTiming[] | undefined,
  isSpeaking: boolean
): number {
  if (!isSpeaking || !words || words.length === 0) return 0;
  const rel = sceneTimeSec - voiceOffsetSec;
  if (rel < -0.02) return 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (rel >= w.start - 0.02 && rel <= w.end + 0.03) {
      const span = Math.max(0.06, w.end - w.start);
      const u = Math.max(0, Math.min(1, (rel - w.start) / span));
      // Multi-syllable flutter for longer words
      const syllables = Math.max(1, Math.min(3, Math.round(w.word.length / 3.2)));
      const env = Math.sin(Math.PI * u);
      const syllableWave = 0.55 + 0.45 * Math.abs(Math.sin(Math.PI * syllables * u));
      return Math.min(1, env * syllableWave);
    }
  }
  return 0;
}

export type CharacterGesture = "idle" | "point" | "cheer" | "halt" | "stamp";

interface PipProps {
  x: number;
  y: number;
  scale?: number;
  flipX?: boolean;
  mouthOpen?: number;
  gesture?: CharacterGesture;
  mood?: "curious" | "happy" | "alert";
  enterDelayFrames?: number;
}

/**
 * Pip: Original Kurzgesagt-inspired geometric Courier Orb-Finch agent.
 * Separate rigged SVG parts: Shadow, Legs, Body (squash & stretch), BackWing,
 * Head (+/- 3..8 deg rotation), Eyes + Eyelids (blinking every ~3.1s), Beak (word-synced), FrontWing.
 */
export const PipAgentRig: React.FC<PipProps> = ({
  x,
  y,
  scale = 1,
  flipX = false,
  mouthOpen = 0,
  gesture = "idle",
  mood = "curious",
  enterDelayFrames = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = Math.max(0, frame - enterDelayFrames);

  // Anticipation + spring entrance with overshoot
  const pop = spring({
    frame: localFrame,
    fps,
    config: { damping: 11, stiffness: 150, mass: 0.8 },
  });

  // Idle 60fps breathing & subtle bounce
  const t = frame / fps;
  const talkPulse = mouthOpen * 0.045;
  const bobY = Math.sin(t * Math.PI * 2.1) * 5 - mouthOpen * 4;
  const squashX = 1 + Math.sin(t * Math.PI * 2.1 + Math.PI) * 0.025 + talkPulse;
  const stretchY = 1 + Math.sin(t * Math.PI * 2.1) * 0.028 - talkPulse * 0.6;

  // Head tilt (+/- 3 to 7 degrees) + secondary follow-through
  const headRot =
    Math.sin(t * 2.4 - 0.35) * 4.5 +
    (mood === "curious" ? -3.5 : mood === "alert" ? 4.0 : 1.5) +
    mouthOpen * -2.8;

  // Natural blink every 186 frames (~3.1s) lasting 8 frames
  const blinkCycle = (frame + 37) % 186;
  const eyeClose =
    blinkCycle < 8
      ? interpolate(blinkCycle, [0, 4, 8], [0, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  // Wing rotation with 4-frame follow-through lag
  const tLag = (frame - 4) / fps;
  const baseWing = Math.sin(tLag * 3.2) * 8;
  const frontWingRot =
    gesture === "point"
      ? -48 + Math.sin(t * 5.0) * 6
      : gesture === "cheer"
      ? -68 + Math.sin(t * 8.0) * 14
      : gesture === "halt"
      ? -32
      : 14 + baseWing;

  const backWingRot =
    gesture === "cheer"
      ? 58 - Math.sin(t * 8.0) * 14
      : gesture === "point"
      ? 24 + baseWing * 0.6
      : -16 - baseWing * 0.7;

  const beakAngle = mouthOpen * 18;
  const dirScale = flipX ? -scale : scale;
  const entryY = interpolate(pop, [0, 1], [65, 0], { easing: Easing.out(Easing.cubic) });

  return (
    <g
      transform={`translate(${x}, ${y + entryY}) scale(${dirScale * pop}, ${scale * pop})`}
      style={{ opacity: Math.min(1, pop * 1.4) }}
    >
      {/* Ground Contact Shadow */}
      <ellipse
        cx={0}
        cy={106}
        rx={52 * (1 - bobY * 0.008)}
        ry={12}
        fill="rgba(5, 10, 32, 0.42)"
      />

      {/* Legs */}
      <g stroke="#FF851D" strokeWidth={6.5} strokeLinecap="round" fill="none">
        <path d="M -16 68 L -18 98 M -28 99 L -8 99" />
        <path d="M 16 68 L 18 98 M 8 99 L 28 99" />
      </g>

      {/* Animated Upper Rig with Bob + Squash & Stretch */}
      <g transform={`translate(0, ${bobY}) scale(${squashX}, ${stretchY})`}>
        {/* Back Wing */}
        <g transform={`translate(34, 8) rotate(${backWingRot})`}>
          <path
            d="M 0 0 C 34 -14, 54 14, 34 44 C 18 54, 2 38, 0 18 Z"
            fill="#0E9CA8"
          />
        </g>

        {/* Rounded Geometric Capsule-Orb Body */}
        <path
          d="M -56 12 C -56 -36, 56 -36, 56 12 C 56 56, 36 78, 0 78 C -36 78, -56 56, -56 12 Z"
          fill="#22D7DA"
        />
        {/* Warm Belly Patch */}
        <path
          d="M -34 22 C -34 -6, 34 -6, 34 22 C 34 52, 20 68, 0 68 C -20 68, -34 52, -34 22 Z"
          fill="#9CF4F5"
        />
        {/* Linked Wallet Badge on Chest */}
        <g transform="translate(0, 36)">
          <rect x={-16} y={-12} width={32} height={24} rx={7} fill="#09134B" />
          <rect x={-10} y={-6} width={9} height={9} rx={2} fill="#FFD244" />
          <circle cx={6} cy={2} r={4.5} fill="#22D7DA" />
        </g>

        {/* Articulated Head Group */}
        <g transform={`translate(0, -34) rotate(${headRot})`}>
          {/* Crest Plume (Secondary motion) */}
          <g transform={`translate(-6, -46) rotate(${Math.sin(tLag * 4.2) * 9})`}>
            <circle cx={0} cy={-10} r={9} fill="#FFD244" />
            <path d="M -4 4 L 0 -10 L 5 4 Z" fill="#FF851D" />
          </g>

          {/* Head Sphere */}
          <circle cx={0} cy={-12} r={42} fill="#22D7DA" />
          {/* Rim Highlight */}
          <path
            d="M -30 -32 A 36 36 0 0 1 24 -36"
            stroke="#AEF9FA"
            strokeWidth={5}
            strokeLinecap="round"
            fill="none"
          />

          {/* Expressive Eyes + Blinking Eyelids */}
          {[-14, 18].map((ex, idx) => (
            <g key={idx} transform={`translate(${ex}, -16)`}>
              <circle cx={0} cy={0} r={10.5} fill="#FFFFFF" />
              <circle
                cx={mood === "alert" ? 2.5 : 2}
                cy={mood === "happy" ? -1 : 0}
                r={5.8}
                fill="#09134B"
              />
              <circle cx={4} cy={-2.5} r={2.1} fill="#FFFFFF" />
              {/* Eyelid */}
              {eyeClose > 0.02 && (
                <rect
                  x={-11}
                  y={-11}
                  width={22}
                  height={22 * eyeClose}
                  rx={6}
                  fill="#0E9CA8"
                />
              )}
              {mood === "happy" && eyeClose < 0.2 && (
                <path
                  d="M -10 8 Q 0 3 10 8"
                  stroke="#22D7DA"
                  strokeWidth={4}
                  fill="none"
                />
              )}
            </g>
          ))}

          {/* Word-Synced Two-Part Geometric Beak */}
          <g transform="translate(28, -4)">
            {/* Mouth Cavity */}
            {mouthOpen > 0.06 && (
              <ellipse
                cx={6}
                cy={3}
                rx={9}
                ry={Math.max(2, mouthOpen * 9.5)}
                fill="#7C193D"
              />
            )}
            {/* Upper Beak */}
            <g transform={`rotate(${-beakAngle * 0.65})`}>
              <path
                d="M -4 -7 L 24 0 L -4 3 Z"
                fill="#FFD244"
                stroke="#FF851D"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            </g>
            {/* Lower Beak */}
            <g transform={`translate(0, 2) rotate(${beakAngle})`}>
              <path
                d="M -4 0 L 20 2 L -4 8 Z"
                fill="#FF851D"
              />
            </g>
          </g>
        </g>

        {/* Front Wing (Articulated around shoulder) */}
        <g transform={`translate(-36, 6) rotate(${frontWingRot})`}>
          <path
            d="M 0 0 C -36 10, -44 46, -16 56 C 4 62, 16 36, 8 10 Z"
            fill="#14B8C4"
            stroke="#9CF4F5"
            strokeWidth={2}
          />
        </g>
      </g>
    </g>
  );
};

interface VaultyProps {
  x: number;
  y: number;
  scale?: number;
  flipX?: boolean;
  mouthOpen?: number;
  gateState?: "armed" | "blocked" | "approved";
  gesture?: CharacterGesture;
  enterDelayFrames?: number;
}

/**
 * Vaulty: Original Kurzgesagt-inspired Octagonal Rust Vault Guardian.
 * Separate rigged SVG parts: Shadow, Hover Thrusters, Chamfered Octagon Torso with
 * animated PayPal Mandate Dial, Articulated Left & Right Arms, Visor Head, Blinking LED Eyes,
 * and Word-Synced Voice Grille.
 */
export const VaultyGuardianRig: React.FC<VaultyProps> = ({
  x,
  y,
  scale = 1,
  flipX = false,
  mouthOpen = 0,
  gateState = "armed",
  gesture = "idle",
  enterDelayFrames = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = Math.max(0, frame - enterDelayFrames);

  const pop = spring({
    frame: localFrame,
    fps,
    config: { damping: 12, stiffness: 140, mass: 0.9 },
  });

  const t = frame / fps;
  const hoverY = Math.sin(t * Math.PI * 1.7 + 0.8) * 6 - mouthOpen * 3;
  const headTilt = Math.sin(t * 2.0) * 3.5 + (gateState === "blocked" ? -4 : 2);

  const blinkCycle = (frame + 91) % 210;
  const eyeClose =
    blinkCycle < 8
      ? interpolate(blinkCycle, [0, 4, 8], [0, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  const coreColor =
    gateState === "approved"
      ? "#3DD68C"
      : gateState === "blocked"
      ? "#FF4D6D"
      : "#FF851D";

  const leftArmRot =
    gesture === "halt"
      ? -62 + Math.sin(t * 6) * 5
      : gesture === "cheer"
      ? -72 + Math.sin(t * 7) * 12
      : 18 + Math.sin(t * 2.5) * 7;

  const rightArmRot =
    gesture === "stamp"
      ? -44 + Math.sin(t * 8) * 16
      : gesture === "point"
      ? -52 + Math.sin(t * 4) * 6
      : gesture === "cheer"
      ? 70 - Math.sin(t * 7) * 12
      : -18 - Math.sin(t * 2.5) * 7;

  const dirScale = flipX ? -scale : scale;
  const entryY = interpolate(pop, [0, 1], [70, 0], { easing: Easing.out(Easing.cubic) });

  return (
    <g
      transform={`translate(${x}, ${y + entryY}) scale(${dirScale * pop}, ${scale * pop})`}
      style={{ opacity: Math.min(1, pop * 1.4) }}
    >
      {/* Ground Hover Shadow */}
      <ellipse
        cx={0}
        cy={114}
        rx={58 * (1 - hoverY * 0.007)}
        ry={13}
        fill="rgba(5, 10, 32, 0.45)"
      />

      <g transform={`translate(0, ${hoverY})`}>
        {/* Hover Thruster Glow */}
        <ellipse
          cx={0}
          cy={88}
          rx={26 + Math.sin(t * 14) * 4}
          ry={8}
          fill={coreColor}
          opacity={0.55}
        />

        {/* Left Arm */}
        <g transform={`translate(-60, 4) rotate(${leftArmRot})`}>
          <rect x={-16} y={-8} width={18} height={50} rx={9} fill="#1A2C9B" />
          <circle cx={-7} cy={44} r={12} fill="#FFD244" />
        </g>

        {/* Right Arm */}
        <g transform={`translate(60, 4) rotate(${rightArmRot})`}>
          <rect x={-2} y={-8} width={18} height={50} rx={9} fill="#1A2C9B" />
          <circle cx={7} cy={44} r={12} fill={coreColor} />
        </g>

        {/* Octagonal Rounded Vault Body */}
        <rect
          x={-58}
          y={-28}
          width={116}
          height={108}
          rx={28}
          fill="#243CDB"
          stroke="#5B78FF"
          strokeWidth={4}
        />

        {/* Rotating Vault Mandate Dial Core */}
        <g transform={`translate(0, 26) rotate(${frame * (gateState === "approved" ? 1.8 : 0.6)})`}>
          <circle cx={0} cy={0} r={30} fill="#09134B" stroke={coreColor} strokeWidth={5} />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <line
              key={deg}
              x1={0}
              y1={-20}
              x2={0}
              y2={-28}
              stroke={coreColor}
              strokeWidth={3.5}
              strokeLinecap="round"
              transform={`rotate(${deg})`}
            />
          ))}
        </g>
        <circle cx={0} cy={26} r={12 + mouthOpen * 2.5} fill={coreColor} />

        {/* Articulated Visor Head */}
        <g transform={`translate(0, -54) rotate(${headTilt})`}>
          {/* Antenna */}
          <line x1={0} y1={-32} x2={0} y2={-48} stroke="#5B78FF" strokeWidth={5} strokeLinecap="round" />
          <circle cx={0} cy={-52} r={8} fill={coreColor} />

          {/* Rounded Visor Helmet */}
          <rect
            x={-48}
            y={-34}
            width={96}
            height={58}
            rx={22}
            fill="#324DF0"
            stroke="#7B93FF"
            strokeWidth={3}
          />
          {/* Dark Glass Faceplate */}
          <rect x={-38} y={-24} width={76} height={38} rx={14} fill="#09134B" />

          {/* LED Eyes */}
          {[-16, 16].map((ex, idx) => (
            <g key={idx} transform={`translate(${ex}, -10)`}>
              <rect
                x={-8}
                y={-7}
                width={16}
                height={Math.max(2, 14 * (1 - eyeClose))}
                rx={5}
                fill={gateState === "blocked" ? "#FF4D6D" : "#FFD244"}
              />
            </g>
          ))}

          {/* Word-Synced Geometric Voice Equalizer Mouth */}
          <g transform="translate(0, 7)">
            {[-12, -4, 4, 12].map((bx, i) => {
              const barH = 3 + mouthOpen * (i === 1 || i === 2 ? 11 : 7);
              return (
                <rect
                  key={i}
                  x={bx - 2.2}
                  y={-barH / 2}
                  width={4.4}
                  height={barH}
                  rx={2}
                  fill="#22D7DA"
                />
              );
            })}
          </g>
        </g>
      </g>
    </g>
  );
};
