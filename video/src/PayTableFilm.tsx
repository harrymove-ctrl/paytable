import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  continueRender,
  delayRender,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import manifest from "./scene-manifest.json";

const C = {
  page: "#141412",
  panel: "#1c1b19",
  well: "#22211e",
  line: "#2c2a25",
  lineControl: "#736d61",
  text1: "#f5f3ee",
  text2: "#c4c0b6",
  text3: "#a19c90",
  accent: "#ffd400",
  primaryBg: "#3a3107",
  warn: "#ff9a52",
  warnTint: "#33200f",
  ok: "#8cc79a",
  okTint: "#17271b",
  fail: "#ff6b57",
};

const MONO = '"Commit Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = '"Inter Display", -apple-system, BlinkMacSystemFont, sans-serif';

function useSodiumFonts() {
  const [handle] = useState(() => delayRender("Loading Sodium woff2 fonts"));
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
    load();
    return () => {
      cancelled = true;
    };
  }, [handle]);
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function SodiumTopChrome({
  stepCode,
  stepLabel,
  settledUsd,
}: {
  stepCode: string;
  stepLabel: string;
  settledUsd: number;
}) {
  const frame = useCurrentFrame();
  const pulse = Math.floor(frame / 8) % 4;
  return (
    <div
      style={{
        position: "absolute",
        top: 38,
        left: 72,
        right: 72,
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        border: `1px solid ${C.line}`,
        backgroundColor: C.panel,
        padding: "0 20px",
        fontFamily: MONO,
        fontSize: 14,
        letterSpacing: "0.06em",
        color: C.text2,
        zIndex: 30,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 18,
            height: 18,
            border: `1px solid ${C.lineControl}`,
            position: "relative",
            backgroundColor: C.page,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 2,
              left: 2,
              width: 7,
              height: 7,
              backgroundColor: C.accent,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 7,
              height: 7,
              border: `1.5px solid ${C.text1}`,
            }}
          />
        </div>
        <span style={{ color: C.text1 }}>PAYTABLE</span>
        <span style={{ color: C.lineControl }}>/</span>
        <span style={{ color: C.accent }}>[{stepCode}]</span>
        <span>{stepLabel.toUpperCase()}</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              style={{
                width: 5,
                height: 5,
                backgroundColor: idx === pulse ? C.accent : C.lineControl,
              }}
            />
          ))}
          <span style={{ marginLeft: 4 }}>GATE: EVERY PURCHASE</span>
        </div>
        <span style={{ color: C.ok }}>
          SETTLED ${settledUsd.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function CaptionBar({
  index,
  caption,
}: {
  index: string;
  caption: string;
}) {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        position: "absolute",
        bottom: 36,
        left: 72,
        right: 72,
        minHeight: 54,
        border: `1px solid ${C.line}`,
        backgroundColor: "rgba(20, 20, 18, 0.94)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "10px 22px",
        opacity: enter,
        transform: `translateY(${(1 - enter) * 8}px)`,
        zIndex: 40,
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: 13,
          color: C.accent,
          letterSpacing: "0.08em",
          flexShrink: 0,
        }}
      >
        [{index}]
      </span>
      <span
        style={{
          fontFamily: SANS,
          fontSize: 22,
          color: C.text1,
          letterSpacing: "-0.01em",
        }}
      >
        {caption}
      </span>
    </div>
  );
}

/** Scene 01: Cinetic Centered Statement Hook */
function SceneHook({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const lineWipe = interpolate(frame, [0, 28], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const beat1 = interpolate(frame, [8, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const beat2 = interpolate(frame, [52, 74], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const beat3 = interpolate(frame, [118, 142], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const drift = interpolate(frame, [0, duration], [1, 1.022]);

  return (
    <AbsoluteFill style={{ backgroundColor: C.page }}>
      <SodiumTopChrome
        stepCode="01"
        stepLabel="Linked Agent Wallets"
        settledUsd={408}
      />

      {/* Carried horizontal Sodium rule */}
      <div
        style={{
          position: "absolute",
          top: 540,
          left: 72,
          width: `${lineWipe * 1776}px`,
          height: 1,
          backgroundColor: C.line,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: "120px 140px 120px 140px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          gap: 28,
          transform: `scale(${drift})`,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 16,
            letterSpacing: "0.14em",
            color: C.text3,
            opacity: beat1,
          }}
        >
          PAYPAL DEVELOPER SANDBOX · LINKED AGENT WALLETS
        </div>

        <div
          style={{
            fontFamily: SANS,
            fontSize: 68,
            lineHeight: 1.08,
            letterSpacing: "-0.025em",
            color: C.text1,
            maxWidth: 1380,
            opacity: beat1,
            transform: `translateY(${(1 - beat1) * 18}px)`,
          }}
        >
          PayPal just opened a huge door.
        </div>

        <div
          style={{
            fontFamily: SANS,
            fontSize: 44,
            lineHeight: 1.22,
            letterSpacing: "-0.015em",
            color: C.text2,
            maxWidth: 1280,
            opacity: beat2,
            transform: `translateY(${(1 - beat2) * 16}px)`,
          }}
        >
          New linked wallets mean an AI agent can spend on your behalf,
        </div>

        <div
          style={{
            marginTop: 8,
            padding: "16px 34px",
            backgroundColor: C.primaryBg,
            border: `1.5px solid ${C.accent}`,
            fontFamily: MONO,
            fontSize: 28,
            letterSpacing: "0.09em",
            color: C.accent,
            opacity: beat3,
            transform: `translateY(${(1 - beat3) * 14}px)`,
          }}
        >
          WITH APPROVAL ON EVERY PURCHASE
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Scene 02: Live Tabletop Plate + @paytable Prompt Entry */
function SceneTabletopPrompt({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const push = interpolate(frame, [0, duration], [1.0, 1.036], {
    easing: Easing.inOut(Easing.quad),
  });
  const promptText =
    "@paytable Source Dell UltraSharp 27 USB-C Monitor under $320, negotiate A2A quote, and hold linked wallet for my approval";
  const typedChars = Math.floor(
    interpolate(frame, [12, 145], [0, promptText.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  return (
    <AbsoluteFill style={{ backgroundColor: C.page }}>
      <SodiumTopChrome
        stepCode="02"
        stepLabel="Collaborative @paytable Canvas"
        settledUsd={408}
      />

      <div
        style={{
          position: "absolute",
          top: 108,
          left: 72,
          right: 72,
          bottom: 196,
          border: `1px solid ${C.line}`,
          overflow: "hidden",
          backgroundColor: C.panel,
        }}
      >
        <Img
          src={staticFile("plates/plate-01-awaiting-approval.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            transform: `scale(${push})`,
          }}
        />
      </div>

      {/* Highlighted live @paytable composer strip */}
      <div
        style={{
          position: "absolute",
          bottom: 108,
          left: 72,
          right: 72,
          height: 68,
          backgroundColor: C.panel,
          border: `1px solid ${C.accent}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          gap: 20,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 19,
            color: C.text1,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {promptText.slice(0, typedChars)}
          <span
            style={{
              display: "inline-block",
              width: 9,
              height: 20,
              marginLeft: 3,
              verticalAlign: "middle",
              backgroundColor: frame % 16 < 9 ? C.accent : "transparent",
            }}
          />
        </div>
        <div
          style={{
            padding: "8px 18px",
            border: `1px solid ${C.lineControl}`,
            backgroundColor: C.well,
            fontFamily: MONO,
            fontSize: 14,
            color: C.accent,
            letterSpacing: "0.08em",
            flexShrink: 0,
          }}
        >
          USD $265.00 · STAGE INTENT
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Scene 03: Macro Sodium ToolCallStack + Orange Needs Approval Gate */
function SceneMacroSodiumGate({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const steps = [
    {
      label: "VERIFY WALLET",
      detail: "wlt_agent_linked_01 · Visa *1881 · single cap $500.00",
      time: "280ms",
      at: 10,
      state: "done" as const,
    },
    {
      label: "SEARCH CATALOG",
      detail: 'channel3.search("Dell UltraSharp 27 USB-C Hub Monitor")',
      time: "640ms",
      at: 62,
      state: "done" as const,
    },
    {
      label: "NEGOTIATE QUOTE",
      detail: "a2a.counter_offer($310.00 -> $265.00 · Dell Direct Desk)",
      time: "920ms",
      at: 118,
      state: "done" as const,
    },
    {
      label: "APPROVE PURCHASE",
      detail: "paypal.linked_wallet.authorize($265.00)",
      time: "PAUSED",
      at: 178,
      state: "waiting" as const,
    },
    {
      label: "SETTLE ORDER",
      detail: "POST /v2/checkout/orders + /v1/shipping/trackers-batch",
      time: "",
      at: 215,
      state: "queued" as const,
    },
  ];

  const drift = interpolate(frame, [0, duration], [1.0, 1.018]);

  return (
    <AbsoluteFill style={{ backgroundColor: C.page }}>
      <SodiumTopChrome
        stepCode="03"
        stepLabel="Human Approval Gate"
        settledUsd={408}
      />

      <div
        style={{
          position: "absolute",
          top: 116,
          left: 110,
          right: 110,
          bottom: 112,
          display: "grid",
          gridTemplateColumns: "0.92fr 1.08fr",
          gap: 36,
          alignItems: "center",
          transform: `scale(${drift})`,
        }}
      >
        {/* Left: Sodium Run Summary Frame */}
        <div
          style={{
            border: `1px solid ${C.line}`,
            backgroundColor: C.panel,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              height: 52,
              padding: "0 22px",
              borderBottom: `1px solid ${C.line}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: MONO,
              fontSize: 17,
            }}
          >
            <span style={{ color: C.text1 }}>linked-wallet-checkout</span>
            <span style={{ color: C.warn, fontSize: 14, letterSpacing: "0.08em" }}>
              PAUSED ON OWNER · 1.9s
            </span>
          </div>

          <div style={{ padding: 22, borderBottom: `1px solid ${C.line}` }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: MONO,
                fontSize: 14,
                color: C.text2,
                marginBottom: 12,
              }}
            >
              <span>VERIFICATION GATES</span>
              <span style={{ color: C.warn }}>HUMAN GATE 3 / 5</span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: 30 }).map((_, idx) => {
                const filled = idx < 18;
                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: 12,
                      backgroundColor: filled ? C.warn : C.line,
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              fontFamily: MONO,
            }}
          >
            <div
              style={{
                padding: 20,
                borderRight: `1px solid ${C.line}`,
                borderBottom: `1px solid ${C.line}`,
              }}
            >
              <div style={{ fontSize: 13, color: C.text2 }}>NEGOTIATED</div>
              <div style={{ fontSize: 30, color: C.text1, marginTop: 4 }}>
                $265.00
              </div>
            </div>
            <div
              style={{
                padding: 20,
                borderBottom: `1px solid ${C.line}`,
              }}
            >
              <div style={{ fontSize: 13, color: C.text2 }}>LIST SAVINGS</div>
              <div style={{ fontSize: 30, color: C.ok, marginTop: 4 }}>
                -$45.00
              </div>
            </div>
            <div style={{ padding: 20, borderRight: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 13, color: C.text2 }}>POLICY CAP</div>
              <div style={{ fontSize: 22, color: C.text1, marginTop: 4 }}>
                $500.00 max
              </div>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 13, color: C.text2 }}>LEFT</div>
              <div style={{ fontSize: 22, color: C.warn, marginTop: 4 }}>
                1 human gate
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "16px 22px",
              borderTop: `1px solid ${C.line}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: MONO,
              fontSize: 14,
            }}
          >
            <span style={{ color: C.text2 }}>run_91c0d4</span>
            <div
              style={{
                padding: "10px 20px",
                backgroundColor: C.primaryBg,
                border: `1.5px solid ${C.accent}`,
                color: C.accent,
                letterSpacing: "0.08em",
              }}
            >
              APPROVE $265.00 PURCHASE
            </div>
          </div>
        </div>

        {/* Right: Signature Sodium ToolCallStack */}
        <div
          style={{
            position: "relative",
            paddingLeft: 32,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Dashed spine */}
          <div
            style={{
              position: "absolute",
              left: 8,
              top: 28,
              bottom: 28,
              borderLeft: `2px dashed ${C.lineControl}`,
            }}
          />

          {steps.map((s, idx) => {
            const appear = clamp01((frame - s.at) / 16);
            const isWaiting = s.state === "waiting";
            const isQueued = s.state === "queued";
            return (
              <div
                key={idx}
                style={{
                  position: "relative",
                  opacity: appear,
                  transform: `translateX(${(1 - appear) * 18}px)`,
                }}
              >
                {/* Connector elbow */}
                <div
                  style={{
                    position: "absolute",
                    left: -24,
                    top: 26,
                    width: 24,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      borderTop: `2px dashed ${C.lineControl}`,
                    }}
                  />
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      backgroundColor: C.lineControl,
                    }}
                  />
                </div>

                {isWaiting && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: 0,
                      padding: "3px 10px",
                      backgroundColor: C.warnTint,
                      border: `1px solid ${C.warn}`,
                      fontFamily: MONO,
                      fontSize: 12,
                      letterSpacing: "0.09em",
                      color: C.warn,
                    }}
                  >
                    NEEDS APPROVAL
                  </div>
                )}

                <div
                  style={{
                    minHeight: 56,
                    padding: "14px 18px",
                    backgroundColor: C.panel,
                    border: `1.5px solid ${
                      isWaiting ? C.warn : C.line
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    fontFamily: MONO,
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      color: isQueued ? C.text3 : C.text1,
                      flexShrink: 0,
                    }}
                  >
                    [{s.label}]
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      color: C.text2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {s.detail}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: isWaiting
                        ? C.warn
                        : isQueued
                          ? C.text3
                          : C.ok,
                      flexShrink: 0,
                    }}
                  >
                    {isWaiting
                      ? "HOLDING"
                      : isQueued
                        ? "QUEUED"
                        : `${s.time} DONE`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Scene 04: 1-Click Human Approval -> Sandbox Capture + SHA-256 Mandate Receipt */
function SceneApproveSettle({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const clicked = frame >= 68;
  const showDialog = frame >= 185;
  const settledUsd = interpolate(frame, [68, 108], [408, 673], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const zoom = interpolate(frame, [0, duration], [1.0, 1.032]);

  const cursorX = interpolate(frame, [0, 62], [1540, 1390], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const cursorY = interpolate(frame, [0, 62], [860, 706], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const plate = showDialog
    ? "plates/plate-03-mandate-dialog.png"
    : clicked
      ? "plates/plate-02-approved-settled.png"
      : "plates/plate-01-awaiting-approval.png";

  return (
    <AbsoluteFill style={{ backgroundColor: C.page }}>
      <SodiumTopChrome
        stepCode="04"
        stepLabel={
          showDialog
            ? "SHA-256 Cryptographic Mandate"
            : clicked
              ? "PayPal Orders v2 Settled"
              : "Owner Confirmation"
        }
        settledUsd={settledUsd}
      />

      <div
        style={{
          position: "absolute",
          top: 108,
          left: 72,
          right: 72,
          bottom: 112,
          border: `1px solid ${clicked ? C.ok : C.line}`,
          overflow: "hidden",
          backgroundColor: C.panel,
        }}
      >
        <Img
          src={staticFile(plate)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            transform: `scale(${zoom})`,
          }}
        />
      </div>

      {!showDialog && (
        <div
          style={{
            position: "absolute",
            left: cursorX,
            top: cursorY,
            width: 26,
            height: 26,
            border: `2px solid ${C.accent}`,
            backgroundColor:
              frame >= 62 && frame <= 76 ? C.accent : "rgba(255,212,0,0.22)",
            transform: `scale(${frame >= 64 && frame <= 72 ? 0.84 : 1})`,
            zIndex: 35,
          }}
        />
      )}
    </AbsoluteFill>
  );
}

/** Scene 05: All 5 Minimalist PayPal Developer Hackathon Tracks */
function SceneFiveTracks({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const half = Math.floor(duration / 2);
  const secondBeat = frame >= half;
  const localFrame = secondBeat ? frame - half : frame;
  const scale = interpolate(localFrame, [0, half], [1.0, 1.034]);

  const plate = secondBeat
    ? "plates/plate-05-fx-creator-split.png"
    : "plates/plate-04-dinner-qr-split.png";

  return (
    <AbsoluteFill style={{ backgroundColor: C.page }}>
      <SodiumTopChrome
        stepCode="05"
        stepLabel={
          secondBeat
            ? "EUR Pay Later 4x & Creator Split"
            : "4-Diner Receipt QR Split"
        }
        settledUsd={secondBeat ? 1126.6 : 841.0}
      />

      <div
        style={{
          position: "absolute",
          top: 108,
          left: 72,
          right: 72,
          bottom: 112,
          border: `1px solid ${C.line}`,
          overflow: "hidden",
        }}
      >
        <Img
          src={staticFile(plate)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            transform: `scale(${scale})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

/** Scene 06: AG Grid v36 Ledger + Schedule/SDK + Rust Guardrails */
function SceneLedgerAndGuardrails({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const half = Math.floor(duration / 2);
  const showSdk = frame >= half;
  const scale = interpolate(frame % half, [0, half], [1.0, 1.03]);

  const badges = [
    { code: "422", label: "SINGLE_PURCHASE_CAP_EXCEEDED ($850 > $500)" },
    { code: "409", label: "DUPLICATE_APPROVAL_KEY REPLAY BLOCKED" },
    { code: "502", label: "INSTRUMENT_DECLINED ZERO FUNDS CAPTURED" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: C.page }}>
      <SodiumTopChrome
        stepCode="06"
        stepLabel={
          showSdk
            ? "Schedule, APIMatic SDK & PayPal MCP"
            : "AG Grid v36 Live Reconciliation"
        }
        settledUsd={1126.6}
      />

      <div
        style={{
          position: "absolute",
          top: 108,
          left: 72,
          right: 72,
          bottom: 186,
          border: `1px solid ${C.line}`,
          overflow: "hidden",
        }}
      >
        <Img
          src={staticFile(
            showSdk
              ? "plates/plate-07-schedule-sdk.png"
              : "plates/plate-06-aggrid-ledger.png"
          )}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            transform: `scale(${scale})`,
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 106,
          left: 72,
          right: 72,
          height: 62,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
        }}
      >
        {badges.map((b, i) => (
          <div
            key={i}
            style={{
              border: `1px solid ${C.line}`,
              backgroundColor: C.panel,
              padding: "0 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontFamily: MONO,
              fontSize: 13,
            }}
          >
            <span style={{ color: C.accent }}>[{b.code}]</span>
            <span
              style={{
                color: C.text1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/** Scene 07: Minimalist Sodium End Lockup */
function SceneEndMark({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 14], [0.25, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const drift = interpolate(frame, [0, duration], [1.0, 1.024]);

  return (
    <AbsoluteFill style={{ backgroundColor: C.page }}>
      <div
        style={{
          position: "absolute",
          inset: 72,
          border: `1px solid ${C.line}`,
          backgroundColor: C.panel,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 26,
          opacity: enter,
          transform: `scale(${drift})`,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            border: `1.5px solid ${C.lineControl}`,
            backgroundColor: C.page,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              width: 28,
              height: 28,
              backgroundColor: C.accent,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              width: 28,
              height: 28,
              border: `3px solid ${C.text1}`,
            }}
          />
        </div>

        <div
          style={{
            fontFamily: SANS,
            fontSize: 82,
            letterSpacing: "-0.03em",
            color: C.text1,
          }}
        >
          PayTable
        </div>

        <div
          style={{
            fontFamily: SANS,
            fontSize: 32,
            color: C.text2,
            maxWidth: 960,
            textAlign: "center",
          }}
        >
          Linked PayPal wallets for AI agents, with human approval on every purchase.
        </div>

        <div
          style={{
            marginTop: 10,
            padding: "12px 26px",
            backgroundColor: C.primaryBg,
            border: `1px solid ${C.accent}`,
            fontFamily: MONO,
            fontSize: 16,
            letterSpacing: "0.09em",
            color: C.accent,
          }}
        >
          GITHUB.COM/HARRYMOVE-CTRL/PAYTABLE · RUST + SODIUM + PAYPAL SANDBOX
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const PayTableMasterFilm: React.FC = () => {
  useSodiumFonts();
  const scenes = manifest.master_scenes;

  return (
    <AbsoluteFill style={{ backgroundColor: C.page }}>
      <Audio src={staticFile("audio/master-mix.wav")} />

      <Sequence from={0} durationInFrames={270}>
        <SceneHook duration={270} />
        <CaptionBar index="01" caption={scenes[0].caption} />
      </Sequence>

      <Sequence from={270} durationInFrames={300}>
        <SceneTabletopPrompt duration={300} />
        <CaptionBar index="02" caption={scenes[1].caption} />
      </Sequence>

      <Sequence from={570} durationInFrames={420}>
        <SceneMacroSodiumGate duration={420} />
        <CaptionBar index="03" caption={scenes[2].caption} />
      </Sequence>

      <Sequence from={990} durationInFrames={390}>
        <SceneApproveSettle duration={390} />
        <CaptionBar index="04" caption={scenes[3].caption} />
      </Sequence>

      <Sequence from={1380} durationInFrames={420}>
        <SceneFiveTracks duration={420} />
        <CaptionBar index="05" caption={scenes[4].caption} />
      </Sequence>

      <Sequence from={1800} durationInFrames={360}>
        <SceneLedgerAndGuardrails duration={360} />
        <CaptionBar index="06" caption={scenes[5].caption} />
      </Sequence>

      <Sequence from={2160} durationInFrames={240}>
        <SceneEndMark duration={240} />
        <CaptionBar index="07" caption={scenes[6].caption} />
      </Sequence>
    </AbsoluteFill>
  );
};

export const PayTableLaunchFilm: React.FC = () => {
  useSodiumFonts();
  const scenes = manifest.launch_scenes;

  return (
    <AbsoluteFill style={{ backgroundColor: C.page }}>
      <Audio src={staticFile("audio/launch-mix.wav")} />

      <Sequence from={0} durationInFrames={270}>
        <SceneHook duration={270} />
        <CaptionBar index="01" caption={scenes[0].caption} />
      </Sequence>

      <Sequence from={270} durationInFrames={330}>
        <SceneMacroSodiumGate duration={330} />
        <CaptionBar index="02" caption={scenes[1].caption} />
      </Sequence>

      <Sequence from={600} durationInFrames={360}>
        <SceneApproveSettle duration={360} />
        <CaptionBar index="03" caption={scenes[2].caption} />
      </Sequence>

      <Sequence from={960} durationInFrames={240}>
        <SceneEndMark duration={240} />
        <CaptionBar index="04" caption={scenes[3].caption} />
      </Sequence>
    </AbsoluteFill>
  );
};
